create table if not exists public.player_merge_history (
  id uuid primary key default gen_random_uuid(),
  primary_player_id uuid not null references public.players(id) on delete cascade,
  duplicate_player_id uuid not null,
  duplicate_player_name text,
  reason text,
  merged_by uuid references auth.users(id) on delete set null,
  merged_at timestamptz not null default now()
);

create table if not exists public.player_duplicate_ignores (
  id uuid primary key default gen_random_uuid(),
  player_a uuid not null references public.players(id) on delete cascade,
  player_b uuid not null references public.players(id) on delete cascade,
  reason text,
  ignored_by uuid references auth.users(id) on delete set null,
  ignored_at timestamptz not null default now()
);

create unique index if not exists player_duplicate_ignores_pair_unique
on public.player_duplicate_ignores (
  least(player_a::text, player_b::text),
  greatest(player_a::text, player_b::text)
);

grant select, insert, delete on public.player_duplicate_ignores to authenticated;

alter table public.player_duplicate_ignores enable row level security;

drop policy if exists "Admins can read ignored duplicate pairs"
on public.player_duplicate_ignores;

create policy "Admins can read ignored duplicate pairs"
on public.player_duplicate_ignores
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert ignored duplicate pairs"
on public.player_duplicate_ignores;

create policy "Admins can insert ignored duplicate pairs"
on public.player_duplicate_ignores
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can delete ignored duplicate pairs"
on public.player_duplicate_ignores;

create policy "Admins can delete ignored duplicate pairs"
on public.player_duplicate_ignores
for delete
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

grant select, insert on public.player_merge_history to authenticated;

alter table public.player_merge_history enable row level security;

drop policy if exists "Admins can read player merge history"
on public.player_merge_history;

create policy "Admins can read player merge history"
on public.player_merge_history
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can insert player merge history"
on public.player_merge_history;

create policy "Admins can insert player merge history"
on public.player_merge_history
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

create or replace function public.merge_players(
  primary_player_id uuid,
  duplicate_player_id uuid,
  reason text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  duplicate_record public.players%rowtype;
begin
  if primary_player_id = duplicate_player_id then
    raise exception 'Primary and duplicate player cannot be the same.';
  end if;

  if not exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  ) then
    raise exception 'Only admins can merge players.';
  end if;

  select *
  into duplicate_record
  from public.players
  where id = duplicate_player_id;

  if not found then
    raise exception 'Duplicate player was not found.';
  end if;

  if not exists (select 1 from public.players where id = primary_player_id) then
    raise exception 'Primary player was not found.';
  end if;

  delete from public.registrations duplicate_registration
  using public.registrations primary_registration
  where duplicate_registration.player_id = duplicate_player_id
    and primary_registration.player_id = primary_player_id
    and duplicate_registration.tournament_id is not distinct from primary_registration.tournament_id;

  delete from public.tournament_results duplicate_result
  using public.tournament_results primary_result
  where duplicate_result.player_id = duplicate_player_id
    and primary_result.player_id = primary_player_id
    and duplicate_result.tournament_id is not distinct from primary_result.tournament_id
    and duplicate_result.section_id is not distinct from primary_result.section_id;

  delete from public.tournament_officials duplicate_official
  using public.tournament_officials primary_official
  where duplicate_official.player_id = duplicate_player_id
    and primary_official.player_id = primary_player_id
    and duplicate_official.tournament_id is not distinct from primary_official.tournament_id
    and duplicate_official.role is not distinct from primary_official.role;

  if to_regclass('public.tournament_organiser_access') is not null then
    delete from public.tournament_organiser_access duplicate_access
    using public.tournament_organiser_access primary_access
    where duplicate_access.player_id = duplicate_player_id
      and primary_access.player_id = primary_player_id
      and duplicate_access.tournament_id is not distinct from primary_access.tournament_id
      and duplicate_access.organiser_email is not distinct from primary_access.organiser_email
      and duplicate_access.role is not distinct from primary_access.role;
  end if;

  if to_regclass('public.player_achievements') is not null then
    delete from public.player_achievements duplicate_achievement
    using public.player_achievements primary_achievement
    where duplicate_achievement.player_id = duplicate_player_id
      and primary_achievement.player_id = primary_player_id
      and duplicate_achievement.tournament_id is not distinct from primary_achievement.tournament_id
      and duplicate_achievement.title is not distinct from primary_achievement.title
      and duplicate_achievement.achievement_type is not distinct from primary_achievement.achievement_type;
  end if;

  if to_regclass('public.player_news_tags') is not null then
    delete from public.player_news_tags duplicate_news_tag
    using public.player_news_tags primary_news_tag
    where duplicate_news_tag.player_id = duplicate_player_id
      and primary_news_tag.player_id = primary_player_id
      and duplicate_news_tag.news_post_id is not distinct from primary_news_tag.news_post_id;
  end if;

  update public.players primary_player
  set
    chess_sa_id = coalesce(primary_player.chess_sa_id, duplicate_record.chess_sa_id),
    fide_id = coalesce(primary_player.fide_id, duplicate_record.fide_id),
    date_of_birth = coalesce(primary_player.date_of_birth, duplicate_record.date_of_birth),
    gender = coalesce(primary_player.gender, duplicate_record.gender),
    email = coalesce(primary_player.email, duplicate_record.email),
    phone = coalesce(primary_player.phone, duplicate_record.phone),
    club = coalesce(primary_player.club, duplicate_record.club),
    province = coalesce(primary_player.province, duplicate_record.province),
    rating = coalesce(primary_player.rating, duplicate_record.rating),
    profile_photo_url = coalesce(primary_player.profile_photo_url, duplicate_record.profile_photo_url),
    biography = coalesce(primary_player.biography, duplicate_record.biography),
    title = coalesce(primary_player.title, duplicate_record.title),
    verification_status = case
      when primary_player.verification_status = 'Verified'
        or duplicate_record.verification_status = 'Verified'
      then 'Verified'
      else coalesce(primary_player.verification_status, duplicate_record.verification_status)
    end,
    updated_at = now()
  where primary_player.id = primary_player_id;

  update public.registrations
  set player_id = primary_player_id
  where player_id = duplicate_player_id;

  update public.tournament_results
  set player_id = primary_player_id
  where player_id = duplicate_player_id;

  update public.tournament_officials
  set player_id = primary_player_id
  where player_id = duplicate_player_id;

  update public.member_memberships
  set player_id = primary_player_id,
      chess_sa_id = coalesce(chess_sa_id, duplicate_record.chess_sa_id),
      updated_at = now()
  where player_id = duplicate_player_id
    or (
      duplicate_record.chess_sa_id is not null
      and chess_sa_id = duplicate_record.chess_sa_id
    );

  if to_regclass('public.tournament_organiser_access') is not null then
    update public.tournament_organiser_access
    set player_id = primary_player_id,
        chess_sa_id = coalesce(chess_sa_id, duplicate_record.chess_sa_id)
    where player_id = duplicate_player_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
    and table_name = 'tournaments'
    and column_name = 'arbiter_player_id'
  ) then
    update public.tournaments
    set arbiter_player_id = primary_player_id
    where arbiter_player_id = duplicate_player_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
    and table_name = 'tournaments'
    and column_name = 'organiser_player_id'
  ) then
    update public.tournaments
    set organiser_player_id = primary_player_id
    where organiser_player_id = duplicate_player_id;
  end if;

  if to_regclass('public.player_achievements') is not null then
    update public.player_achievements
    set player_id = primary_player_id
    where player_id = duplicate_player_id;
  end if;

  if to_regclass('public.player_news_tags') is not null then
    update public.player_news_tags
    set player_id = primary_player_id
    where player_id = duplicate_player_id;
  end if;

  if to_regclass('public.import_session_rows') is not null then
    update public.import_session_rows
    set matched_player_id = primary_player_id
    where matched_player_id = duplicate_player_id;
  end if;

  insert into public.player_merge_history (
    primary_player_id,
    duplicate_player_id,
    duplicate_player_name,
    reason,
    merged_by
  )
  values (
    primary_player_id,
    duplicate_player_id,
    duplicate_record.full_name,
    reason,
    auth.uid()
  );

  delete from public.players
  where id = duplicate_player_id;
end;
$$;

grant execute on function public.merge_players(uuid, uuid, text) to authenticated;

-- Run this only after current duplicate Chess SA IDs are merged.
-- create unique index if not exists players_chess_sa_id_unique
-- on public.players (chess_sa_id)
-- where chess_sa_id is not null and chess_sa_id <> '';
