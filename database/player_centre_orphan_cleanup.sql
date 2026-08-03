-- Player Centre orphan cleanup.
-- Run this in Supabase SQL Editor.
--
-- Purpose:
-- Remove Player Centre records that do not belong to any tournament
-- registration or final ranking.
--
-- Safety:
-- The cleanup also protects people who are still linked as members,
-- officials, organisers, organisation committee members, achievements,
-- news mentions, or tournament arbiter/organiser records.
--
-- Step 1: install the preview/delete helpers.
-- Step 2: run the preview query at the bottom and check the list.
-- Step 3: run the delete query only when the preview is correct.

create or replace function public.player_centre_cleanup_name_key(p_name text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select string_agg(token, ' ' order by token)
      from regexp_split_to_table(
        regexp_replace(lower(coalesce(p_name, '')), '[^[:alnum:][:space:]]+', ' ', 'g'),
        '[[:space:]]+'
      ) as token
      where token <> ''
    ),
    ''
  )
$$;

drop function if exists public.preview_player_centre_orphan_cleanup();

create function public.preview_player_centre_orphan_cleanup()
returns table (
  id uuid,
  full_name text,
  chess_sa_id text,
  pcc_id text,
  rating integer,
  club text,
  province text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean := false;
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
    or session_user in ('postgres', 'supabase_admin', 'service_role')
  then
    allowed := true;
  elsif to_regprocedure('public.is_super_admin()') is not null then
    execute 'select public.is_super_admin()' into allowed;
  elsif to_regprocedure('public.has_admin_access()') is not null then
    execute 'select public.has_admin_access()' into allowed;
  end if;

  if not allowed then
    raise exception 'Only PCC admins can preview Player Centre cleanup.';
  end if;

  create temp table if not exists pcc_orphan_player_candidates (
    id uuid primary key
  ) on commit drop;

  truncate table pcc_orphan_player_candidates;

  insert into pcc_orphan_player_candidates (id)
  select players.id
  from public.players players;

  if to_regclass('public.registrations') is not null then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.registrations registrations
      where registrations.player_id = candidates.id
    ';
  end if;

  if to_regclass('public.tournament_results') is not null then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.players players, public.tournament_results results
      where players.id = candidates.id
        and (
          results.player_id = candidates.id
          or (
            results.imported_name is not null
            and public.player_centre_cleanup_name_key(results.imported_name) =
              public.player_centre_cleanup_name_key(players.full_name)
          )
        )
    ';
  end if;

  if to_regclass('public.tournament_officials') is not null then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.tournament_officials officials
      where officials.player_id = candidates.id
    ';
  end if;

  if to_regclass('public.tournament_organiser_access') is not null then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.tournament_organiser_access access
      where access.player_id = candidates.id
    ';
  end if;

  if to_regclass('public.member_memberships') is not null then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.member_memberships memberships
      where memberships.player_id = candidates.id
    ';
  end if;

  if to_regclass('public.organisation_committee_members') is not null then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.organisation_committee_members members
      where members.player_id = candidates.id
    ';
  end if;

  if to_regclass('public.player_achievements') is not null then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.player_achievements achievements
      where achievements.player_id = candidates.id
    ';
  end if;

  if to_regclass('public.player_news_tags') is not null then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.player_news_tags news_tags
      where news_tags.player_id = candidates.id
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'arbiter_player_id'
  ) then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.tournaments tournaments
      where tournaments.arbiter_player_id = candidates.id
    ';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'organiser_player_id'
  ) then
    execute '
      delete from pcc_orphan_player_candidates candidates
      using public.tournaments tournaments
      where tournaments.organiser_player_id = candidates.id
    ';
  end if;

  return query
  select
    players.id,
    players.full_name,
    players.chess_sa_id,
    players.pcc_id,
    players.rating,
    players.club,
    players.province,
    players.created_at,
    players.updated_at
  from public.players players
  join pcc_orphan_player_candidates candidates on candidates.id = players.id
  order by players.created_at desc nulls last, players.full_name;
end;
$$;

grant execute on function public.preview_player_centre_orphan_cleanup()
to authenticated;

drop function if exists public.delete_player_centre_orphan_cleanup();

create function public.delete_player_centre_orphan_cleanup()
returns table (
  id uuid,
  full_name text,
  chess_sa_id text,
  pcc_id text,
  rating integer,
  deleted_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean := false;
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
    or session_user in ('postgres', 'supabase_admin', 'service_role')
  then
    allowed := true;
  elsif to_regprocedure('public.is_super_admin()') is not null then
    execute 'select public.is_super_admin()' into allowed;
  elsif to_regprocedure('public.has_admin_access()') is not null then
    execute 'select public.has_admin_access()' into allowed;
  end if;

  if not allowed then
    raise exception 'Only PCC admins can delete Player Centre records.';
  end if;

  create temp table if not exists pcc_orphan_players_to_delete
  on commit drop
  as
  select preview.id
  from public.preview_player_centre_orphan_cleanup() preview;

  truncate table pcc_orphan_players_to_delete;

  insert into pcc_orphan_players_to_delete (id)
  select preview.id
  from public.preview_player_centre_orphan_cleanup() preview;

  if to_regclass('public.import_session_rows') is not null then
    execute '
      update public.import_session_rows rows
      set matched_player_id = null
      from pcc_orphan_players_to_delete doomed
      where rows.matched_player_id = doomed.id
    ';
  end if;

  if to_regclass('public.player_rating_history') is not null then
    execute '
      delete from public.player_rating_history history
      using pcc_orphan_players_to_delete doomed
      where history.player_id = doomed.id
    ';
  end if;

  if to_regclass('public.player_duplicate_ignores') is not null then
    execute '
      delete from public.player_duplicate_ignores ignores
      using pcc_orphan_players_to_delete doomed
      where ignores.player_a = doomed.id
         or ignores.player_b = doomed.id
    ';
  end if;

  if to_regclass('public.player_merge_history') is not null then
    execute '
      delete from public.player_merge_history history
      using pcc_orphan_players_to_delete doomed
      where history.primary_player_id = doomed.id
         or history.duplicate_player_id = doomed.id
    ';
  end if;

  return query
  delete from public.players players
  using pcc_orphan_players_to_delete doomed
  where players.id = doomed.id
  returning
    players.id,
    players.full_name,
    players.chess_sa_id,
    players.pcc_id,
    players.rating,
    now() as deleted_at;
end;
$$;

grant execute on function public.delete_player_centre_orphan_cleanup()
to authenticated;

-- Preview first. Check the list before deleting.
select * from public.preview_player_centre_orphan_cleanup();

-- Optional audit: players with no linked player_id result, but protected because
-- their name appears in an imported final ranking.
select distinct
  players.id,
  players.full_name,
  players.chess_sa_id,
  players.pcc_id,
  players.rating,
  players.club,
  players.province,
  results.imported_name as matched_final_ranking_name,
  results.tournament_id
from public.players players
join public.tournament_results results
  on results.player_id is null
 and results.imported_name is not null
 and public.player_centre_cleanup_name_key(results.imported_name) =
   public.player_centre_cleanup_name_key(players.full_name)
where not exists (
  select 1
  from public.tournament_results linked_results
  where linked_results.player_id = players.id
)
order by players.full_name;

-- Delete only after the preview list is correct.
-- select * from public.delete_player_centre_orphan_cleanup();
