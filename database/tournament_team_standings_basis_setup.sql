-- PCC team standings basis
-- National events total players by South African province.
-- Club, district and other events total players by their registered club only.

alter table public.tournaments
add column if not exists team_standings_basis text not null default 'Club / District';

alter table public.tournaments
drop constraint if exists tournaments_team_standings_basis_check;

alter table public.tournaments
add constraint tournaments_team_standings_basis_check
check (team_standings_basis in ('National', 'Club / District'));

comment on column public.tournaments.team_standings_basis is
  'National totals teams by South African province; Club / District totals teams by registered club. Federation is never used.';

notify pgrst, 'reload schema';
