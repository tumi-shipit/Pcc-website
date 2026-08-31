create table if not exists public.store_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  product_id uuid not null references public.store_products(id),
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 2),
  quantity integer not null check (quantity between 1 and 20),
  total_amount numeric(10,2) not null check (total_amount >= 2),
  currency text not null default 'ZAR' check (currency = 'ZAR'),
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  status text not null default 'pending'
    check (status in ('pending', 'payment_pending', 'paid', 'failed', 'cancelled')),
  yoco_checkout_id text unique,
  yoco_payment_id text,
  yoco_mode text check (yoco_mode is null or yoco_mode in ('test', 'live')),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_orders_created_idx
  on public.store_orders(created_at desc);
create index if not exists store_orders_status_idx
  on public.store_orders(status, created_at desc);

create or replace function public.set_store_order_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_store_order_updated_at on public.store_orders;
create trigger set_store_order_updated_at
before update on public.store_orders
for each row execute function public.set_store_order_updated_at();

alter table public.store_orders enable row level security;

drop policy if exists "Admins read store orders" on public.store_orders;
create policy "Admins read store orders"
on public.store_orders for select to authenticated
using (public.has_admin_access());

drop policy if exists "Admins manage store orders" on public.store_orders;
create policy "Admins manage store orders"
on public.store_orders for all to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

create or replace function public.complete_store_order(
  p_order_id uuid,
  p_payment_id text,
  p_mode text,
  p_amount_cents integer,
  p_currency text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_order public.store_orders;
begin
  select * into target_order
  from public.store_orders
  where id = p_order_id
  for update;

  if not found then return false; end if;
  if target_order.status = 'paid' then return true; end if;
  if p_currency <> target_order.currency then return false; end if;
  if p_amount_cents <> round(target_order.total_amount * 100)::integer then return false; end if;

  update public.store_orders
  set status = 'paid',
      yoco_payment_id = p_payment_id,
      yoco_mode = p_mode,
      paid_at = now()
  where id = p_order_id;

  update public.store_products
  set stock_quantity = greatest(stock_quantity - target_order.quantity, 0),
      stock_status = case
        when stock_quantity - target_order.quantity <= 0 then 'out-of-stock'
        else stock_status
      end
  where id = target_order.product_id
    and stock_quantity is not null;

  return true;
end;
$$;

revoke all on function public.complete_store_order(uuid, text, text, integer, text) from public, anon, authenticated;
grant execute on function public.complete_store_order(uuid, text, text, integer, text) to service_role;

notify pgrst, 'reload schema';

select 'Store orders installed' as status;
