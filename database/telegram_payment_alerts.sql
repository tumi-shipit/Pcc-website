-- Additive setup only: no payment records or payment rules are changed.
begin;
create table if not exists public.telegram_alert_settings (
  id boolean primary key default true check(id),
  chat_id text,
  linked_by uuid,
  challenge text,
  challenge_owner uuid,
  challenge_expires_at timestamptz,
  updated_at timestamptz not null default now()
);
create table if not exists public.telegram_payment_alerts (
  id uuid primary key default gen_random_uuid(),
  order_kind text not null check(order_kind in ('store','membership','registration')),
  order_id uuid not null,
  message text not null,
  status text not null default 'pending' check(status in ('pending','sending','sent')),
  lease_until timestamptz,
  attempts integer not null default 0,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(order_kind,order_id)
);
alter table public.telegram_alert_settings enable row level security;
alter table public.telegram_payment_alerts enable row level security;
revoke all on public.telegram_alert_settings, public.telegram_payment_alerts from public,anon,authenticated;
grant all on public.telegram_alert_settings, public.telegram_payment_alerts to service_role;

create or replace function public.claim_telegram_payment_alert(p_id uuid)
returns setof public.telegram_payment_alerts
language sql security definer set search_path=public as $$
  update public.telegram_payment_alerts
  set status='sending', lease_until=now()+interval '60 seconds', attempts=attempts+1
  where id=p_id and (status='pending' or (status='sending' and lease_until<now()))
  returning *;
$$;
revoke all on function public.claim_telegram_payment_alert(uuid) from public,anon,authenticated;
grant execute on function public.claim_telegram_payment_alert(uuid) to service_role;
notify pgrst, 'reload schema';
commit;
select 'Telegram payment alerts installed' as status;
