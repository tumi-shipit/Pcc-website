-- Tournament rating type setup
-- Run this once in Supabase SQL Editor before relying on Rapid/Blitz event ratings.

alter table public.tournaments
add column if not exists rating_type text not null default 'standard';

alter table public.tournaments
drop constraint if exists tournaments_rating_type_check;

alter table public.tournaments
add constraint tournaments_rating_type_check
check (rating_type in ('standard', 'rapid', 'blitz'));

create index if not exists tournaments_rating_type_idx
on public.tournaments (rating_type);

create or replace function public.latest_player_rating_by_type(
  p_player_id uuid,
  p_rating_type text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_rating_type text := lower(trim(coalesce(p_rating_type, 'standard')));
  rating_value integer;
  order_clause text := '';
begin
  if clean_rating_type = 'classical' then
    clean_rating_type := 'standard';
  end if;

  if clean_rating_type not in ('standard', 'rapid', 'blitz') then
    clean_rating_type := 'standard';
  end if;

  if to_regclass('public.player_rating_history') is not null then
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'player_rating_history'
        and column_name = 'rating_date'
    ) then
      order_clause := 'rating_date desc nulls last';
    end if;

    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'player_rating_history'
        and column_name = 'created_at'
    ) then
      order_clause := case
        when order_clause = '' then 'created_at desc nulls last'
        else order_clause || ', created_at desc nulls last'
      end;
    end if;

    if order_clause = '' then
      order_clause := 'rating desc nulls last';
    end if;

    execute format(
      $query$
        select rating::integer
        from public.player_rating_history
        where player_id = $1
          and rating is not null
          and case
            when lower(coalesce(rating_type, '')) in ('standard', 'classical') then 'standard'
            when lower(coalesce(rating_type, '')) like '%%rapid%%' then 'rapid'
            when lower(coalesce(rating_type, '')) like '%%blitz%%' then 'blitz'
            else lower(coalesce(rating_type, 'standard'))
          end = $2
        order by %s
        limit 1
      $query$,
      order_clause
    )
    into rating_value
    using p_player_id, clean_rating_type;
  end if;

  if rating_value is not null then
    return rating_value;
  end if;

  if clean_rating_type = 'standard' then
    select players.rating::integer
    into rating_value
    from public.players
    where players.id = p_player_id;

    return rating_value;
  end if;

  return null;
end;
$$;

grant execute on function public.latest_player_rating_by_type(uuid, text)
to anon, authenticated;

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
    limit 1;

    return;
  end if;

  if clean_method in ('name', 'surname') then
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
    where public.player_has_pcc_activity(players.id)
      and (
        players.full_name ilike search_pattern
        or public.registration_name_key(players.full_name) ilike public.registration_name_key(clean_value) || '%'
      )
      and (
        p_birth_date is null
        or players.date_of_birth is null
        or players.date_of_birth = p_birth_date
      )
    order by
      case when players.date_of_birth = p_birth_date then 0 else 1 end,
      case when players.chess_sa_id is not null and players.chess_sa_id <> '' then 0 else 1 end,
      players.full_name
    limit 20;

    return;
  end if;
end;
$$;

grant execute on function public.find_pcc_player_for_registration(text, text, date)
to anon, authenticated;
