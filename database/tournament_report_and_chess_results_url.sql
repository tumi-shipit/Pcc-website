alter table public.tournaments
add column if not exists tournament_report text,
add column if not exists chess_results_url text;
