-- PCC tournament type and team standings basis
-- National events total players by South African province.
-- Every other event type totals players by their registered Club/City only.

alter table public.tournaments
add column if not exists tournament_type text not null default 'Club';

alter table public.tournaments
drop constraint if exists tournaments_tournament_type_check;

alter table public.tournaments
add constraint tournaments_tournament_type_check
check (tournament_type in ('Club', 'District', 'Provincial', 'National', 'Organisation / School'));

alter table public.tournaments
add column if not exists team_standings_basis text not null default 'Club / District';

alter table public.tournaments
drop constraint if exists tournaments_team_standings_basis_check;

alter table public.tournaments
add constraint tournaments_team_standings_basis_check
check (team_standings_basis in ('National', 'Club / District'));

-- Preserve National events created before tournament_type existed, then make
-- tournament type the single source of truth for the standings grouping.
update public.tournaments
set tournament_type = 'National'
where team_standings_basis = 'National'
  and tournament_type = 'Club';

update public.tournaments
set team_standings_basis = case
  when tournament_type = 'National' then 'National'
  else 'Club / District'
end;

alter table public.tournaments
drop constraint if exists tournaments_type_matches_standings_basis_check;

alter table public.tournaments
add constraint tournaments_type_matches_standings_basis_check
check (
  (tournament_type = 'National' and team_standings_basis = 'National')
  or
  (tournament_type <> 'National' and team_standings_basis = 'Club / District')
);

comment on column public.tournaments.team_standings_basis is
  'National totals teams by South African province; Club / District totals teams by registered club. Federation is never used.';

comment on column public.tournaments.tournament_type is
  'The event identifier. Only National uses province team standings; every other type uses registered Club/City team standings.';

notify pgrst, 'reload schema';
