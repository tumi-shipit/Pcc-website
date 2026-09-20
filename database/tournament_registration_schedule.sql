-- Install before deploying. Existing manually closed events are NOT reopened.
begin;
alter table public.tournaments add column if not exists registration_schedule_enabled boolean not null default false;
grant select(registration_schedule_enabled,registration_open_date,registration_close_date) on public.tournaments to anon,authenticated;

create or replace function public.effective_registration_status(p_status text,p_enabled boolean,p_open date,p_close date)
returns text language sql stable set search_path=public as $$
  select case when not coalesce(p_enabled,false) or p_status not in ('Open','Closed') then p_status
    when p_open is null or p_close is null or p_open>p_close then 'Closed'
    when (now() at time zone 'Africa/Johannesburg')::date between p_open and p_close then 'Open'
    else 'Closed' end;
$$;

create or replace function public.apply_tournament_registration_schedule()
returns trigger language plpgsql set search_path=public as $$
begin
  if new.registration_schedule_enabled then
    if new.registration_open_date is null or new.registration_close_date is null
      or new.registration_open_date>new.registration_close_date then
      raise exception 'Automatic registration needs an opening date on or before its closing date.';
    end if;
    new.registration_status := public.effective_registration_status(new.registration_status::text,true,
      new.registration_open_date,new.registration_close_date)::public.tournament_registration_status;
  end if;
  return new;
end $$;
drop trigger if exists tournament_registration_schedule on public.tournaments;
create trigger tournament_registration_schedule before insert or update on public.tournaments
for each row execute function public.apply_tournament_registration_schedule();

-- Enforce the deadline at insertion too: an old browser tab cannot submit late,
-- and a delayed background job cannot permit registrations outside the window.
create or replace function public.guard_registration_schedule()
returns trigger language plpgsql security definer set search_path=public as $$
declare t public.tournaments%rowtype;
begin
  select * into t from public.tournaments where id=new.tournament_id for share;
  if not found then raise exception 'Tournament not found.'; end if;
  -- Preserve authorised admin archive/result imports outside public registration.
  if coalesce(public.current_admin_role() in ('super_admin','admin'),false) then return new; end if;
  if public.effective_registration_status(t.registration_status::text,t.registration_schedule_enabled,
    t.registration_open_date,t.registration_close_date) <> 'Open' then
    raise exception 'This tournament is not open for registration.';
  end if;
  return new;
end $$;
drop trigger if exists registration_schedule_guard on public.registrations;
create trigger registration_schedule_guard before insert on public.registrations
for each row execute function public.guard_registration_schedule();

create or replace function public.refresh_tournament_registration_schedules()
returns void language sql security definer set search_path=public as $$
  update public.tournaments set registration_status=public.effective_registration_status(
    registration_status::text,true,registration_open_date,registration_close_date)::public.tournament_registration_status
  where registration_schedule_enabled and registration_status::text in ('Open','Closed')
    and registration_status::text is distinct from public.effective_registration_status(
      registration_status::text,true,registration_open_date,registration_close_date);
$$;
revoke all on function public.refresh_tournament_registration_schedules() from public,anon,authenticated;
grant execute on function public.refresh_tournament_registration_schedules() to service_role;

-- Only currently Open events with valid dates adopt scheduling on installation.
-- Closed, Draft, Postponed and Completed events retain their existing intent.
update public.tournaments set registration_schedule_enabled=true
where registration_status::text='Open' and not registration_schedule_enabled
  and registration_open_date is not null and registration_close_date>=registration_open_date;

-- Supabase Cron runs even when nobody is browsing the website.
create extension if not exists pg_cron;
do $$
begin
  perform cron.unschedule(jobid) from cron.job where jobname='pcc-registration-schedules';
  perform cron.schedule('pcc-registration-schedules','* * * * *',
    'select public.refresh_tournament_registration_schedules()');
exception when undefined_table then
  raise notice 'pg_cron is unavailable; run refresh_tournament_registration_schedules from a trusted scheduler.';
end $$;
notify pgrst,'reload schema';
commit;
select 'Automatic registration schedule installed (South African time)' as status;
