-- High-volume tournament registration support.
-- Run this in Supabase before large events. It is safe to run more than once.

do $$
begin
  if to_regclass('public.registrations') is not null then
    create index if not exists registrations_tournament_created_idx
      on public.registrations (tournament_id, created_at desc);

    create index if not exists registrations_tournament_status_idx
      on public.registrations (tournament_id, registration_status, payment_status);

    create index if not exists registrations_section_status_idx
      on public.registrations (section_id, registration_status, payment_status);

    create index if not exists registrations_player_tournament_idx
      on public.registrations (player_id, tournament_id)
      where player_id is not null;

    create index if not exists registrations_payment_status_idx
      on public.registrations (payment_status, created_at desc);

    create index if not exists registrations_registration_status_idx
      on public.registrations (registration_status, created_at desc);
  end if;

  if to_regclass('public.players') is not null then
    create index if not exists players_chess_sa_id_fast_lookup_idx
      on public.players (chess_sa_id)
      where chess_sa_id is not null and chess_sa_id <> '';

    create index if not exists players_lower_email_lookup_idx
      on public.players (lower(email))
      where email is not null and email <> '';

    create index if not exists players_lower_full_name_lookup_idx
      on public.players (lower(full_name));

    create index if not exists players_club_province_idx
      on public.players (club, province);
  end if;

  if to_regclass('public.tournament_sections') is not null then
    create index if not exists tournament_sections_tournament_idx
      on public.tournament_sections (tournament_id, section_name);
  end if;

  if to_regclass('public.tournaments') is not null then
    create index if not exists tournaments_registration_status_start_idx
      on public.tournaments (registration_status, start_date);
  end if;
end $$;
