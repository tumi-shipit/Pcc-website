-- Install before deploying the matching registration UI.
-- Existing tournaments remain optional-payment. No entries are changed.
begin;
alter table public.tournaments add column if not exists registration_payment_required boolean not null default false;
grant select (registration_payment_required) on public.tournaments to anon,authenticated;

create or replace function public.set_tournament_payment_required(p_tournament_id uuid, p_required boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not coalesce(public.can_operate_tournament_entries(p_tournament_id),false) then
    raise exception 'You cannot manage payments for this tournament.';
  end if;
  update public.tournaments set registration_payment_required=coalesce(p_required,false),
    online_payment_enabled=case when p_required then true else online_payment_enabled end where id=p_tournament_id;
  return found;
end $$;
revoke all on function public.set_tournament_payment_required(uuid,boolean) from public,anon;
grant execute on function public.set_tournament_payment_required(uuid,boolean) to authenticated;

-- Require existing approved entries to be reviewed before enabling the gate.
-- Locking the event serializes this change with entry approval below.
create or replace function public.check_tournament_payment_requirement()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.registration_payment_required and not new.online_payment_enabled then
    raise exception 'Online payment must remain enabled while online payment is required.';
  end if;
  if new.registration_payment_required and (
    exists (select 1 from public.tournament_sections s where s.tournament_id=new.id and coalesce(s.entry_fee_override,new.entry_fee,0)<2)
    or (not exists(select 1 from public.tournament_sections s where s.tournament_id=new.id) and coalesce(new.entry_fee,0)<2)
  ) then raise exception 'Set an entry fee of at least R2 for every section before requiring online payment.'; end if;
  if new.registration_payment_required and exists (
    select 1 from public.registrations r where r.tournament_id=new.id
    and r.registration_status::text='Approved' and (r.payment_status::text is distinct from 'Paid' or not exists (
      select 1 from public.registration_payment_orders o where o.registration_id=r.id and o.tournament_id=new.id and o.status='paid' and o.yoco_mode='live' and nullif(o.yoco_payment_id,'') is not null
    ))
  ) then
    raise exception 'This tournament has approved entries without confirmed live online payments. Review them and return them to Pending before enabling online-only entry.';
  end if;
  return new;
end $$;
drop trigger if exists tournament_payment_requirement_guard on public.tournaments;
create trigger tournament_payment_requirement_guard before insert or update of registration_payment_required,online_payment_enabled,entry_fee on public.tournaments
for each row execute function public.check_tournament_payment_requirement();

-- Pending entries are needed to link checkout and recover interrupted payments.
-- A live online order is required; uploaded proof or a manual Paid label is insufficient.
-- Covers approval RPCs, bulk approval and direct table writes.
create or replace function public.enforce_tournament_registration_payment()
returns trigger language plpgsql security definer set search_path=public as $$
declare required boolean;
begin
  select registration_payment_required into required from public.tournaments where id=new.tournament_id for share;
  if coalesce(required,false) and new.payment_status::text='Proof Submitted' then
    raise exception 'This event accepts online payment only. Use Pay now; proof uploads are not accepted.';
  end if;
  if coalesce(required,false) and (new.registration_status::text='Approved' or new.payment_status::text='Paid')
    and (new.payment_status::text is distinct from 'Paid' or not exists (
      select 1 from public.registration_payment_orders o where o.registration_id=new.id and o.tournament_id=new.tournament_id and o.status='paid'
      and o.yoco_mode='live' and nullif(o.yoco_payment_id,'') is not null
    )) then
    raise exception 'A confirmed live online payment is required before this entry can be marked Paid or approved.';
  end if;
  return new;
end $$;
drop trigger if exists registration_required_payment_guard on public.registrations;
create trigger registration_required_payment_guard before insert or update of tournament_id,registration_status,payment_status on public.registrations
for each row execute function public.enforce_tournament_registration_payment();
notify pgrst, 'reload schema';
commit;
select 'Tournament payment requirement installed' as status;
