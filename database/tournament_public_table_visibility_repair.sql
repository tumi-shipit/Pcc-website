-- Tournament table public visibility repair.
-- Run this in Supabase SQL Editor.
--
-- Purpose:
-- 1. Public visitors can read every tournament that is not Draft.
-- 2. Admin users keep full tournament management access.
-- 3. The public tournament centre, tournament detail pages, public stats,
--    officials, registrations and final rankings all agree on the same
--    "non-draft tournament is public" rule.

grant usage on schema public to anon, authenticated;

do $$
declare
  public_columns text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
  into public_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'tournaments'
    and column_name = any (array[
      'id',
      'tournament_name',
      'organiser_name',
      'description',
      'tournament_report',
      'start_date',
      'end_date',
      'venue',
      'province',
      'registration_status',
      'entry_fee',
      'poster_image_url',
      'payment_details',
      'chess_results_url',
      'arbiter_player_id'
    ]);

  if public_columns is null then
    raise exception 'No public tournament columns were found. Check the public.tournaments table name.';
  end if;

  execute format(
    'grant select (%s) on public.tournaments to anon, authenticated',
    public_columns
  );
end
$$;

grant select, insert, update, delete on public.tournaments to authenticated;

alter table public.tournaments enable row level security;

drop policy if exists "Public can read non-draft tournaments"
on public.tournaments;

drop policy if exists "Members can read public tournaments"
on public.tournaments;

drop policy if exists "Admins can manage tournaments"
on public.tournaments;

create policy "Public can read non-draft tournaments"
on public.tournaments
for select
to anon, authenticated
using (
  coalesce(registration_status::text, 'Open') <> 'Draft'
);

create policy "Admins can manage tournaments"
on public.tournaments
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

-- Keep supporting public policies aligned with the same rule.
drop policy if exists "Public can view tournament results"
on public.tournament_results;

create policy "Public can view tournament results"
on public.tournament_results
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_results.tournament_id
      and coalesce(tournaments.registration_status::text, 'Open') <> 'Draft'
  )
);

drop policy if exists "Public can read safe tournament registration rows"
on public.registrations;

create policy "Public can read safe tournament registration rows"
on public.registrations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = registrations.tournament_id
      and coalesce(tournaments.registration_status::text, 'Open') <> 'Draft'
  )
);

drop policy if exists "Public can read tournament sections"
on public.tournament_sections;

create policy "Public can read tournament sections"
on public.tournament_sections
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_sections.tournament_id
      and coalesce(tournaments.registration_status::text, 'Open') <> 'Draft'
  )
);

drop policy if exists "Public can read tournament officials"
on public.tournament_officials;

create policy "Public can read tournament officials"
on public.tournament_officials
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_officials.tournament_id
      and coalesce(tournaments.registration_status::text, 'Open') <> 'Draft'
  )
);

drop policy if exists "Public can read active tournament organiser access"
on public.tournament_organiser_access;

create policy "Public can read active tournament organiser access"
on public.tournament_organiser_access
for select
to anon, authenticated
using (
  access_status = 'Active'
  and exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_organiser_access.tournament_id
      and coalesce(tournaments.registration_status::text, 'Open') <> 'Draft'
  )
);

notify pgrst, 'reload schema';

select
  'tournament public table visibility repaired' as status,
  count(*) filter (
    where coalesce(registration_status::text, 'Open') <> 'Draft'
  ) as public_tournaments,
  count(*) filter (
    where registration_status::text = 'Draft'
  ) as draft_tournaments,
  count(*) as total_tournaments
from public.tournaments;
