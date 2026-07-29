-- Public tournament page visibility repair.
-- Run this in Supabase SQL Editor.
--
-- This restores the public tournament page after security-invoker view cleanup.
-- It exposes only safe public fields needed by parents/players:
-- registration counts, public entry names, officials and final standings.
-- It does not expose registration emails, phone numbers or proof-of-payment URLs.

-- Final rankings must be publicly readable for non-draft tournaments.
alter table public.tournament_results enable row level security;

grant select on public.tournament_results to anon, authenticated;

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
      and tournaments.registration_status::text <> 'Draft'
  )
);

-- Registration rows are public only through safe columns and non-draft events.
alter table public.registrations enable row level security;

revoke select on public.registrations from anon;
grant select (
  id,
  tournament_id,
  section_id,
  player_id,
  payment_status,
  registration_status,
  created_at
) on public.registrations to anon;

grant select (
  id,
  tournament_id,
  section_id,
  player_id,
  payment_status,
  registration_status,
  created_at
) on public.registrations to authenticated;

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
      and tournaments.registration_status::text <> 'Draft'
  )
);

-- Public pages need section names/order to display registration lists and
-- completed rankings by section.
alter table public.tournament_sections enable row level security;

grant select (
  id,
  tournament_id,
  section_name,
  display_order,
  minimum_birth_year,
  maximum_birth_year,
  minimum_rating,
  maximum_rating,
  entry_fee_override,
  maximum_players,
  chess_results_url
) on public.tournament_sections to anon, authenticated;

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
      and tournaments.registration_status::text <> 'Draft'
  )
);

-- Public player fields required by tournament pages, player centre and officials.
alter table public.players enable row level security;

grant select (
  id,
  pcc_id,
  full_name,
  chess_sa_id,
  fide_id,
  gender,
  club,
  province,
  rating,
  verification_status,
  profile_photo_url,
  biography,
  title
) on public.players to anon, authenticated;

drop policy if exists "Public can read active player profiles"
on public.players;

create policy "Public can read active player profiles"
on public.players
for select
to anon, authenticated
using (
  verification_status = 'Verified'
  or public.player_has_pcc_activity(players.id)
  or exists (
    select 1
    from public.tournament_officials
    where tournament_officials.player_id = players.id
  )
  or exists (
    select 1
    from public.tournament_organiser_access
    where tournament_organiser_access.player_id = players.id
      and tournament_organiser_access.access_status = 'Active'
  )
);

-- Public officials and organiser assignments used by the public role profile view.
alter table public.tournament_officials enable row level security;

grant select (
  id,
  tournament_id,
  player_id,
  role,
  notes,
  created_at
) on public.tournament_officials to anon, authenticated;

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
      and tournaments.registration_status::text <> 'Draft'
  )
);

alter table public.tournament_organiser_access enable row level security;

grant select (
  id,
  tournament_id,
  player_id,
  role,
  organiser_name,
  chess_sa_id,
  access_status
) on public.tournament_organiser_access to anon, authenticated;

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
      and tournaments.registration_status::text <> 'Draft'
  )
);

-- Keep the existing stats view shape intact. The earlier problem was the
-- underlying registration visibility, not the stats columns themselves.
alter view if exists public.tournament_public_stats
set (security_invoker = true);

grant select on public.tournament_public_stats to anon, authenticated;

-- Safe public registered-player list for parents and coaches to confirm entries.
create or replace view public.public_tournament_registration_list
with (security_invoker = true) as
select
  registrations.id as registration_id,
  registrations.tournament_id,
  registrations.section_id,
  tournament_sections.section_name,
  tournament_sections.display_order as section_display_order,
  registrations.player_id,
  players.full_name,
  players.chess_sa_id,
  players.pcc_id,
  players.profile_photo_url,
  registrations.registration_status,
  registrations.payment_status,
  registrations.created_at
from public.registrations
left join public.players
  on players.id = registrations.player_id
left join public.tournament_sections
  on tournament_sections.id = registrations.section_id
where exists (
  select 1
  from public.tournaments
  where tournaments.id = registrations.tournament_id
    and tournaments.registration_status::text <> 'Draft'
);

grant select on public.public_tournament_registration_list to anon, authenticated;

-- Keep the public role profile view security-invoker, with title included.
create or replace view public.public_tournament_role_profiles
with (security_invoker = true) as
select
  concat('organiser-', access.id::text) as id,
  access.tournament_id,
  access.player_id,
  coalesce(nullif(access.role, ''), 'Organiser') as role,
  null::text as notes,
  'Organiser'::text as role_group,
  coalesce(players.full_name, access.organiser_name) as full_name,
  coalesce(players.chess_sa_id, access.chess_sa_id) as chess_sa_id,
  players.fide_id,
  players.rating,
  players.club,
  players.province,
  players.profile_photo_url,
  players.title
from public.tournament_organiser_access access
left join public.players
  on players.id = access.player_id
where access.access_status = 'Active'

union all

select
  concat('official-', officials.id::text) as id,
  officials.tournament_id,
  officials.player_id,
  officials.role,
  officials.notes,
  'Official'::text as role_group,
  players.full_name,
  players.chess_sa_id,
  players.fide_id,
  players.rating,
  players.club,
  players.province,
  players.profile_photo_url,
  players.title
from public.tournament_officials officials
left join public.players
  on players.id = officials.player_id;

grant select on public.public_tournament_role_profiles to anon, authenticated;

-- Refresh PostgREST/Supabase schema cache so the new public view is available
-- immediately to the website.
notify pgrst, 'reload schema';

-- Quick verification after running:
-- 1. public_tournament_registration_list should exist and return rows for
--    tournaments with entries.
-- 2. public_tournament_role_profiles should show full_name/profile_photo_url
--    for linked organisers/arbiters.
-- 3. tournament_public_stats should no longer return 0 for tournaments that
--    have registrations.
select
  'public visibility repair installed' as status,
  count(*) as non_draft_tournaments
from public.tournaments
where registration_status::text <> 'Draft';
