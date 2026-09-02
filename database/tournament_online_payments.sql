alter table public.tournaments add column if not exists online_payment_enabled boolean not null default false;
grant select (online_payment_enabled) on public.tournaments to anon, authenticated;

create table if not exists public.registration_payment_orders (
  id uuid primary key default gen_random_uuid(),
  registration_id uuid not null unique references public.registrations(id) on delete cascade,
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'ZAR',
  status text not null default 'created' check (status in ('created','payment_pending','paid','failed')),
  yoco_checkout_id text unique,
  yoco_payment_id text,
  yoco_mode text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.registration_payment_orders enable row level security;
grant select on public.registration_payment_orders to authenticated;
drop policy if exists "Admins read registration payment orders" on public.registration_payment_orders;
create policy "Admins read registration payment orders" on public.registration_payment_orders for select to authenticated
using (public.current_admin_role() is not null);

create or replace function public.set_tournament_online_payment(p_tournament_id uuid, p_enabled boolean)
returns boolean language plpgsql security definer set search_path=public as $$
begin
  if not (public.current_admin_role() in ('super_admin','admin') or exists (
    select 1 from public.tournament_organiser_access a
    where a.tournament_id=p_tournament_id and lower(a.organiser_email)=lower(coalesce(auth.jwt()->>'email','')) and a.access_status='Active'
  )) then raise exception 'You cannot manage payments for this tournament.'; end if;
  update public.tournaments set online_payment_enabled=coalesce(p_enabled,false) where id=p_tournament_id;
  return found;
end $$;
grant execute on function public.set_tournament_online_payment(uuid,boolean) to authenticated;

create or replace function public.complete_registration_payment_order(p_order_id uuid,p_payment_id text,p_mode text,p_amount_cents integer,p_currency text)
returns boolean language plpgsql security definer set search_path=public as $$
declare o public.registration_payment_orders%rowtype;
begin
  select * into o from public.registration_payment_orders where id=p_order_id for update;
  if not found or o.status='paid' then return o.status='paid'; end if;
  if p_amount_cents <> round(o.amount*100)::integer or upper(p_currency)<>o.currency then return false; end if;
  update public.registration_payment_orders set status='paid',yoco_payment_id=p_payment_id,yoco_mode=p_mode,paid_at=now(),updated_at=now() where id=p_order_id;
  update public.registrations set payment_status='Paid',updated_at=now() where id=o.registration_id;
  return true;
end $$;
revoke all on function public.complete_registration_payment_order(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.complete_registration_payment_order(uuid,text,text,integer,text) to service_role;
