-- Apply after registration_admin_workflow.sql, tournament_payment_required.sql,
-- registration_payment_recovery.sql and tournament_registration_schedule.sql.
begin;
alter table public.tournaments add column if not exists registration_mode text not null default 'standard'
  check (registration_mode in ('standard','lichess','chesscom'));
grant select(registration_mode) on public.tournaments to anon,authenticated;

create table public.online_registrations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id),
  section_id uuid not null references public.tournament_sections(id),
  platform text not null check (platform in ('lichess','chesscom')),
  first_name text not null check (length(trim(first_name)) between 1 and 100),
  surname text not null check (length(trim(surname)) between 1 and 100),
  username text not null check (username ~ '^[A-Za-z0-9_-]{2,30}$'),
  email text not null check (length(email)<=254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  payment_status text not null default 'Pending' check (payment_status in ('Pending','Paid')),
  registration_status text not null default 'Pending' check (registration_status in ('Pending','Approved','Rejected','Withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index online_registration_event_username on public.online_registrations(tournament_id,lower(username));
alter table public.online_registrations enable row level security;
revoke all on public.online_registrations from public,anon,authenticated;
grant select on public.online_registrations to authenticated;
grant all on public.online_registrations to service_role;
create policy online_entries_read on public.online_registrations for select to authenticated
  using (public.can_operate_tournament_entries(tournament_id));
create table public.online_registration_recovery (
  registration_id uuid primary key references public.online_registrations(id),
  token text not null unique
);
alter table public.online_registration_recovery enable row level security;
revoke all on public.online_registration_recovery from public,anon,authenticated;
grant all on public.online_registration_recovery to service_role;

alter table public.registration_payment_orders alter column registration_id drop not null;
alter table public.registration_payment_orders add column online_registration_id uuid unique references public.online_registrations(id);
alter table public.registration_payment_orders add constraint registration_order_one_entry
  check (num_nonnulls(registration_id,online_registration_id)=1);

create function public.guard_tournament_registration_mode() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if (tg_op='INSERT' and new.registration_mode='standard') then return new; end if;
  if tg_op='UPDATE' and new.registration_mode is not distinct from old.registration_mode then return new; end if;
  if current_user not in ('postgres','service_role') and not coalesce(public.can_operate_tournament_entries(new.id),false) then raise exception 'Only admins or assigned organisers can select registration mode.'; end if;
  if exists(select 1 from public.registrations where tournament_id=new.id)
    or exists(select 1 from public.online_registrations where tournament_id=new.id) then
    raise exception 'Registration mode cannot change after entries exist.';
  end if;
  return new;
end $$;
create trigger tournament_registration_mode_guard before insert or update of registration_mode on public.tournaments
  for each row execute function public.guard_tournament_registration_mode();
create function public.get_tournament_registration_settings(p_tournament_id uuid) returns jsonb
language plpgsql security definer set search_path=public as $$
declare result jsonb;
begin
  if current_user not in ('postgres','service_role') and not coalesce(public.can_operate_tournament_entries(p_tournament_id),false) then raise exception 'Access denied.'; end if;
  select jsonb_build_object('mode',t.registration_mode,'locked',
    exists(select 1 from public.registrations where tournament_id=t.id) or
    exists(select 1 from public.online_registrations where tournament_id=t.id)) into result
  from public.tournaments t where t.id=p_tournament_id;
  return result;
end $$;
revoke all on function public.get_tournament_registration_settings(uuid) from public,anon;
grant execute on function public.get_tournament_registration_settings(uuid) to authenticated;

create function public.set_tournament_registration_mode(p_tournament_id uuid,p_mode text) returns boolean
language plpgsql security definer set search_path=public as $$
begin
  if current_user not in ('postgres','service_role') and not coalesce(public.can_operate_tournament_entries(p_tournament_id),false) then raise exception 'Access denied.'; end if;
  if p_mode is null or p_mode not in ('standard','lichess','chesscom') then raise exception 'Invalid registration mode.'; end if;
  update public.tournaments set registration_mode=p_mode where id=p_tournament_id;
  return found;
end $$;
revoke all on function public.set_tournament_registration_mode(uuid,text) from public,anon;
grant execute on function public.set_tournament_registration_mode(uuid,text) to authenticated;

-- The event lock serializes entry creation with mode changes, including older RPCs.
create function public.guard_registration_entry_mode() returns trigger
language plpgsql security definer set search_path=public as $$
declare mode text;
begin
  select registration_mode into mode from public.tournaments where id=new.tournament_id for update;
  if tg_table_name='registrations' then
    if mode is distinct from 'standard' then raise exception 'Use the online tournament registration form for this event.'; end if;
  else
    if mode is distinct from new.platform then raise exception 'Registration mode has changed. Refresh the registration form.'; end if;
  end if;
  return new;
end $$;
create trigger registration_entry_mode_guard before insert or update of tournament_id on public.registrations
  for each row execute function public.guard_registration_entry_mode();
create trigger online_registration_entry_mode_guard before insert or update of tournament_id,platform on public.online_registrations
  for each row execute function public.guard_registration_entry_mode();

create function public.submit_online_registration(p_tournament_id uuid,p_section_id uuid,p_platform text,
  p_first_name text,p_surname text,p_username text,p_email text) returns jsonb
language plpgsql security definer set search_path=public as $$
declare t public.tournaments%rowtype; s public.tournament_sections%rowtype; entry_id uuid;
  recovery_token text := replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
begin
  select * into t from public.tournaments where id=p_tournament_id for update;
  if not found or t.registration_mode='standard' or t.registration_mode is distinct from p_platform then
    raise exception 'Refresh the page and select an online tournament.';
  end if;
  if public.effective_registration_status(t.registration_status::text,t.registration_schedule_enabled,
    t.registration_open_date,t.registration_close_date) is distinct from 'Open' then raise exception 'Registration is closed.'; end if;
  select * into s from public.tournament_sections where id=p_section_id and tournament_id=t.id;
  if not found then raise exception 'Select a section belonging to this tournament.'; end if;
  if s.maximum_players is not null and (select count(*) from public.online_registrations
    where section_id=s.id and registration_status not in ('Rejected','Withdrawn')) >= s.maximum_players then
    raise exception 'This section is full.';
  end if;
  insert into public.online_registrations(tournament_id,section_id,platform,first_name,surname,username,email)
    values(t.id,s.id,t.registration_mode,trim(p_first_name),trim(p_surname),trim(p_username),lower(trim(p_email))) returning id into entry_id;
  insert into public.online_registration_recovery values(entry_id,recovery_token);
  return jsonb_build_object('registrationId',entry_id,'recoveryToken',recovery_token);
exception when unique_violation then raise exception 'This username is already registered for this tournament. Use your saved recovery link or contact the organiser.';
end $$;
revoke all on function public.submit_online_registration(uuid,uuid,text,text,text,text,text) from public;
grant execute on function public.submit_online_registration(uuid,uuid,text,text,text,text,text) to anon,authenticated;

create function public.update_online_registration_status(p_registration_id uuid,p_status text) returns void
language plpgsql security definer set search_path=public as $$
declare r public.online_registrations%rowtype; required boolean;
begin
  select * into r from public.online_registrations where id=p_registration_id;
  if not found or not coalesce(public.can_operate_tournament_entries(r.tournament_id),false) then raise exception 'Access denied.'; end if;
  select registration_payment_required into required from public.tournaments where id=r.tournament_id for update;
  select * into r from public.online_registrations where id=p_registration_id for update;
  if p_status is null or p_status not in ('Pending','Approved','Rejected','Withdrawn') then raise exception 'Invalid status.'; end if;
  if p_status='Approved' and required and not exists(select 1 from public.registration_payment_orders
    where online_registration_id=r.id and tournament_id=r.tournament_id and status='paid' and yoco_mode='live' and nullif(yoco_payment_id,'') is not null) then
    raise exception 'A confirmed live online payment is required before approval.';
  end if;
  update public.online_registrations set registration_status=p_status,updated_at=now() where id=r.id;
end $$;
revoke all on function public.update_online_registration_status(uuid,text) from public,anon;
grant execute on function public.update_online_registration_status(uuid,text) to authenticated;

create function public.guard_online_payment_requirement() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  if new.registration_payment_required and exists(select 1 from public.online_registrations r
    where r.tournament_id=new.id and r.registration_status='Approved' and not exists(
      select 1 from public.registration_payment_orders o where o.online_registration_id=r.id and o.tournament_id=new.id
      and o.status='paid' and o.yoco_mode='live' and nullif(o.yoco_payment_id,'') is not null)) then
    raise exception 'Review approved online entries without confirmed payment before requiring online payment.';
  end if;
  return new;
end $$;
create trigger online_payment_requirement_guard before update of registration_payment_required on public.tournaments
  for each row execute function public.guard_online_payment_requirement();

create or replace function public.complete_registration_payment_order(p_order_id uuid,p_payment_id text,p_mode text,p_amount_cents integer,p_currency text)
returns boolean language plpgsql security definer set search_path=public as $$
declare o public.registration_payment_orders%rowtype;
begin
  select * into o from public.registration_payment_orders where id=p_order_id for update;
  if not found then return false; end if;
  if p_amount_cents is distinct from round(o.amount*100)::integer or upper(p_currency) is distinct from o.currency
    or (o.online_registration_id is not null and p_mode is distinct from 'live')
    or nullif(trim(p_payment_id),'') is null then return false; end if;
  if o.status='paid' then return o.yoco_payment_id=p_payment_id; end if;
  update public.registration_payment_orders set status='paid',yoco_payment_id=p_payment_id,yoco_mode=p_mode,paid_at=now(),updated_at=now() where id=p_order_id;
  if o.online_registration_id is not null then
    update public.online_registrations set payment_status='Paid',updated_at=now() where id=o.online_registration_id and tournament_id=o.tournament_id;
  else
    update public.registrations set payment_status='Paid',updated_at=now() where id=o.registration_id and tournament_id=o.tournament_id;
  end if;
  if not found then raise exception 'Payment entry mismatch.'; end if;
  return true;
end $$;
revoke all on function public.complete_registration_payment_order(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.complete_registration_payment_order(uuid,text,text,integer,text) to service_role;
notify pgrst,'reload schema';
commit;

