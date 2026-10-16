-- Run before deploying the team points update. Safe to run again.
begin;

alter table public.tournaments
  add column if not exists team_points_grouping text not null default 'Auto';

alter table public.tournaments
  drop constraint if exists tournaments_team_points_grouping_check;
alter table public.tournaments
  add constraint tournaments_team_points_grouping_check
  check (team_points_grouping in ('Auto', 'FED', 'TYPE', 'Club / Team', 'Imported'));

alter table public.tournament_results
  add column if not exists result_type text,
  add column if not exists imported_club text;

comment on column public.tournaments.team_points_grouping is
  'Independent tournament choice. Auto selects FED when multiple values exist, otherwise TYPE when multiple values exist, otherwise Club / Team. Imported explicitly uses official team rankings.';
comment on column public.tournament_results.result_type is
  'Original TYPE label from final rankings; may represent age, district or any organiser-defined group.';
comment on column public.tournament_results.imported_club is
  'Club/Team from the final ranking spreadsheet, captured for this tournament.';

commit;
notify pgrst, 'reload schema';
