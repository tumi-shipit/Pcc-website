-- Run after database/membership_commerce_setup.sql.
-- Preserves the original start date when an active membership is renewed,
-- while extending its expiry date and linking the new paid order.
create or replace function public.complete_membership_order(
  p_order_id uuid,
  p_payment_id text,
  p_mode text,
  p_amount_cents integer,
  p_currency text
)
returns boolean
language plpgsql
security definer
set search_path=public
as $$
declare
  o public.membership_orders%rowtype;
  m public.member_memberships%rowtype;
  order_start date;
  new_end date;
begin
  select * into o from public.membership_orders where id=p_order_id for update;
  if not found then return false; end if;
  if o.status='paid' then return true; end if;
  if upper(p_currency)<>'ZAR' or round(o.amount*100)::integer<>p_amount_cents then return false; end if;

  select * into m
  from public.member_memberships
  where lower(member_email)=lower(o.member_email)
  order by end_date desc nulls last
  limit 1
  for update;

  order_start := case when m.id is not null and m.end_date >= current_date then m.end_date + 1 else current_date end;
  new_end := (order_start + (o.duration_months || ' months')::interval - '1 day'::interval)::date;

  if m.id is null then
    insert into public.member_memberships(
      member_email,chess_sa_id,membership_type,membership_status,start_date,end_date,
      amount_paid,payment_reference,payment_date,notes
    ) values (
      lower(o.member_email),nullif(o.chess_sa_id,''),o.plan_name,'Active',order_start,new_end,
      o.amount,o.order_number,current_date,'Purchased through PCC membership checkout'
    ) returning * into m;
  else
    update public.member_memberships set
      membership_type=o.plan_name,
      membership_status='Active',
      start_date=coalesce(m.start_date,current_date),
      end_date=new_end,
      amount_paid=o.amount,
      payment_reference=o.order_number,
      payment_date=current_date,
      updated_at=now()
    where id=m.id returning * into m;
  end if;

  update public.membership_orders set
    status='paid',yoco_payment_id=p_payment_id,yoco_mode=p_mode,membership_id=m.id,
    starts_on=order_start,expires_on=new_end,paid_at=now(),updated_at=now()
  where id=o.id;
  return true;
end;
$$;

revoke all on function public.complete_membership_order(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.complete_membership_order(uuid,text,text,integer,text) to service_role;
notify pgrst,'reload schema';
select 'Membership cards and renewal rules installed' as status;
