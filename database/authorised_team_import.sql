-- Authorised selected-team import for a closed or completed tournament.
-- This does not reopen public registration and can only be run by a PCC super admin.
-- It intentionally leaves player email and phone blank when a source team list
-- does not contain each player's own contact details.
begin;

alter table public.players add column if not exists first_names text;
alter table public.players add column if not exists surname text;

create or replace function public.import_authorised_team_entry(
  p_full_name text,
  p_first_names text,
  p_surname text,
  p_date_of_birth date,
  p_gender text,
  p_club text,
  p_province text,
  p_tournament_id uuid,
  p_section_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_full_name text := regexp_replace(trim(coalesce(p_full_name, '')), '\s+', ' ', 'g');
  clean_first_names text := regexp_replace(trim(coalesce(p_first_names, '')), '\s+', ' ', 'g');
  clean_surname text := regexp_replace(trim(coalesce(p_surname, '')), '\s+', ' ', 'g');
  clean_province text := nullif(regexp_replace(trim(coalesce(p_province, '')), '\s+', ' ', 'g'), '');
  selected_tournament public.tournaments%rowtype;
  selected_section public.tournament_sections%rowtype;
  player_record public.players%rowtype;
  registration_id uuid;
  section_error text;
  active_entries integer;
begin
  if not coalesce(public.is_super_admin(), false) then
    raise exception 'Only the PCC super admin can import an authorised team.' using errcode = '42501';
  end if;

  if clean_full_name = '' or clean_first_names = '' or clean_surname = ''
    or p_date_of_birth is null or clean_province is null then
    raise exception 'Full name, first names, surname, date of birth and province are required.';
  end if;

  if clean_full_name <> regexp_replace(clean_first_names || ' ' || clean_surname, '\s+', ' ', 'g') then
    raise exception 'First names and surname must match the full name.';
  end if;

  select * into selected_tournament
  from public.tournaments
  where id = p_tournament_id
  for share;

  if not found then
    raise exception 'Tournament not found.';
  end if;

  if selected_tournament.registration_status::text not in ('Closed', 'Completed') then
    raise exception 'This authorised import is only for closed or completed tournaments.';
  end if;

  select * into selected_section
  from public.tournament_sections
  where id = p_section_id and tournament_id = p_tournament_id
  for share;

  if not found then
    raise exception 'Selected section does not belong to this tournament.';
  end if;

  section_error := public.registration_section_error(
    p_section_id,
    p_date_of_birth,
    p_gender,
    null
  );
  if section_error is not null then
    raise exception '%', section_error;
  end if;

  if selected_section.maximum_players is not null then
    select count(*) into active_entries
    from public.registrations
    where section_id = p_section_id
      and coalesce(registration_status::text, 'Pending') not in ('Rejected', 'Withdrawn');
    if active_entries >= selected_section.maximum_players then
      raise exception '% is full.', selected_section.section_name;
    end if;
  end if;

  select * into player_record
  from public.players
  where date_of_birth = p_date_of_birth
    and public.registration_name_key(full_name) = public.registration_name_key(clean_full_name)
  order by case when nullif(trim(coalesce(chess_sa_id, '')), '') is not null then 0 else 1 end,
    created_at asc
  limit 1
  for update;

  if player_record.id is null then
    insert into public.players (
      full_name, first_names, surname, date_of_birth, gender, club, province,
      verification_status, created_at, updated_at
    ) values (
      clean_full_name, clean_first_names, clean_surname, p_date_of_birth,
      nullif(trim(coalesce(p_gender, '')), ''), nullif(trim(coalesce(p_club, '')), ''), clean_province,
      'Pending', now(), now()
    ) returning * into player_record;
  else
    update public.players
    set first_names = coalesce(nullif(first_names, ''), clean_first_names),
        surname = coalesce(nullif(surname, ''), clean_surname),
        club = coalesce(nullif(trim(coalesce(club, '')), ''), nullif(trim(coalesce(p_club, '')), '')),
        province = coalesce(nullif(trim(coalesce(province, '')), ''), clean_province),
        updated_at = now()
    where id = player_record.id
    returning * into player_record;
  end if;

  select id into registration_id
  from public.registrations
  where tournament_id = p_tournament_id
    and player_id = player_record.id
    and coalesce(registration_status::text, 'Pending') not in ('Rejected', 'Withdrawn')
  limit 1;

  if registration_id is not null then
    return jsonb_build_object('outcome', 'already_registered', 'registration_id', registration_id, 'player_id', player_record.id);
  end if;

  insert into public.registrations (
    player_id, tournament_id, section_id, payment_status, registration_status,
    created_at, updated_at
  ) values (
    player_record.id, p_tournament_id, p_section_id, 'Pending', 'Pending', now(), now()
  ) returning id into registration_id;

  return jsonb_build_object('outcome', 'imported', 'registration_id', registration_id, 'player_id', player_record.id);
end;
$$;

revoke all on function public.import_authorised_team_entry(text, text, text, date, text, text, text, uuid, uuid) from public, anon;
grant execute on function public.import_authorised_team_entry(text, text, text, date, text, text, text, uuid, uuid) to authenticated;

notify pgrst, 'reload schema';
commit;

select 'Authorised selected-team import installed' as status;
