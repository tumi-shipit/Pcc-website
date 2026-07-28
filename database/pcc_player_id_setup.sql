-- PCC player IDs and registration lookup.
-- Run this in Supabase SQL Editor before deploying UI that selects pcc_id.

create sequence if not exists public.players_pcc_id_seq;

alter table public.players
add column if not exists pcc_id text;

create or replace function public.registration_name_key(p_name text)
returns text
language sql
immutable
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

create or replace function public.next_pcc_id()
returns text
language plpgsql
as $$
declare
  next_number bigint;
  next_id text;
begin
  loop
    next_number := nextval('public.players_pcc_id_seq');
    next_id := 'PCC-' || lpad(next_number::text, 6, '0');

    if not exists (
      select 1
      from public.players
      where pcc_id = next_id
    ) then
      return next_id;
    end if;
  end loop;
end;
$$;

alter table public.players
alter column pcc_id set default public.next_pcc_id();

update public.players
set pcc_id = public.next_pcc_id()
where pcc_id is null or pcc_id = '';

create unique index if not exists players_pcc_id_unique_idx
on public.players (pcc_id)
where pcc_id is not null and pcc_id <> '';

select setval(
  'public.players_pcc_id_seq',
  greatest(
    coalesce(
      (
        select max(nullif(regexp_replace(pcc_id, '[^0-9]', '', 'g'), '')::bigint)
        from public.players
      ),
      0
    ),
    1
  ),
  true
);

create or replace function public.player_has_pcc_activity(p_player_id uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.registrations
    where player_id = p_player_id
  )
  or exists (
    select 1
    from public.tournament_results
    where player_id = p_player_id
  )
$$;

create or replace function public.registration_section_error(
  p_section_id uuid,
  p_date_of_birth date,
  p_gender text,
  p_rating integer
)
returns text
language plpgsql
stable
as $$
declare
  section_record record;
  player_birth_year integer;
  clean_gender text;
begin
  select
    section_name,
    minimum_birth_year,
    maximum_birth_year,
    minimum_rating,
    maximum_rating,
    gender_restriction
  into section_record
  from public.tournament_sections
  where id = p_section_id;

  if not found then
    return 'Tournament section was not found.';
  end if;

  if section_record.minimum_birth_year is not null
    or section_record.maximum_birth_year is not null then
    if p_date_of_birth is null then
      return 'Date of birth is required for this section.';
    end if;

    player_birth_year := extract(year from p_date_of_birth)::integer;

    if section_record.minimum_birth_year is not null
      and player_birth_year < section_record.minimum_birth_year then
      return format(
        'This player is not eligible for %s. This section is for players born %s or later.',
        section_record.section_name,
        section_record.minimum_birth_year
      );
    end if;

    if section_record.maximum_birth_year is not null
      and player_birth_year > section_record.maximum_birth_year then
      return format(
        'This player is not eligible for %s. This section is for players born %s or earlier.',
        section_record.section_name,
        section_record.maximum_birth_year
      );
    end if;
  end if;

  clean_gender := nullif(trim(coalesce(p_gender, '')), '');

  if section_record.gender_restriction is not null
    and section_record.gender_restriction <> ''
    and section_record.gender_restriction <> 'All'
    and clean_gender is distinct from section_record.gender_restriction then
    return format(
      '%s is restricted to %s players.',
      section_record.section_name,
      section_record.gender_restriction
    );
  end if;

  if section_record.minimum_rating is not null
    or section_record.maximum_rating is not null then
    if p_rating is null then
      return format(
        '%s requires a rating before choosing this section.',
        section_record.section_name
      );
    end if;

    if section_record.minimum_rating is not null
      and p_rating < section_record.minimum_rating then
      return format(
        'This player is not eligible for %s. This section is for players rated %s or higher.',
        section_record.section_name,
        section_record.minimum_rating
      );
    end if;

    if section_record.maximum_rating is not null
      and p_rating > section_record.maximum_rating then
      return format(
        'This player is not eligible for %s. This section is for players rated %s or below.',
        section_record.section_name,
        section_record.maximum_rating
      );
    end if;
  end if;

  return null;
end;
$$;

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
      players.rating as standard_rating,
      null::integer as rapid_rating,
      null::integer as blitz_rating,
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
      players.rating as standard_rating,
      null::integer as rapid_rating,
      null::integer as blitz_rating,
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

grant execute on function public.registration_name_key(text) to anon, authenticated;
grant execute on function public.registration_section_error(uuid, date, text, integer) to anon, authenticated;

drop function if exists public.submit_tournament_registration(
  text,
  text,
  text,
  date,
  text,
  integer,
  text,
  text,
  text,
  text,
  uuid,
  uuid,
  text,
  text
);

create or replace function public.submit_tournament_registration(
  p_full_name text,
  p_pcc_id text,
  p_chess_sa_id text,
  p_date_of_birth date,
  p_gender text,
  p_rating integer,
  p_email text,
  p_phone text,
  p_club text,
  p_province text,
  p_tournament_id uuid,
  p_section_id uuid,
  p_payment_status text,
  p_proof_of_payment_url text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
  clean_name_key text;
  clean_pcc_id text;
  clean_chess_sa_id text;
  clean_email text;
  clean_phone text;
  player_record record;
  player_uuid uuid;
  section_error text;
  section_limit integer;
  active_section_entries integer;
begin
  clean_name := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  clean_name_key := public.registration_name_key(clean_name);
  clean_pcc_id := nullif(upper(trim(coalesce(p_pcc_id, ''))), '');
  clean_chess_sa_id := nullif(trim(coalesce(p_chess_sa_id, '')), '');
  clean_email := lower(trim(coalesce(p_email, '')));
  clean_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

  if clean_name = '' then
    raise exception 'Player name is required.';
  end if;

  if clean_email = '' or clean_phone = '' then
    raise exception 'Email and phone number are required.';
  end if;

  if p_tournament_id is null or p_section_id is null then
    raise exception 'Tournament and section are required.';
  end if;

  if not exists (
    select 1
    from public.tournaments
    where id = p_tournament_id
      and registration_status = 'Open'
  ) then
    raise exception 'This tournament is not open for registration.';
  end if;

  if not exists (
    select 1
    from public.tournament_sections
    where id = p_section_id
      and tournament_id = p_tournament_id
  ) then
    raise exception 'Selected section does not belong to this tournament.';
  end if;

  section_error := public.registration_section_error(
    p_section_id,
    p_date_of_birth,
    p_gender,
    p_rating
  );

  if section_error is not null then
    raise exception '%', section_error;
  end if;

  select maximum_players
  into section_limit
  from public.tournament_sections
  where id = p_section_id;

  if section_limit is not null then
    select count(*)
    into active_section_entries
    from public.registrations
    where section_id = p_section_id
      and coalesce(registration_status, 'Pending') not in ('Rejected', 'Withdrawn');

    if active_section_entries >= section_limit then
      raise exception 'This section is already full.';
    end if;
  end if;

  if clean_pcc_id is not null then
    select *
    into player_record
    from public.players
    where upper(pcc_id) = clean_pcc_id
    limit 1;

    if not found then
      raise exception 'PCC ID was not found. Please check the PCC ID or search by name.';
    end if;
  elsif clean_chess_sa_id is not null then
    select *
    into player_record
    from public.players
    where chess_sa_id = clean_chess_sa_id
    limit 1;
  else
    select *
    into player_record
    from public.players
    where p_date_of_birth is not null
      and date_of_birth = p_date_of_birth
      and public.registration_name_key(full_name) = clean_name_key
    order by case when chess_sa_id is not null and chess_sa_id <> '' then 0 else 1 end
    limit 1;

    if found and player_record.chess_sa_id is not null and player_record.chess_sa_id <> '' then
      raise exception 'This player appears to already have a Chess SA profile. Please search and register using the Chess SA profile instead of New Player.';
    end if;
  end if;

  if found then
    player_uuid := player_record.id;

    update public.players
    set full_name = coalesce(nullif(full_name, ''), clean_name),
        chess_sa_id = coalesce(nullif(chess_sa_id, ''), clean_chess_sa_id),
        date_of_birth = coalesce(date_of_birth, p_date_of_birth),
        gender = coalesce(nullif(gender, ''), nullif(trim(coalesce(p_gender, '')), '')),
        rating = coalesce(p_rating, rating),
        email = coalesce(nullif(email, ''), clean_email),
        phone = coalesce(nullif(phone, ''), p_phone),
        club = coalesce(nullif(trim(coalesce(p_club, '')), ''), club),
        province = coalesce(nullif(trim(coalesce(p_province, '')), ''), province),
        updated_at = now()
    where id = player_uuid;
  else
    insert into public.players (
      full_name,
      chess_sa_id,
      date_of_birth,
      gender,
      rating,
      email,
      phone,
      club,
      province,
      verification_status,
      created_at,
      updated_at
    )
    values (
      clean_name,
      clean_chess_sa_id,
      p_date_of_birth,
      nullif(trim(coalesce(p_gender, '')), ''),
      p_rating,
      clean_email,
      p_phone,
      nullif(trim(coalesce(p_club, '')), ''),
      nullif(trim(coalesce(p_province, '')), ''),
      case when clean_chess_sa_id is null then 'Pending' else 'Verified' end,
      now(),
      now()
    )
    returning id into player_uuid;
  end if;

  if exists (
    select 1
    from public.registrations existing_registration
    where existing_registration.tournament_id = p_tournament_id
      and existing_registration.player_id = player_uuid
      and coalesce(existing_registration.registration_status, 'Pending') not in ('Rejected', 'Withdrawn')
  ) then
    raise exception 'This player is already registered for this tournament.';
  end if;

  if exists (
    select 1
    from public.registrations existing_registration
    join public.players existing_player on existing_player.id = existing_registration.player_id
    where existing_registration.tournament_id = p_tournament_id
      and coalesce(existing_registration.registration_status, 'Pending') not in ('Rejected', 'Withdrawn')
      and (
        (
          p_date_of_birth is not null
          and existing_player.date_of_birth = p_date_of_birth
          and public.registration_name_key(existing_player.full_name) = clean_name_key
        )
        or (
          public.registration_name_key(existing_player.full_name) = clean_name_key
          and (
            lower(coalesce(existing_player.email, '')) = clean_email
            or regexp_replace(coalesce(existing_player.phone, ''), '\D', '', 'g') = clean_phone
          )
        )
      )
  ) then
    raise exception 'A matching registration already exists for this tournament. Please contact the organiser if this entry needs changes.';
  end if;

  insert into public.registrations (
    player_id,
    tournament_id,
    section_id,
    payment_status,
    proof_of_payment_url,
    registration_status,
    created_at,
    updated_at
  )
  values (
    player_uuid,
    p_tournament_id,
    p_section_id,
    case
      when p_payment_status in ('Proof Submitted', 'Paid') then p_payment_status
      else 'Pending'
    end,
    nullif(trim(coalesce(p_proof_of_payment_url, '')), ''),
    'Pending',
    now(),
    now()
  );
end;
$$;

grant execute on function public.submit_tournament_registration(text, text, text, date, text, integer, text, text, text, text, uuid, uuid, text, text)
to anon, authenticated;
