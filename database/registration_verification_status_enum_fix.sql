-- Emergency live registration repair.
-- This script is self-contained. It does not depend on older helper functions
-- being present, and it avoids text-to-enum errors by using column-typed
-- status variables.

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

  clean_gender := lower(trim(coalesce(p_gender, '')));

  if section_record.gender_restriction is not null
    and section_record.gender_restriction <> ''
    and lower(section_record.gender_restriction) <> 'all'
    and clean_gender <> lower(section_record.gender_restriction) then
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
        '%s requires a Chess SA rating before choosing this section.',
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

drop function if exists public.submit_tournament_registration(
  text, text, text, date, text, integer, text, text, text, text, uuid, uuid, text, text
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
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  clean_name_key text := public.registration_name_key(coalesce(p_full_name, ''));
  clean_pcc_id text := nullif(upper(trim(coalesce(p_pcc_id, ''))), '');
  clean_chess_sa_id text := nullif(trim(coalesce(p_chess_sa_id, '')), '');
  clean_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  clean_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  player_uuid uuid;
  player_record public.players%rowtype;
  section_record public.tournament_sections%rowtype;
  tournament_section_count integer;
  active_registration_count integer;
  max_players integer;
  new_registration_id uuid;
  section_error text;
  new_verification_status public.players.verification_status%type;
  new_payment_status public.registrations.payment_status%type;
  new_registration_status public.registrations.registration_status%type;
begin
  if clean_name = '' then
    raise exception 'Player name is required.';
  end if;

  if clean_email is null or clean_phone = '' then
    raise exception 'Email and phone number are required.';
  end if;

  if p_tournament_id is null then
    raise exception 'Tournament is required.';
  end if;

  if not exists (
    select 1
    from public.tournaments
    where id = p_tournament_id
      and registration_status::text = 'Open'
  ) then
    raise exception 'This tournament is not open for registration.';
  end if;

  select count(*)
  into tournament_section_count
  from public.tournament_sections
  where tournament_id = p_tournament_id;

  if tournament_section_count > 0 and p_section_id is null then
    raise exception 'Section is required for this tournament.';
  end if;

  if p_section_id is not null then
    select *
    into section_record
    from public.tournament_sections
    where id = p_section_id
      and tournament_id = p_tournament_id;

    if not found then
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

    max_players := section_record.maximum_players;

    if max_players is not null then
      select count(*)
      into active_registration_count
      from public.registrations
      where section_id = p_section_id
        and coalesce(registration_status::text, 'Pending') not in ('Rejected', 'Withdrawn');

      if active_registration_count >= max_players then
        raise exception '% is full.', section_record.section_name;
      end if;
    end if;
  end if;

  if clean_pcc_id is not null then
    select *
    into player_record
    from public.players
    where upper(pcc_id) = clean_pcc_id
    limit 1;
  end if;

  if player_record.id is null and clean_chess_sa_id is not null then
    select *
    into player_record
    from public.players
    where chess_sa_id = clean_chess_sa_id
    limit 1;
  end if;

  if player_record.id is null then
    select *
    into player_record
    from public.players
    where p_date_of_birth is not null
      and date_of_birth = p_date_of_birth
      and public.registration_name_key(full_name) = clean_name_key
    order by case when chess_sa_id is not null and chess_sa_id <> '' then 0 else 1 end
    limit 1;

    if player_record.id is not null
      and player_record.chess_sa_id is not null
      and player_record.chess_sa_id <> ''
      and clean_chess_sa_id is null then
      raise exception 'This player appears to already have a Chess SA profile. Please search and register using the Chess SA profile instead of New Player.';
    end if;
  end if;

  if player_record.id is not null then
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
    if clean_chess_sa_id is null then
      new_verification_status := 'Pending';
    else
      new_verification_status := 'Verified';
    end if;

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
      new_verification_status,
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
      and coalesce(existing_registration.registration_status::text, 'Pending') not in ('Rejected', 'Withdrawn')
  ) then
    raise exception 'This player is already registered for this tournament.';
  end if;

  if exists (
    select 1
    from public.registrations existing_registration
    join public.players existing_player on existing_player.id = existing_registration.player_id
    where existing_registration.tournament_id = p_tournament_id
      and coalesce(existing_registration.registration_status::text, 'Pending') not in ('Rejected', 'Withdrawn')
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

  if p_payment_status = 'Proof Submitted' then
    new_payment_status := 'Proof Submitted';
  elsif p_payment_status = 'Paid' then
    new_payment_status := 'Paid';
  else
    new_payment_status := 'Pending';
  end if;

  new_registration_status := 'Pending';

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
    new_payment_status,
    nullif(trim(coalesce(p_proof_of_payment_url, '')), ''),
    new_registration_status,
    now(),
    now()
  )
  returning id into new_registration_id;

  return new_registration_id;
end;
$$;

grant execute on function public.registration_name_key(text) to anon, authenticated;
grant execute on function public.registration_section_error(uuid, date, text, integer) to anon, authenticated;
grant execute on function public.submit_tournament_registration(
  text, text, text, date, text, integer, text, text, text, text, uuid, uuid, text, text
) to anon, authenticated;
