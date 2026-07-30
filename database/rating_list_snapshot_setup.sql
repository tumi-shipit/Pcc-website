-- Rating list snapshots.
-- Run this once in Supabase SQL Editor after deploying the rating-list UI.
-- It makes tournaments lock to one uploaded rating file instead of drifting
-- whenever a newer Blitz/Rapid/Classical file is uploaded.

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

create table if not exists public.player_rating_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  rating_type text not null default 'standard',
  rating integer not null,
  rating_date date,
  source text,
  created_at timestamptz not null default now()
);

alter table public.player_rating_history
add column if not exists rating_import_id uuid references public.rating_imports(id) on delete set null;

alter table public.player_rating_history
drop constraint if exists player_rating_history_rating_type_check;

alter table public.player_rating_history
add constraint player_rating_history_rating_type_check
check (rating_type in ('standard', 'rapid', 'blitz', 'classical'));

create index if not exists player_rating_history_player_type_date_idx
on public.player_rating_history (
  player_id,
  rating_type,
  rating_date desc nulls last,
  created_at desc
);

create index if not exists player_rating_history_import_player_idx
on public.player_rating_history (rating_import_id, player_id);

alter table public.tournaments
add column if not exists rating_type text not null default 'standard';

alter table public.tournaments
drop constraint if exists tournaments_rating_type_check;

alter table public.tournaments
add constraint tournaments_rating_type_check
check (rating_type in ('standard', 'rapid', 'blitz'));

alter table public.tournaments
add column if not exists rating_import_id uuid references public.rating_imports(id) on delete set null;

alter table public.tournaments
add column if not exists rating_list_locked_at timestamptz;

create index if not exists tournaments_rating_type_idx
on public.tournaments (rating_type);

create index if not exists tournaments_rating_import_idx
on public.tournaments (rating_import_id);

alter table public.rating_imports enable row level security;
alter table public.player_rating_history enable row level security;

drop policy if exists "Public can read rating imports"
on public.rating_imports;

drop policy if exists "Admins can manage rating imports"
on public.rating_imports;

drop policy if exists "Public can read player rating history"
on public.player_rating_history;

drop policy if exists "Admins can manage player rating history"
on public.player_rating_history;

create policy "Public can read rating imports"
on public.rating_imports
for select
to anon, authenticated
using (true);

create policy "Admins can manage rating imports"
on public.rating_imports
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

create policy "Public can read player rating history"
on public.player_rating_history
for select
to anon, authenticated
using (true);

create policy "Admins can manage player rating history"
on public.player_rating_history
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

grant select on public.rating_imports to anon, authenticated;
grant insert, update, delete on public.rating_imports to authenticated;
grant select on public.player_rating_history to anon, authenticated;
grant insert, update, delete on public.player_rating_history to authenticated;
grant select (id, rating_type, rating_import_id, rating_list_locked_at)
on public.tournaments to anon, authenticated;
grant insert (rating_type, rating_import_id, rating_list_locked_at)
on public.tournaments to authenticated;
grant update (rating_type, rating_import_id, rating_list_locked_at)
on public.tournaments to authenticated;

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

create or replace function public.latest_rating_import_id(p_rating_type text)
returns uuid
language sql
stable
set search_path = public
as $$
  select rating_imports.id
  from public.rating_imports
  where public.normalized_rating_type(rating_imports.rating_type) = public.normalized_rating_type(p_rating_type)
    and rating_imports.import_status = 'Completed'
  order by rating_imports.imported_at desc, rating_imports.id desc
  limit 1
$$;

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
  clean_rating_type text := public.normalized_rating_type(p_rating_type);
  latest_import uuid;
  rating_value integer;
begin
  latest_import := public.latest_rating_import_id(clean_rating_type);

  if latest_import is not null then
    select history.rating::integer
    into rating_value
    from public.player_rating_history history
    where history.player_id = p_player_id
      and history.rating_import_id = latest_import
      and history.rating is not null
    order by history.created_at desc nulls last, history.id desc
    limit 1;
  end if;

  if rating_value is not null then
    return rating_value;
  end if;

  select history.rating::integer
  into rating_value
  from public.player_rating_history history
  where history.player_id = p_player_id
    and public.normalized_rating_type(history.rating_type) = clean_rating_type
    and history.rating is not null
  order by history.rating_date desc nulls last, history.created_at desc nulls last, history.id desc
  limit 1;

  if rating_value is not null then
    return rating_value;
  end if;

  if clean_rating_type = 'standard' then
    select players.rating::integer
    into rating_value
    from public.players
    where players.id = p_player_id;
  end if;

  return rating_value;
end;
$$;

grant execute on function public.latest_player_rating_by_type(uuid, text)
to anon, authenticated;

create or replace function public.player_rating_for_tournament(
  p_player_id uuid,
  p_tournament_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_record record;
  rating_value integer;
begin
  select rating_type, rating_import_id
  into tournament_record
  from public.tournaments
  where id = p_tournament_id;

  if not found then
    return null;
  end if;

  if tournament_record.rating_import_id is not null then
    select history.rating::integer
    into rating_value
    from public.player_rating_history history
    where history.player_id = p_player_id
      and history.rating_import_id = tournament_record.rating_import_id
      and history.rating is not null
    order by history.created_at desc nulls last, history.id desc
    limit 1;

    return rating_value;
  end if;

  return public.latest_player_rating_by_type(
    p_player_id,
    tournament_record.rating_type
  );
end;
$$;

grant execute on function public.player_rating_for_tournament(uuid, uuid)
to anon, authenticated;

create or replace function public.lock_tournament_to_latest_rating_import(
  p_tournament_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  tournament_record record;
  latest_import uuid;
begin
  if not public.has_admin_access() then
    raise exception 'Only PCC admins can lock tournament rating lists.';
  end if;

  select id, rating_type, registration_status
  into tournament_record
  from public.tournaments
  where id = p_tournament_id;

  if not found then
    raise exception 'Tournament was not found.';
  end if;

  if tournament_record.registration_status::text = 'Completed' then
    raise exception 'Completed tournaments cannot refresh rating lists.';
  end if;

  latest_import := public.latest_rating_import_id(tournament_record.rating_type);

  update public.tournaments
  set rating_import_id = latest_import,
      rating_list_locked_at = case when latest_import is null then null else now() end
  where id = p_tournament_id;

  return latest_import;
end;
$$;

grant execute on function public.lock_tournament_to_latest_rating_import(uuid)
to authenticated;

update public.tournaments tournaments
set rating_import_id = public.latest_rating_import_id(tournaments.rating_type),
    rating_list_locked_at = case
      when public.latest_rating_import_id(tournaments.rating_type) is null then null
      else coalesce(tournaments.rating_list_locked_at, now())
    end
where tournaments.rating_import_id is null
  and coalesce(tournaments.registration_status::text, 'Open') <> 'Completed'
  and public.latest_rating_import_id(tournaments.rating_type) is not null;

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
  effective_rating integer;
  section_error text;
  section_limit integer;
  active_section_entries integer;
  new_verification_status public.players.verification_status%type;
  new_payment_status public.registrations.payment_status%type;
  new_registration_status public.registrations.registration_status%type;
begin
  clean_name := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  clean_name_key := public.registration_name_key(clean_name);
  clean_pcc_id := nullif(upper(trim(coalesce(p_pcc_id, ''))), '');
  clean_chess_sa_id := nullif(trim(coalesce(p_chess_sa_id, '')), '');
  clean_email := lower(trim(coalesce(p_email, '')));
  clean_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  effective_rating := p_rating;

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
      and registration_status::text = 'Open'
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
    effective_rating := coalesce(
      public.player_rating_for_tournament(player_uuid, p_tournament_id),
      effective_rating
    );

    update public.players
    set full_name = coalesce(nullif(full_name, ''), clean_name),
        chess_sa_id = coalesce(nullif(chess_sa_id, ''), clean_chess_sa_id),
        date_of_birth = coalesce(date_of_birth, p_date_of_birth),
        gender = coalesce(nullif(gender, ''), nullif(trim(coalesce(p_gender, '')), '')),
        rating = case
          when public.normalized_rating_type((
            select tournaments.rating_type
            from public.tournaments
            where tournaments.id = p_tournament_id
          )) = 'standard' then coalesce(effective_rating, rating)
          else rating
        end,
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
      case
        when public.normalized_rating_type((
          select tournaments.rating_type
          from public.tournaments
          where tournaments.id = p_tournament_id
        )) = 'standard' then effective_rating
        else null
      end,
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

  section_error := public.registration_section_error(
    p_section_id,
    p_date_of_birth,
    p_gender,
    effective_rating
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
      and coalesce(registration_status::text, 'Pending') not in ('Rejected', 'Withdrawn');

    if active_section_entries >= section_limit then
      raise exception 'This section is already full.';
    end if;
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
  );
end;
$$;

grant execute on function public.submit_tournament_registration(
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
) to anon, authenticated;

notify pgrst, 'reload schema';
