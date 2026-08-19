create table if not exists public.player_aliases (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  alias_type text not null check (
    alias_type in ('name', 'pcc_id', 'chess_sa_id', 'fide_id')
  ),
  alias_value text not null,
  normalized_alias text not null,
  source_player_id uuid,
  merge_history_id uuid references public.player_merge_history(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists player_aliases_unique
on public.player_aliases (player_id, alias_type, normalized_alias);

create index if not exists player_aliases_player_idx
on public.player_aliases (player_id);

create index if not exists player_aliases_normalized_idx
on public.player_aliases (normalized_alias);

alter table public.player_aliases enable row level security;

grant select on public.player_aliases to anon, authenticated;
grant insert, update, delete on public.player_aliases to authenticated;

drop policy if exists "Public can read player aliases"
on public.player_aliases;

create policy "Public can read player aliases"
on public.player_aliases
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage player aliases"
on public.player_aliases;

create policy "Admins can manage player aliases"
on public.player_aliases
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

create or replace function public.player_alias_normalized(value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(lower(trim(coalesce(value, ''))), '[^a-z0-9]+', '', 'g');
$$;

grant execute on function public.player_alias_normalized(text) to anon, authenticated;

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
  merge_history_id uuid;
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
  )
  returning id into merge_history_id;

  insert into public.player_aliases (
    player_id,
    alias_type,
    alias_value,
    normalized_alias,
    source_player_id,
    merge_history_id,
    created_by
  )
  select
    primary_player_id,
    alias_values.alias_type,
    alias_values.alias_value,
    public.player_alias_normalized(alias_values.alias_value),
    duplicate_player_id,
    merge_history_id,
    auth.uid()
  from (
    values
      ('name', duplicate_record.full_name),
      ('pcc_id', duplicate_record.pcc_id),
      ('chess_sa_id', duplicate_record.chess_sa_id),
      ('fide_id', duplicate_record.fide_id)
  ) as alias_values(alias_type, alias_value)
  where nullif(trim(alias_values.alias_value), '') is not null
    and public.player_alias_normalized(alias_values.alias_value) <> ''
  on conflict (player_id, alias_type, normalized_alias) do nothing;

  insert into public.player_aliases (
    player_id,
    alias_type,
    alias_value,
    normalized_alias,
    source_player_id,
    merge_history_id,
    created_by
  )
  select
    primary_player_id,
    aliases.alias_type,
    aliases.alias_value,
    aliases.normalized_alias,
    coalesce(aliases.source_player_id, duplicate_player_id),
    coalesce(aliases.merge_history_id, merge_history_id),
    coalesce(aliases.created_by, auth.uid())
  from public.player_aliases aliases
  where aliases.player_id = duplicate_player_id
  on conflict (player_id, alias_type, normalized_alias) do nothing;

  delete from public.player_aliases
  where player_id = duplicate_player_id;

  delete from public.players
  where id = duplicate_player_id;
end;
$$;

grant execute on function public.merge_players(uuid, uuid, text) to authenticated;

create or replace function public.find_pcc_player_for_registration(
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
  search_pattern text := '%' || replace(trim(coalesce(p_search_value, '')), ',', ' ') || '%';
  normalized_search text := public.player_alias_normalized(p_search_value);
begin
  if clean_value = '' then
    return;
  end if;

  if clean_method in ('pccid', 'pcc_id', 'pcc') then
    return query
    select
      players.pcc_id,
      players.chess_sa_id,
      players.full_name,
      players.date_of_birth,
      players.gender,
      players.title,
      players.province as federation,
      public.latest_player_rating_by_type(players.id, 'standard') as standard_rating,
      public.latest_player_rating_by_type(players.id, 'rapid') as rapid_rating,
      public.latest_player_rating_by_type(players.id, 'blitz') as blitz_rating,
      players.email,
      players.phone,
      players.club,
      players.province
    from public.players
    where upper(players.pcc_id) = upper(clean_value)
      or exists (
        select 1
        from public.player_aliases aliases
        where aliases.player_id = players.id
          and aliases.alias_type = 'pcc_id'
          and aliases.normalized_alias = normalized_search
      )
    order by case when upper(players.pcc_id) = upper(clean_value) then 0 else 1 end
    limit 1;

    return;
  end if;

  if clean_method in ('name', 'surname', 'surname_only', 'name_only') then
    return query
    select
      players.pcc_id,
      players.chess_sa_id,
      players.full_name,
      players.date_of_birth,
      players.gender,
      players.title,
      players.province as federation,
      public.latest_player_rating_by_type(players.id, 'standard') as standard_rating,
      public.latest_player_rating_by_type(players.id, 'rapid') as rapid_rating,
      public.latest_player_rating_by_type(players.id, 'blitz') as blitz_rating,
      players.email,
      players.phone,
      players.club,
      players.province
    from public.players
    where (
        clean_method in ('surname_only', 'name_only')
        or public.player_has_pcc_activity(players.id)
      )
      and (
        players.full_name ilike search_pattern
        or public.registration_name_key(players.full_name) ilike public.registration_name_key(clean_value) || '%'
        or exists (
          select 1
          from public.player_aliases aliases
          where aliases.player_id = players.id
            and aliases.alias_type in ('name', 'chess_sa_id', 'fide_id', 'pcc_id')
            and (
              aliases.alias_value ilike search_pattern
              or aliases.normalized_alias like normalized_search || '%'
            )
        )
      )
      and (
        clean_method in ('surname_only', 'name_only')
        or p_birth_date is null
        or players.date_of_birth is null
        or players.date_of_birth = p_birth_date
      )
    order by
      case when p_birth_date is not null and players.date_of_birth = p_birth_date then 0 else 1 end,
      case when players.chess_sa_id is not null and players.chess_sa_id <> '' then 0 else 1 end,
      players.full_name
    limit 30;

    return;
  end if;
end;
$$;

grant execute on function public.find_pcc_player_for_registration(text, text, date)
to anon, authenticated;
