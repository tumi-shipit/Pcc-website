-- PCC website hardening release: abuse protection, product variants,
-- fulfilment workflow and lifetime-membership safeguards. Safe to rerun.

create table if not exists public.request_rate_limits (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.request_rate_limits enable row level security;
revoke all on public.request_rate_limits from public, anon, authenticated;

create or replace function public.consume_request_quota(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_row public.request_rate_limits%rowtype;
begin
  if length(coalesce(p_bucket_key, '')) < 8
     or p_limit < 1
     or p_limit > 1000
     or p_window_seconds < 10
     or p_window_seconds > 86400 then
    return false;
  end if;

  insert into public.request_rate_limits(bucket_key, request_count)
  values (p_bucket_key, 1)
  on conflict (bucket_key) do update
  set request_count = case
        when public.request_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then 1
        else public.request_rate_limits.request_count + 1
      end,
      window_started_at = case
        when public.request_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds)
          then now()
        else public.request_rate_limits.window_started_at
      end,
      updated_at = now()
  returning * into current_row;

  return current_row.request_count <= p_limit;
end;
$$;

revoke all on function public.consume_request_quota(text, integer, integer)
from public, anon, authenticated;
grant execute on function public.consume_request_quota(text, integer, integer)
to service_role;

alter table public.store_products
add column if not exists available_options text[] not null default '{}';

alter table public.store_products
add column if not exists variant_stock jsonb not null default '{}'::jsonb;

update public.store_products
set available_options = array['XS','S','M','L','XL']
where lower(category) in ('polo','hoodie','jacket','apparel','clothing')
  and cardinality(available_options) = 0;

alter table public.store_orders
add column if not exists fulfillment_method text not null default 'collection'
  check (fulfillment_method in ('collection','polokwane_delivery','paxi_store','paxi_home'));

alter table public.store_orders drop constraint if exists store_orders_fulfillment_method_check;
update public.store_orders set fulfillment_method='polokwane_delivery' where fulfillment_method='delivery';
alter table public.store_orders add constraint store_orders_fulfillment_method_check
  check (fulfillment_method in ('collection','polokwane_delivery','paxi_store','paxi_home'));

alter table public.store_orders
add column if not exists delivery_address text;

alter table public.store_orders
add column if not exists fulfillment_status text not null default 'awaiting_payment'
  check (fulfillment_status in ('awaiting_payment','paid','preparing','ready_for_collection','dispatched','completed','cancelled','refunded'));

alter table public.store_orders
add column if not exists fulfillment_notes text;

alter table public.store_orders
add column if not exists delivery_fee numeric(10,2) not null default 0 check (delivery_fee >= 0);

create or replace function public.complete_store_order(
  p_order_id uuid,p_payment_id text,p_mode text,p_amount_cents integer,p_currency text
)
returns boolean language plpgsql security definer set search_path=public as $$
declare o public.store_orders%rowtype; i public.store_order_items%rowtype;
begin
  select * into o from public.store_orders where id=p_order_id for update;
  if not found then return false; end if;
  if o.status='paid' then return true; end if;
  if upper(p_currency)<>upper(o.currency) or round(o.total_amount*100)::integer<>p_amount_cents then return false; end if;
  update public.store_orders set status='paid',fulfillment_status='paid',yoco_payment_id=p_payment_id,yoco_mode=p_mode,paid_at=now() where id=p_order_id;
  for i in select * from public.store_order_items where order_id=p_order_id loop
    update public.store_products
    set stock_quantity=case when stock_quantity is null then null else greatest(stock_quantity-i.quantity,0) end,
        variant_stock=case when i.selected_option is not null and variant_stock ? i.selected_option
          then jsonb_set(variant_stock,array[i.selected_option],to_jsonb(greatest(coalesce((variant_stock->>i.selected_option)::integer,0)-i.quantity,0))) else variant_stock end,
        stock_status=case when stock_quantity is not null and stock_quantity-i.quantity<=0 then 'out-of-stock' else stock_status end
    where id=i.product_id;
  end loop;
  return true;
end;
$$;
revoke all on function public.complete_store_order(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.complete_store_order(uuid,text,text,integer,text) to service_role;

create or replace function public.complete_membership_order(
  p_order_id uuid,p_payment_id text,p_mode text,p_amount_cents integer,p_currency text
)
returns boolean language plpgsql security definer set search_path=public as $$
declare
  o public.membership_orders%rowtype;
  m public.member_memberships%rowtype;
  start_on date;
  end_on date;
begin
  select * into o from public.membership_orders where id=p_order_id for update;
  if not found then return false; end if;
  if o.status='paid' then return true; end if;
  if upper(p_currency)<>'ZAR' or round(o.amount*100)::integer<>p_amount_cents then return false; end if;

  select * into m
  from public.member_memberships
  where lower(member_email)=lower(o.member_email)
  order by (membership_status='Active') desc, end_date desc nulls first, updated_at desc
  limit 1 for update;

  if m.id is not null and lower(m.membership_type)='lifetime' and m.membership_status='Active' then
    update public.membership_orders
    set status='paid',yoco_payment_id=p_payment_id,yoco_mode=p_mode,membership_id=m.id,
        starts_on=m.start_date,expires_on=null,paid_at=now(),updated_at=now()
    where id=o.id;
    return true;
  end if;

  start_on:=case when m.id is not null and m.end_date>=current_date then m.end_date+1 else current_date end;
  end_on:=(start_on+(o.duration_months||' months')::interval-'1 day'::interval)::date;
  if m.id is null then
    insert into public.member_memberships(member_email,chess_sa_id,membership_type,membership_status,start_date,end_date,amount_paid,payment_reference,payment_date,payment_method,notes)
    values(lower(o.member_email),nullif(o.chess_sa_id,''),o.plan_name,'Active',start_on,end_on,o.amount,o.order_number,current_date,'Yoco','Purchased through PCC membership checkout')
    returning * into m;
  else
    update public.member_memberships
    set chess_sa_id=coalesce(nullif(o.chess_sa_id,''),chess_sa_id),membership_type=o.plan_name,
        membership_status='Active',start_date=start_on,end_date=end_on,amount_paid=o.amount,
        payment_reference=o.order_number,payment_date=current_date,payment_method='Yoco',updated_at=now()
    where id=m.id returning * into m;
  end if;
  update public.membership_orders
  set status='paid',yoco_payment_id=p_payment_id,yoco_mode=p_mode,membership_id=m.id,
      starts_on=start_on,expires_on=end_on,paid_at=now(),updated_at=now()
  where id=o.id;
  return true;
end;
$$;

revoke all on function public.complete_membership_order(uuid,text,text,integer,text)
from public,anon,authenticated;
grant execute on function public.complete_membership_order(uuid,text,text,integer,text)
to service_role;

notify pgrst, 'reload schema';
select 'PCC website hardening release installed' as status;
