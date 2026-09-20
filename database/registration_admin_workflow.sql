-- Install before deploying the matching UI. No existing requests are executed.
begin;

create or replace function public.can_operate_tournament_entries(p_tournament_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select auth.uid() is not null and (
    coalesce(public.current_admin_role() in ('super_admin','admin'), false)
    or exists (select 1 from public.tournament_organiser_access a
      where a.tournament_id=p_tournament_id and a.access_status='Active'
      and lower(a.organiser_email)=lower(coalesce(auth.jwt()->>'email','')))
  );
$$;

create or replace function public.admin_batch_update_registration_status(
  p_registration_ids uuid[], p_payment_status text default null,
  p_registration_status text default null
) returns void language plpgsql security definer set search_path=public as $$
declare r public.registrations%rowtype; expected integer; seen integer := 0;
begin
  if auth.uid() is null or not coalesce(public.current_admin_role() in ('super_admin','admin'),false) then
    raise exception 'Only PCC admins can update entries directly.';
  end if;
  select count(distinct id) into expected from unnest(p_registration_ids) id;
  if expected=0 or expected>500 then raise exception 'Select between 1 and 500 entries.'; end if;
  if p_payment_status is not null and p_payment_status not in ('Pending','Proof Submitted','Paid','Rejected') then
    raise exception 'Invalid payment status.';
  end if;
  if p_registration_status is not null and p_registration_status not in ('Pending','Approved','Rejected','Withdrawn') then
    raise exception 'Invalid entry status.';
  end if;
  for r in select * from public.registrations where id=any(p_registration_ids) order by id for update loop
    if not public.can_operate_tournament_entries(r.tournament_id) then raise exception 'Access denied for this tournament.'; end if;
    if p_payment_status is not null and p_payment_status <> 'Paid' and exists (
      select 1 from public.registration_payment_orders o where o.registration_id=r.id and o.status='paid'
    ) then raise exception 'An online payment cannot be undone by changing its status.'; end if;
    seen := seen+1;
  end loop;
  if seen <> expected then raise exception 'One or more entries no longer exist. Refresh first.'; end if;
  update public.registrations set
    payment_status=coalesce(p_payment_status::public.payment_status,payment_status),
    registration_status=coalesce(p_registration_status::public.registration_status,registration_status),
    updated_at=now() where id=any(p_registration_ids);
end $$;

create or replace function public.admin_update_registration_status(
  p_registration_id uuid,p_payment_status text default null,p_registration_status text default null
) returns void language plpgsql security definer set search_path=public as $$
begin
  perform public.admin_batch_update_registration_status(array[p_registration_id],p_payment_status,p_registration_status);
end $$;

-- A database guard also protects direct table deletes and older RPC callers.
create or replace function public.guard_registration_deletion()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not coalesce(public.is_super_admin(),false) then
    raise exception 'Only a super admin can delete entries. Submit a deletion request instead.';
  end if;
  if exists (select 1 from public.registration_payment_orders where registration_id=old.id and status='paid') then
    raise exception 'This entry has an online payment. Withdraw it instead to preserve the payment record.';
  end if;
  return old;
end $$;
drop trigger if exists registration_deletion_guard on public.registrations;
create trigger registration_deletion_guard before delete on public.registrations
for each row execute function public.guard_registration_deletion();

create or replace function public.request_registration_deletion(p_registration_id uuid)
returns text language plpgsql security definer set search_path=public as $$
declare r public.registrations%rowtype; label text; event_label text;
begin
  select * into r from public.registrations where id=p_registration_id for update;
  if not found then raise exception 'Entry no longer exists.'; end if;
  if not public.can_operate_tournament_entries(r.tournament_id) then raise exception 'Access denied.'; end if;
  if public.is_super_admin() then
    delete from public.registrations where id=r.id;
    return 'Deleted';
  end if;
  if exists (select 1 from public.admin_action_requests where action_type='delete_registration'
    and target_id=r.id::text and request_status='Pending') then return 'Requested'; end if;
  select full_name into label from public.players where id=r.player_id;
  select tournament_name into event_label from public.tournaments where id=r.tournament_id;
  insert into public.admin_action_requests(requested_by,action_type,action_label,target_table,target_id,target_label,request_payload)
  values(auth.uid(),'delete_registration','Delete tournament entry','registrations',r.id::text,label,
    jsonb_build_object('tournament_id',r.tournament_id,'tournament_name',event_label,
      'requester_email',auth.jwt()->>'email','registration',to_jsonb(r)));
  return 'Requested';
end $$;

-- Lock each request. Deletion and review status commit together or neither does.
create or replace function public.admin_review_action_request(p_request_id uuid,p_decision text,p_review_note text default null)
returns void language plpgsql security definer set search_path=public as $$
declare q public.admin_action_requests%rowtype; r public.registrations%rowtype;
begin
  if not coalesce(public.is_super_admin(),false) then raise exception 'Only super admins can review requests.'; end if;
  if p_decision is null or p_decision not in ('Approved','Rejected') then raise exception 'Invalid decision.'; end if;
  select * into q from public.admin_action_requests where id=p_request_id for update;
  if not found or q.request_status <> 'Pending' then raise exception 'Request is no longer pending.'; end if;
  if p_decision='Approved' then
    if q.action_type <> 'delete_registration' or q.target_table <> 'registrations' then
      raise exception 'This legacy request cannot be executed automatically. Review it separately.';
    end if;
    select * into r from public.registrations where id=q.target_id::uuid for update;
    if not found then raise exception 'Entry no longer exists. Reject this obsolete request.'; end if;
    if q.request_payload->'registration' is distinct from to_jsonb(r) then
      raise exception 'Entry changed after deletion was requested. Reject this request and request again.';
    end if;
    delete from public.registrations where id=r.id;
  end if;
  update public.admin_action_requests set request_status=p_decision,reviewed_by=auth.uid(),
    reviewed_at=now(),review_note=p_review_note,updated_at=now() where id=q.id;
end $$;

create or replace function public.admin_review_action_requests(p_request_ids uuid[],p_decision text)
returns integer language plpgsql security definer set search_path=public as $$
declare rid uuid; total integer := 0;
begin
  if not coalesce(public.is_super_admin(),false) then raise exception 'Only super admins can review requests.'; end if;
  if coalesce(cardinality(p_request_ids),0)=0 or cardinality(p_request_ids)>100 then
    raise exception 'Select between 1 and 100 requests.';
  end if;
  for rid in select distinct unnest(p_request_ids) order by 1 loop
    perform public.admin_review_action_request(rid,p_decision,null);
    total:=total+1;
  end loop;
  return total;
end $$;

revoke all on function public.can_operate_tournament_entries(uuid) from public,anon;
revoke all on function public.admin_batch_update_registration_status(uuid[],text,text) from public,anon;
revoke all on function public.admin_update_registration_status(uuid,text,text) from public,anon;
revoke all on function public.request_registration_deletion(uuid) from public,anon;
revoke all on function public.admin_review_action_request(uuid,text,text) from public,anon;
revoke all on function public.admin_review_action_requests(uuid[],text) from public,anon;
grant execute on function public.can_operate_tournament_entries(uuid), public.admin_batch_update_registration_status(uuid[],text,text),
  public.admin_update_registration_status(uuid,text,text),public.request_registration_deletion(uuid),
  public.admin_review_action_request(uuid,text,text), public.admin_review_action_requests(uuid[],text) to authenticated;
notify pgrst,'reload schema';
commit;
select 'Registration admin workflow installed' as status;
