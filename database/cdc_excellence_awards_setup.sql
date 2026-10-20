-- CDC Excellence Awards 2026 nomination storage.
-- Apply this setup to the Supabase project used by the website before opening nominations.

create table if not exists public.cdc_excellence_nominations (
  id uuid primary key default gen_random_uuid(),
  award_year integer not null default 2026 check (award_year = 2026),
  nominee_name text not null check (length(btrim(nominee_name)) between 1 and 80),
  nominee_surname text not null check (length(btrim(nominee_surname)) between 1 and 80),
  category text not null check (category in (
    'Coach of the Year',
    'Arbiter of the Year',
    'Upcoming Arbiter of the Year',
    'Organiser of the Year',
    'Administrator of the Year',
    'Team Manager of the Year',
    'Upcoming Manager of the Year'
  )),
  school_club text not null check (length(btrim(school_club)) between 1 and 120),
  nominator_name text not null check (length(btrim(nominator_name)) between 1 and 120),
  nominator_contact text not null check (length(btrim(nominator_contact)) between 5 and 120),
  criteria_confirmed boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.cdc_excellence_nominations
  add column if not exists criteria_confirmed boolean not null default false;

-- Preserve any existing nomination explanations while allowing new submissions
-- to use the criteria confirmation checkbox instead.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cdc_excellence_nominations'
      and column_name = 'reason'
  ) then
    alter table public.cdc_excellence_nominations
      alter column reason drop not null;
  end if;
end
$$;

alter table public.cdc_excellence_nominations enable row level security;

revoke all on public.cdc_excellence_nominations from public, anon, authenticated;
grant insert on public.cdc_excellence_nominations to anon;
grant select on public.cdc_excellence_nominations to authenticated;
grant select (nominee_name, nominee_surname, category, school_club)
  on public.cdc_excellence_nominations to anon;
grant select (created_at)
  on public.cdc_excellence_nominations to anon;

drop policy if exists cdc_awards_public_nomination_insert on public.cdc_excellence_nominations;
create policy cdc_awards_public_nomination_insert
  on public.cdc_excellence_nominations
  for insert
  to anon
  with check (
    criteria_confirmed is true
    and
    ((now() at time zone 'Africa/Johannesburg')::date >= date '2026-10-20')
    and ((now() at time zone 'Africa/Johannesburg')::date <= date '2026-10-23')
  );

drop policy if exists cdc_awards_super_admin_nomination_read on public.cdc_excellence_nominations;
drop policy if exists cdc_awards_admin_nomination_read on public.cdc_excellence_nominations;
create policy cdc_awards_admin_nomination_read
  on public.cdc_excellence_nominations
  for select
  to authenticated
  using ((select public.current_admin_role()) in ('super_admin', 'admin'));

drop policy if exists cdc_awards_public_nominee_list_read on public.cdc_excellence_nominations;
create policy cdc_awards_public_nominee_list_read
  on public.cdc_excellence_nominations
  for select
  to anon
  using (
    criteria_confirmed is true
    and (now() at time zone 'Africa/Johannesburg')::date >= date '2026-10-24'
  );
