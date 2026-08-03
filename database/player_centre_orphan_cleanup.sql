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

do $$
begin
  if to_regclass('public.registrations') is not null then
    execute 'create index if not exists registrations_player_id_cleanup_idx on public.registrations (player_id) where player_id is not null';
  end if;

  if to_regclass('public.tournament_results') is not null then
    execute 'create index if not exists tournament_results_player_id_cleanup_idx on public.tournament_results (player_id) where player_id is not null';
  end if;

  if to_regclass('public.tournament_officials') is not null then
    execute 'create index if not exists tournament_officials_player_id_cleanup_idx on public.tournament_officials (player_id) where player_id is not null';
  end if;

  if to_regclass('public.tournament_organiser_access') is not null then
    execute 'create index if not exists tournament_organiser_access_player_id_cleanup_idx on public.tournament_organiser_access (player_id) where player_id is not null';
  end if;

  if to_regclass('public.member_memberships') is not null then
    execute 'create index if not exists member_memberships_player_id_cleanup_idx on public.member_memberships (player_id) where player_id is not null';
  end if;

  if to_regclass('public.organisation_committee_members') is not null then
    execute 'create index if not exists organisation_committee_members_player_id_cleanup_idx on public.organisation_committee_members (player_id) where player_id is not null';
  end if;

  if to_regclass('public.player_achievements') is not null then
    execute 'create index if not exists player_achievements_player_id_cleanup_idx on public.player_achievements (player_id) where player_id is not null';
  end if;

  if to_regclass('public.player_news_tags') is not null then
    execute 'create index if not exists player_news_tags_player_id_cleanup_idx on public.player_news_tags (player_id) where player_id is not null';
  end if;

  if to_regclass('public.import_session_rows') is not null then
    execute 'create index if not exists import_session_rows_matched_player_id_cleanup_idx on public.import_session_rows (matched_player_id) where matched_player_id is not null';
  end if;

  if to_regclass('public.player_rating_history') is not null then
    execute 'create index if not exists player_rating_history_player_id_cleanup_idx on public.player_rating_history (player_id) where player_id is not null';
  end if;

  if to_regclass('public.player_duplicate_ignores') is not null then
    execute 'create index if not exists player_duplicate_ignores_player_a_cleanup_idx on public.player_duplicate_ignores (player_a) where player_a is not null';
    execute 'create index if not exists player_duplicate_ignores_player_b_cleanup_idx on public.player_duplicate_ignores (player_b) where player_b is not null';
  end if;

  if to_regclass('public.player_merge_history') is not null then
    execute 'create index if not exists player_merge_history_primary_player_id_cleanup_idx on public.player_merge_history (primary_player_id) where primary_player_id is not null';
    execute 'create index if not exists player_merge_history_duplicate_player_id_cleanup_idx on public.player_merge_history (duplicate_player_id) where duplicate_player_id is not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'arbiter_player_id'
  ) then
    execute 'create index if not exists tournaments_arbiter_player_id_cleanup_idx on public.tournaments (arbiter_player_id) where arbiter_player_id is not null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'organiser_player_id'
  ) then
    execute 'create index if not exists tournaments_organiser_player_id_cleanup_idx on public.tournaments (organiser_player_id) where organiser_player_id is not null';
  end if;
end;
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
      using public.tournament_results results
      where results.player_id = candidates.id
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

drop function if exists public.delete_player_centre_selected_inactive(uuid[]);

create function public.delete_player_centre_selected_inactive(p_player_ids uuid[])
returns table (
  id uuid,
  full_name text,
  chess_sa_id text,
  pcc_id text,
  action text,
  reason text,
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
  end if;

  if not allowed then
    raise exception 'Only the PCC super admin can delete selected Player Centre records.';
  end if;

  create temp table if not exists pcc_requested_player_cleanup (
    id uuid primary key
  ) on commit drop;

  create temp table if not exists pcc_selected_player_cleanup_status (
    id uuid primary key,
    full_name text,
    chess_sa_id text,
    pcc_id text,
    action text not null,
    reason text,
    deleted_at timestamptz
  ) on commit drop;

  truncate table pcc_requested_player_cleanup;
  truncate table pcc_selected_player_cleanup_status;

  insert into pcc_requested_player_cleanup (id)
  select distinct requested_id
  from unnest(coalesce(p_player_ids, array[]::uuid[])) as requested(requested_id)
  where requested_id is not null;

  insert into pcc_selected_player_cleanup_status (
    id,
    full_name,
    chess_sa_id,
    pcc_id,
    action
  )
  select
    players.id,
    players.full_name,
    players.chess_sa_id,
    players.pcc_id,
    'delete'
  from public.players players
  join pcc_requested_player_cleanup requested on requested.id = players.id;

  insert into pcc_selected_player_cleanup_status (
    id,
    action,
    reason
  )
  select
    requested.id,
    'not_found',
    'Player record no longer exists.'
  from pcc_requested_player_cleanup requested
  where not exists (
    select 1
    from public.players players
    where players.id = requested.id
  );

  if to_regclass('public.registrations') is not null then
    execute '
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked tournament registration''
      from public.registrations registrations
      where status.action = ''delete''
        and registrations.player_id = status.id
    ';
  end if;

  if to_regclass('public.tournament_results') is not null then
    execute '
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked final ranking''
      from public.tournament_results results
      where status.action = ''delete''
        and results.player_id = status.id
    ';

  end if;

  if to_regclass('public.tournament_officials') is not null then
    execute '
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked tournament official role''
      from public.tournament_officials officials
      where status.action = ''delete''
        and officials.player_id = status.id
    ';
  end if;

  if to_regclass('public.tournament_organiser_access') is not null then
    execute '
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked tournament organiser access''
      from public.tournament_organiser_access access
      where status.action = ''delete''
        and access.player_id = status.id
    ';
  end if;

  if to_regclass('public.member_memberships') is not null then
    execute '
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked PCC membership''
      from public.member_memberships memberships
      where status.action = ''delete''
        and memberships.player_id = status.id
    ';
  end if;

  if to_regclass('public.organisation_committee_members') is not null then
    execute '
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked organisation committee member''
      from public.organisation_committee_members members
      where status.action = ''delete''
        and members.player_id = status.id
    ';
  end if;

  if to_regclass('public.player_achievements') is not null then
    execute '
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked player achievement''
      from public.player_achievements achievements
      where status.action = ''delete''
        and achievements.player_id = status.id
    ';
  end if;

  if to_regclass('public.player_news_tags') is not null then
    execute '
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked news tag''
      from public.player_news_tags news_tags
      where status.action = ''delete''
        and news_tags.player_id = status.id
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
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked legacy tournament arbiter''
      from public.tournaments tournaments
      where status.action = ''delete''
        and tournaments.arbiter_player_id = status.id
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
      update pcc_selected_player_cleanup_status status
      set action = ''protected'',
          reason = ''Linked legacy tournament organiser''
      from public.tournaments tournaments
      where status.action = ''delete''
        and tournaments.organiser_player_id = status.id
    ';
  end if;

  create temp table if not exists pcc_selected_players_to_delete (
    id uuid primary key
  ) on commit drop;

  truncate table pcc_selected_players_to_delete;

  insert into pcc_selected_players_to_delete (id)
  select status.id
  from pcc_selected_player_cleanup_status status
  where status.action = 'delete';

  if to_regclass('public.import_session_rows') is not null then
    execute '
      update public.import_session_rows rows
      set matched_player_id = null
      from pcc_selected_players_to_delete doomed
      where rows.matched_player_id = doomed.id
    ';
  end if;

  if to_regclass('public.player_rating_history') is not null then
    execute '
      delete from public.player_rating_history history
      using pcc_selected_players_to_delete doomed
      where history.player_id = doomed.id
    ';
  end if;

  if to_regclass('public.player_duplicate_ignores') is not null then
    execute '
      delete from public.player_duplicate_ignores ignores
      using pcc_selected_players_to_delete doomed
      where ignores.player_a = doomed.id
         or ignores.player_b = doomed.id
    ';
  end if;

  if to_regclass('public.player_merge_history') is not null then
    execute '
      delete from public.player_merge_history history
      using pcc_selected_players_to_delete doomed
      where history.primary_player_id = doomed.id
         or history.duplicate_player_id = doomed.id
    ';
  end if;

  create temp table if not exists pcc_selected_deleted_players (
    id uuid primary key,
    full_name text,
    chess_sa_id text,
    pcc_id text,
    deleted_at timestamptz
  ) on commit drop;

  truncate table pcc_selected_deleted_players;

  with deleted as (
    delete from public.players players
    using pcc_selected_players_to_delete doomed
    where players.id = doomed.id
    returning players.id, players.full_name, players.chess_sa_id, players.pcc_id
  )
  insert into pcc_selected_deleted_players (
    id,
    full_name,
    chess_sa_id,
    pcc_id,
    deleted_at
  )
  select
    deleted.id,
    deleted.full_name,
    deleted.chess_sa_id,
    deleted.pcc_id,
    now()
  from deleted;

  update pcc_selected_player_cleanup_status status
  set action = 'deleted',
      reason = 'Deleted from Player Centre',
      deleted_at = deleted.deleted_at
  from pcc_selected_deleted_players deleted
  where status.id = deleted.id;

  update pcc_selected_player_cleanup_status status
  set action = 'not_deleted',
      reason = 'Supabase returned 0 deleted rows'
  where status.action = 'delete';

  return query
  select
    status.id,
    status.full_name,
    status.chess_sa_id,
    status.pcc_id,
    status.action,
    status.reason,
    status.deleted_at
  from pcc_selected_player_cleanup_status status
  order by
    case status.action
      when 'deleted' then 1
      when 'protected' then 2
      when 'not_deleted' then 3
      else 4
    end,
    status.full_name nulls last,
    status.id;
end;
$$;

grant execute on function public.delete_player_centre_selected_inactive(uuid[])
to authenticated;

create table if not exists public.player_centre_cleanup_requests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid,
  requested_count integer not null default 0,
  deleted_count integer not null default 0,
  protected_count integer not null default 0,
  not_found_count integer not null default 0,
  not_deleted_count integer not null default 0,
  status text not null default 'created',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.player_centre_cleanup_request_rows (
  request_id uuid not null references public.player_centre_cleanup_requests(id) on delete cascade,
  player_id uuid not null,
  full_name text,
  chess_sa_id text,
  pcc_id text,
  action text not null default 'requested',
  reason text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (request_id, player_id)
);

create index if not exists player_centre_cleanup_rows_player_idx
on public.player_centre_cleanup_request_rows (player_id);

alter table public.player_centre_cleanup_requests enable row level security;
alter table public.player_centre_cleanup_request_rows enable row level security;

drop policy if exists "Admins can read player cleanup requests"
on public.player_centre_cleanup_requests;

create policy "Admins can read player cleanup requests"
on public.player_centre_cleanup_requests
for select
to authenticated
using (public.has_admin_access());

drop policy if exists "Admins can read player cleanup request rows"
on public.player_centre_cleanup_request_rows;

create policy "Admins can read player cleanup request rows"
on public.player_centre_cleanup_request_rows
for select
to authenticated
using (public.has_admin_access());

grant select on public.player_centre_cleanup_requests to authenticated;
grant select on public.player_centre_cleanup_request_rows to authenticated;

drop function if exists public.create_player_centre_cleanup_request(uuid[]);

create function public.create_player_centre_cleanup_request(p_player_ids uuid[])
returns table (
  request_id uuid,
  requested_count integer,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  allowed boolean := false;
  v_request_id uuid;
  v_created_at timestamptz;
  v_requested_count integer;
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role')
    or session_user in ('postgres', 'supabase_admin', 'service_role')
  then
    allowed := true;
  elsif to_regprocedure('public.is_super_admin()') is not null then
    execute 'select public.is_super_admin()' into allowed;
  end if;

  if not allowed then
    raise exception 'Only the PCC super admin can create Player Centre cleanup requests.';
  end if;

  create temp table if not exists pcc_cleanup_request_ids (
    id uuid primary key
  ) on commit drop;

  truncate table pcc_cleanup_request_ids;

  insert into pcc_cleanup_request_ids (id)
  select distinct requested_id
  from unnest(coalesce(p_player_ids, array[]::uuid[])) as requested(requested_id)
  where requested_id is not null;

  insert into public.player_centre_cleanup_requests as cleanup_requests (
    created_by,
    requested_count,
    status
  )
  values (
    auth.uid(),
    0,
    'created'
  )
  returning cleanup_requests.id, cleanup_requests.created_at
  into v_request_id, v_created_at;

  insert into public.player_centre_cleanup_request_rows (
    request_id,
    player_id,
    full_name,
    chess_sa_id,
    pcc_id,
    action,
    reason
  )
  select
    v_request_id,
    requested.id,
    players.full_name,
    players.chess_sa_id,
    players.pcc_id,
    'requested',
    case
      when players.id is null then 'Player record was not found when request was created.'
      else 'Saved from admin Player Centre inactive list.'
    end
  from pcc_cleanup_request_ids requested
  left join public.players players on players.id = requested.id;

  select count(*)::integer
  into v_requested_count
  from public.player_centre_cleanup_request_rows rows
  where rows.request_id = v_request_id;

  update public.player_centre_cleanup_requests requests
  set requested_count = v_requested_count
  where requests.id = v_request_id;

  return query
  select v_request_id, v_requested_count, v_created_at;
end;
$$;

grant execute on function public.create_player_centre_cleanup_request(uuid[])
to authenticated;

drop function if exists public.delete_player_centre_cleanup_request(uuid);

create function public.delete_player_centre_cleanup_request(p_request_id uuid)
returns table (
  request_id uuid,
  player_id uuid,
  full_name text,
  chess_sa_id text,
  pcc_id text,
  action text,
  reason text,
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
  end if;

  if not allowed then
    raise exception 'Only the PCC super admin can delete Player Centre cleanup requests.';
  end if;

  if not exists (
    select 1
    from public.player_centre_cleanup_requests requests
    where requests.id = p_request_id
  ) then
    raise exception 'Player Centre cleanup request % was not found.', p_request_id;
  end if;

  update public.player_centre_cleanup_request_rows rows
  set action = 'delete',
      reason = 'Ready for Supabase safety checks.',
      deleted_at = null,
      updated_at = now()
  where rows.request_id = p_request_id
    and rows.action <> 'deleted';

  update public.player_centre_cleanup_request_rows rows
  set action = 'not_found',
      reason = 'Player record no longer exists.',
      updated_at = now()
  where rows.request_id = p_request_id
    and rows.action = 'delete'
    and not exists (
      select 1
      from public.players players
      where players.id = rows.player_id
    );

  if to_regclass('public.registrations') is not null then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked tournament registration'',
          updated_at = now()
      from public.registrations registrations
      where rows.request_id = $1
        and rows.action = ''delete''
        and registrations.player_id = rows.player_id
    ' using p_request_id;
  end if;

  if to_regclass('public.tournament_results') is not null then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked final ranking'',
          updated_at = now()
      from public.tournament_results results
      where rows.request_id = $1
        and rows.action = ''delete''
        and results.player_id = rows.player_id
    ' using p_request_id;

  end if;

  if to_regclass('public.tournament_officials') is not null then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked tournament official role'',
          updated_at = now()
      from public.tournament_officials officials
      where rows.request_id = $1
        and rows.action = ''delete''
        and officials.player_id = rows.player_id
    ' using p_request_id;
  end if;

  if to_regclass('public.tournament_organiser_access') is not null then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked tournament organiser access'',
          updated_at = now()
      from public.tournament_organiser_access access
      where rows.request_id = $1
        and rows.action = ''delete''
        and access.player_id = rows.player_id
    ' using p_request_id;
  end if;

  if to_regclass('public.member_memberships') is not null then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked PCC membership'',
          updated_at = now()
      from public.member_memberships memberships
      where rows.request_id = $1
        and rows.action = ''delete''
        and memberships.player_id = rows.player_id
    ' using p_request_id;
  end if;

  if to_regclass('public.organisation_committee_members') is not null then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked organisation committee member'',
          updated_at = now()
      from public.organisation_committee_members members
      where rows.request_id = $1
        and rows.action = ''delete''
        and members.player_id = rows.player_id
    ' using p_request_id;
  end if;

  if to_regclass('public.player_achievements') is not null then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked player achievement'',
          updated_at = now()
      from public.player_achievements achievements
      where rows.request_id = $1
        and rows.action = ''delete''
        and achievements.player_id = rows.player_id
    ' using p_request_id;
  end if;

  if to_regclass('public.player_news_tags') is not null then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked news tag'',
          updated_at = now()
      from public.player_news_tags news_tags
      where rows.request_id = $1
        and rows.action = ''delete''
        and news_tags.player_id = rows.player_id
    ' using p_request_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'arbiter_player_id'
  ) then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked legacy tournament arbiter'',
          updated_at = now()
      from public.tournaments tournaments
      where rows.request_id = $1
        and rows.action = ''delete''
        and tournaments.arbiter_player_id = rows.player_id
    ' using p_request_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'tournaments'
      and column_name = 'organiser_player_id'
  ) then
    execute '
      update public.player_centre_cleanup_request_rows rows
      set action = ''protected'',
          reason = ''Linked legacy tournament organiser'',
          updated_at = now()
      from public.tournaments tournaments
      where rows.request_id = $1
        and rows.action = ''delete''
        and tournaments.organiser_player_id = rows.player_id
    ' using p_request_id;
  end if;

  create temp table if not exists pcc_request_players_to_delete (
    id uuid primary key
  ) on commit drop;

  truncate table pcc_request_players_to_delete;

  insert into pcc_request_players_to_delete (id)
  select rows.player_id
  from public.player_centre_cleanup_request_rows rows
  where rows.request_id = p_request_id
    and rows.action = 'delete';

  if to_regclass('public.import_session_rows') is not null then
    execute '
      update public.import_session_rows rows
      set matched_player_id = null
      from pcc_request_players_to_delete doomed
      where rows.matched_player_id = doomed.id
    ';
  end if;

  if to_regclass('public.player_rating_history') is not null then
    execute '
      delete from public.player_rating_history history
      using pcc_request_players_to_delete doomed
      where history.player_id = doomed.id
    ';
  end if;

  if to_regclass('public.player_duplicate_ignores') is not null then
    execute '
      delete from public.player_duplicate_ignores ignores
      using pcc_request_players_to_delete doomed
      where ignores.player_a = doomed.id
         or ignores.player_b = doomed.id
    ';
  end if;

  if to_regclass('public.player_merge_history') is not null then
    execute '
      delete from public.player_merge_history history
      using pcc_request_players_to_delete doomed
      where history.primary_player_id = doomed.id
         or history.duplicate_player_id = doomed.id
    ';
  end if;

  with deleted as (
    delete from public.players players
    using pcc_request_players_to_delete doomed
    where players.id = doomed.id
    returning players.id
  )
  update public.player_centre_cleanup_request_rows rows
  set action = 'deleted',
      reason = 'Deleted from Player Centre',
      deleted_at = now(),
      updated_at = now()
  from deleted
  where rows.request_id = p_request_id
    and rows.player_id = deleted.id;

  update public.player_centre_cleanup_request_rows rows
  set action = 'not_deleted',
      reason = 'Supabase returned 0 deleted rows',
      updated_at = now()
  where rows.request_id = p_request_id
    and rows.action = 'delete';

  update public.player_centre_cleanup_requests requests
  set status = 'completed',
      completed_at = now(),
      deleted_count = (
        select count(*)::integer
        from public.player_centre_cleanup_request_rows rows
        where rows.request_id = p_request_id
          and rows.action = 'deleted'
      ),
      protected_count = (
        select count(*)::integer
        from public.player_centre_cleanup_request_rows rows
        where rows.request_id = p_request_id
          and rows.action = 'protected'
      ),
      not_found_count = (
        select count(*)::integer
        from public.player_centre_cleanup_request_rows rows
        where rows.request_id = p_request_id
          and rows.action = 'not_found'
      ),
      not_deleted_count = (
        select count(*)::integer
        from public.player_centre_cleanup_request_rows rows
        where rows.request_id = p_request_id
          and rows.action = 'not_deleted'
      )
  where requests.id = p_request_id;

  return query
  select
    rows.request_id,
    rows.player_id,
    rows.full_name,
    rows.chess_sa_id,
    rows.pcc_id,
    rows.action,
    rows.reason,
    rows.deleted_at
  from public.player_centre_cleanup_request_rows rows
  where rows.request_id = p_request_id
  order by
    case rows.action
      when 'deleted' then 1
      when 'protected' then 2
      when 'not_deleted' then 3
      when 'not_found' then 4
      else 5
    end,
    rows.full_name nulls last,
    rows.player_id;
end;
$$;

grant execute on function public.delete_player_centre_cleanup_request(uuid)
to authenticated;

drop function if exists public.delete_player_centre_cleanup_request_summary(uuid);

create function public.delete_player_centre_cleanup_request_summary(p_request_id uuid)
returns table (
  request_id uuid,
  requested_count integer,
  deleted_count integer,
  protected_count integer,
  not_found_count integer,
  not_deleted_count integer,
  status text,
  completed_at timestamptz
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
  end if;

  if not allowed then
    raise exception 'Only the PCC super admin can delete Player Centre cleanup requests.';
  end if;

  perform *
  from public.delete_player_centre_cleanup_request(p_request_id);

  return query
  select
    requests.id,
    requests.requested_count,
    requests.deleted_count,
    requests.protected_count,
    requests.not_found_count,
    requests.not_deleted_count,
    requests.status,
    requests.completed_at
  from public.player_centre_cleanup_requests requests
  where requests.id = p_request_id;
end;
$$;

grant execute on function public.delete_player_centre_cleanup_request_summary(uuid)
to authenticated;

drop function if exists public.preview_player_centre_orphan_cleanup_summary();

create function public.preview_player_centre_orphan_cleanup_summary()
returns table (
  cleanup_candidates integer,
  with_chessa_id integer,
  with_pcc_id integer,
  oldest_created timestamptz,
  newest_created timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    count(*)::integer,
    count(*) filter (where preview.chess_sa_id is not null)::integer,
    count(*) filter (where preview.pcc_id is not null)::integer,
    min(preview.created_at),
    max(preview.created_at)
  from public.preview_player_centre_orphan_cleanup() preview;
end;
$$;

grant execute on function public.preview_player_centre_orphan_cleanup_summary()
to authenticated;

drop function if exists public.preview_player_centre_orphan_cleanup_sample(integer);

create function public.preview_player_centre_orphan_cleanup_sample(p_limit integer default 100)
returns table (
  full_name text,
  chess_sa_id text,
  pcc_id text,
  rating integer,
  club text,
  province text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  return query
  select
    preview.full_name,
    preview.chess_sa_id,
    preview.pcc_id,
    preview.rating,
    preview.club,
    preview.province,
    preview.created_at
  from public.preview_player_centre_orphan_cleanup() preview
  order by preview.created_at desc nulls last, preview.full_name
  limit greatest(1, least(coalesce(p_limit, 100), 500));
end;
$$;

grant execute on function public.preview_player_centre_orphan_cleanup_sample(integer)
to authenticated;

-- Preview first. Check the list before deleting.
select * from public.preview_player_centre_orphan_cleanup();

-- Optional audit: players with no linked player_id result, but a similar name
-- appears in an imported final ranking. These are not protected from cleanup
-- unless the final ranking is linked by player_id.
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
