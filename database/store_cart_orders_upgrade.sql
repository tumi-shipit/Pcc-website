create table if not exists public.store_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.store_orders(id) on delete cascade,
  product_id uuid not null references public.store_products(id),
  product_name text not null,
  unit_price numeric(10,2) not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 20),
  selected_option text,
  line_total numeric(10,2) not null check (line_total >= 0),
  created_at timestamptz not null default now()
);

create index if not exists store_order_items_order_idx on public.store_order_items(order_id);
alter table public.store_order_items enable row level security;
drop policy if exists "Admins read store order items" on public.store_order_items;
create policy "Admins read store order items" on public.store_order_items for select to authenticated using (public.has_admin_access());
drop policy if exists "Admins manage store order items" on public.store_order_items;
create policy "Admins manage store order items" on public.store_order_items for all to authenticated using (public.has_admin_access()) with check (public.has_admin_access());

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
  target_item public.store_order_items;
  item_count integer;
begin
  select * into target_order from public.store_orders where id = p_order_id for update;
  if not found then return false; end if;
  if target_order.status = 'paid' then return true; end if;
  if p_currency <> target_order.currency then return false; end if;
  if p_amount_cents <> round(target_order.total_amount * 100)::integer then return false; end if;

  update public.store_orders set status='paid', yoco_payment_id=p_payment_id, yoco_mode=p_mode, paid_at=now() where id=p_order_id;
  select count(*) into item_count from public.store_order_items where order_id=p_order_id;
  if item_count > 0 then
    for target_item in select * from public.store_order_items where order_id=p_order_id loop
      update public.store_products
      set stock_quantity=greatest(stock_quantity-target_item.quantity,0),
          stock_status=case when stock_quantity-target_item.quantity<=0 then 'out-of-stock' else stock_status end
      where id=target_item.product_id and stock_quantity is not null;
    end loop;
  else
    update public.store_products
    set stock_quantity=greatest(stock_quantity-target_order.quantity,0),
        stock_status=case when stock_quantity-target_order.quantity<=0 then 'out-of-stock' else stock_status end
    where id=target_order.product_id and stock_quantity is not null;
  end if;
  return true;
end;
$$;

revoke all on function public.complete_store_order(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.complete_store_order(uuid,text,text,integer,text) to service_role;
notify pgrst, 'reload schema';
select 'Store cart orders installed' as status;
