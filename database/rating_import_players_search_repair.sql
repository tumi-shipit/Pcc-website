-- Rating-file player search repair.
-- Run this in Supabase SQL Editor after deploying the matching app code.
-- It keeps Chess SA rating imports out of Player Centre, but makes surname
-- search read the uploaded rating files.

create table if not exists public.rating_imports (
  id uuid primary key default gen_random_uuid(),
  rating_type text not null default 'standard',
  file_name text,
  source text,
  imported_by uuid default auth.uid(),
  imported_at timestamptz not null default now(),
  row_count integer not null default 0,
  imported_count integer not null default 0,
  failed_count integer not null default 0,
  import_status text not null default 'Importing'
);

alter table public.rating_imports
drop constraint if exists rating_imports_rating_type_check;

alter table public.rating_imports
add constraint rating_imports_rating_type_check
check (rating_type in ('standard', 'rapid', 'blitz', 'classical'));

alter table public.rating_imports
drop constraint if exists rating_imports_status_check;

alter table public.rating_imports
add constraint rating_imports_status_check
check (import_status in ('Importing', 'Completed', 'Failed'));

create index if not exists rating_imports_type_date_idx
on public.rating_imports (rating_type, imported_at desc);

create table if not exists public.rating_import_players (
  id uuid primary key default gen_random_uuid(),
  rating_import_id uuid not null references public.rating_imports(id) on delete cascade,
  rating_type text not null default 'standard',
  chess_sa_id text not null,
  full_name text not null,
  date_of_birth date,
  gender text,
  title text,
  federation text,
  rating integer,
  club text,
  province text,
  row_number integer,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.rating_import_players
drop constraint if exists rating_import_players_rating_type_check;

alter table public.rating_import_players
add constraint rating_import_players_rating_type_check
check (rating_type in ('standard', 'rapid', 'blitz', 'classical'));

create index if not exists rating_import_players_import_idx
on public.rating_import_players (rating_import_id);

create index if not exists rating_import_players_chess_sa_idx
on public.rating_import_players (chess_sa_id);

create index if not exists rating_import_players_import_chess_sa_idx
on public.rating_import_players (rating_import_id, chess_sa_id);

create index if not exists rating_import_players_name_idx
on public.rating_import_players (lower(full_name));

create extension if not exists pg_trgm with schema extensions;

create index if not exists rating_import_players_full_name_trgm_idx
on public.rating_import_players using gin (full_name gin_trgm_ops);

create index if not exists rating_imports_status_date_idx
on public.rating_imports (import_status, imported_at desc);

alter table public.rating_import_players enable row level security;

drop policy if exists "Public can read rating import players"
on public.rating_import_players;

drop policy if exists "Admins can manage rating import players"
on public.rating_import_players;

create policy "Public can read rating import players"
on public.rating_import_players
for select
to anon, authenticated
using (true);

create policy "Admins can manage rating import players"
on public.rating_import_players
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

grant select on public.rating_import_players to anon, authenticated;
grant insert, update, delete on public.rating_import_players to authenticated;

create or replace function public.normalized_rating_type(p_rating_type text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when lower(trim(coalesce(p_rating_type, 'standard'))) = 'classical' then 'standard'
    when lower(trim(coalesce(p_rating_type, 'standard'))) in ('rapid', 'blitz') then lower(trim(coalesce(p_rating_type, 'standard')))
    else 'standard'
  end
$$;

do $$
begin
  if to_regclass('public.player_rating_history') is not null then
    insert into public.rating_import_players (
      rating_import_id,
      rating_type,
      chess_sa_id,
      full_name,
      date_of_birth,
      gender,
      title,
      rating,
      club,
      province,
      raw_data
    )
    select distinct on (history.rating_import_id, players.chess_sa_id)
      history.rating_import_id,
      history.rating_type,
      players.chess_sa_id,
      players.full_name,
      players.date_of_birth,
      players.gender,
      players.title,
      history.rating,
      players.club,
      players.province,
      jsonb_build_object('backfilled_from', 'player_rating_history')
    from public.player_rating_history history
    join public.rating_imports imports
      on imports.id = history.rating_import_id
    join public.players players
      on players.id = history.player_id
    where imports.import_status = 'Completed'
      and history.rating_import_id is not null
      and players.chess_sa_id is not null
      and players.chess_sa_id <> ''
      and not exists (
        select 1
        from public.rating_import_players existing
        where existing.rating_import_id = history.rating_import_id
          and existing.chess_sa_id = players.chess_sa_id
      )
    order by
      history.rating_import_id,
      players.chess_sa_id,
      history.created_at desc nulls last,
      history.id desc;
  end if;
end;
$$;

create or replace function public.find_rating_file_player_for_registration(
  p_search_method text,
  p_search_value text,
  p_birth_date date default null
)
returns table (
  pcc_id text,
  chess_sa_id text,
  full_name text,
  date_of_birth date,
  gender text,
  title text,
  federation text,
  standard_rating integer,
  rapid_rating integer,
  blitz_rating integer,
  email text,
  phone text,
  club text,
  province text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_method text := lower(trim(coalesce(p_search_method, '')));
  clean_value text := trim(coalesce(p_search_value, ''));
  clean_id text := regexp_replace(clean_value, '\D', '', 'g');
  search_pattern text := '%' || replace(clean_value, ',', ' ') || '%';
begin
  if clean_value = '' then
    return;
  end if;

  return query
  with completed_rows as (
    select
      rating_players.*,
      public.normalized_rating_type(rating_players.rating_type) as clean_rating_type,
      imports.imported_at
    from public.rating_import_players rating_players
    join public.rating_imports imports
      on imports.id = rating_players.rating_import_id
    where imports.import_status = 'Completed'
      and rating_players.chess_sa_id is not null
      and rating_players.chess_sa_id <> ''
  ),
  matched_ids as (
    select distinct completed_rows.chess_sa_id
    from completed_rows
    where (
        clean_method in ('chesssa', 'chessa', 'chess_sa_id', 'chess_sa')
        and (
          regexp_replace(coalesce(completed_rows.chess_sa_id, ''), '\D', '', 'g') = clean_id
          or completed_rows.chess_sa_id = clean_value
        )
      )
      or (
        clean_method in ('name', 'surname', 'surname_only', 'name_only')
        and (
          lower(completed_rows.full_name) like lower(clean_value) || '%'
          or lower(completed_rows.full_name) like '% ' || lower(clean_value) || '%'
        )
        and (
          clean_method in ('surname_only', 'name_only')
          or p_birth_date is null
          or completed_rows.date_of_birth is null
          or completed_rows.date_of_birth = p_birth_date
        )
      )
  ),
  candidates as (
    select distinct on (completed_rows.chess_sa_id)
      completed_rows.chess_sa_id,
      completed_rows.full_name,
      completed_rows.date_of_birth,
      completed_rows.gender,
      completed_rows.title,
      completed_rows.federation,
      completed_rows.club,
      completed_rows.province,
      completed_rows.imported_at
    from completed_rows
    join matched_ids
      on matched_ids.chess_sa_id = completed_rows.chess_sa_id
    order by
      completed_rows.chess_sa_id,
      completed_rows.imported_at desc nulls last,
      completed_rows.created_at desc nulls last,
      completed_rows.id desc
  )
  select
    null::text as pcc_id,
    candidates.chess_sa_id,
    candidates.full_name,
    candidates.date_of_birth,
    candidates.gender,
    candidates.title,
    coalesce(candidates.federation, candidates.province) as federation,
    (
      select completed_rows.rating::integer
      from completed_rows
      where completed_rows.chess_sa_id = candidates.chess_sa_id
        and completed_rows.clean_rating_type = 'standard'
      order by completed_rows.imported_at desc nulls last, completed_rows.created_at desc nulls last, completed_rows.id desc
      limit 1
    ) as standard_rating,
    (
      select completed_rows.rating::integer
      from completed_rows
      where completed_rows.chess_sa_id = candidates.chess_sa_id
        and completed_rows.clean_rating_type = 'rapid'
      order by completed_rows.imported_at desc nulls last, completed_rows.created_at desc nulls last, completed_rows.id desc
      limit 1
    ) as rapid_rating,
    (
      select completed_rows.rating::integer
      from completed_rows
      where completed_rows.chess_sa_id = candidates.chess_sa_id
        and completed_rows.clean_rating_type = 'blitz'
      order by completed_rows.imported_at desc nulls last, completed_rows.created_at desc nulls last, completed_rows.id desc
      limit 1
    ) as blitz_rating,
    null::text as email,
    null::text as phone,
    candidates.club,
    candidates.province
  from candidates
  order by
    candidates.imported_at desc nulls last,
    candidates.full_name
  limit 40;
end;
$$;

grant execute on function public.find_rating_file_player_for_registration(text, text, date)
to anon, authenticated;

create or replace function public.find_rating_file_player_for_registration(
  p_search_method text,
  p_search_value text,
  p_birth_date date default null
)
returns table (
  pcc_id text,
  chess_sa_id text,
  full_name text,
  date_of_birth date,
  gender text,
  title text,
  federation text,
  standard_rating integer,
  rapid_rating integer,
  blitz_rating integer,
  email text,
  phone text,
  club text,
  province text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_method text := lower(trim(coalesce(p_search_method, '')));
  clean_value text := trim(coalesce(p_search_value, ''));
  clean_id text := regexp_replace(clean_value, '\D', '', 'g');
  search_pattern text := '%' || replace(clean_value, ',', ' ') || '%';
begin
  if clean_value = '' then
    return;
  end if;

  return query
  with matched_rows as (
    select
      rating_players.chess_sa_id,
      rating_players.full_name,
      rating_players.date_of_birth,
      rating_players.gender,
      rating_players.title,
      rating_players.federation,
      rating_players.club,
      rating_players.province,
      imports.imported_at,
      rating_players.created_at,
      rating_players.id,
      row_number() over (
        partition by rating_players.chess_sa_id
        order by imports.imported_at desc nulls last,
          rating_players.created_at desc nulls last,
          rating_players.id desc
      ) as identity_rank
    from public.rating_import_players rating_players
    join public.rating_imports imports
      on imports.id = rating_players.rating_import_id
    where imports.import_status = 'Completed'
      and rating_players.chess_sa_id is not null
      and rating_players.chess_sa_id <> ''
      and (
        (
          clean_method in ('chesssa', 'chessa', 'chess_sa_id', 'chess_sa')
          and (
            regexp_replace(coalesce(rating_players.chess_sa_id, ''), '\D', '', 'g') = clean_id
            or rating_players.chess_sa_id = clean_value
          )
        )
        or (
          clean_method in ('name', 'surname', 'surname_only', 'name_only')
          and (
            lower(rating_players.full_name) like lower(clean_value) || '%'
            or lower(rating_players.full_name) like '% ' || lower(clean_value) || '%'
          )
          and (
            clean_method in ('surname_only', 'name_only')
            or p_birth_date is null
            or rating_players.date_of_birth is null
            or rating_players.date_of_birth = p_birth_date
          )
        )
      )
    order by imports.imported_at desc nulls last,
      rating_players.created_at desc nulls last,
      rating_players.full_name
    limit 400
  ),
  candidates as (
    select *
    from matched_rows
    where identity_rank = 1
    order by imported_at desc nulls last, full_name
    limit 40
  )
  select
    null::text as pcc_id,
    candidates.chess_sa_id,
    candidates.full_name,
    candidates.date_of_birth,
    candidates.gender,
    candidates.title,
    coalesce(candidates.federation, candidates.province) as federation,
    (
      select rating_players.rating::integer
      from public.rating_import_players rating_players
      join public.rating_imports imports
        on imports.id = rating_players.rating_import_id
      where imports.import_status = 'Completed'
        and rating_players.chess_sa_id = candidates.chess_sa_id
        and public.normalized_rating_type(rating_players.rating_type) = 'standard'
      order by imports.imported_at desc nulls last,
        rating_players.created_at desc nulls last,
        rating_players.id desc
      limit 1
    ) as standard_rating,
    (
      select rating_players.rating::integer
      from public.rating_import_players rating_players
      join public.rating_imports imports
        on imports.id = rating_players.rating_import_id
      where imports.import_status = 'Completed'
        and rating_players.chess_sa_id = candidates.chess_sa_id
        and public.normalized_rating_type(rating_players.rating_type) = 'rapid'
      order by imports.imported_at desc nulls last,
        rating_players.created_at desc nulls last,
        rating_players.id desc
      limit 1
    ) as rapid_rating,
    (
      select rating_players.rating::integer
      from public.rating_import_players rating_players
      join public.rating_imports imports
        on imports.id = rating_players.rating_import_id
      where imports.import_status = 'Completed'
        and rating_players.chess_sa_id = candidates.chess_sa_id
        and public.normalized_rating_type(rating_players.rating_type) = 'blitz'
      order by imports.imported_at desc nulls last,
        rating_players.created_at desc nulls last,
        rating_players.id desc
      limit 1
    ) as blitz_rating,
    null::text as email,
    null::text as phone,
    candidates.club,
    candidates.province
  from candidates
  order by candidates.imported_at desc nulls last, candidates.full_name;
end;
$$;

grant execute on function public.find_rating_file_player_for_registration(text, text, date)
to anon, authenticated;

notify pgrst, 'reload schema';
