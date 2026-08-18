alter table public.tournament_results
add column if not exists starting_number integer;

create index if not exists tournament_results_starting_number_idx
on public.tournament_results (tournament_id, section_id, starting_number);

notify pgrst, 'reload schema';

select 'Tournament result starting numbers installed' as status;
