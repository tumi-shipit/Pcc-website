alter table public.tournament_sections
add column if not exists minimum_rating integer,
add column if not exists maximum_rating integer;

create index if not exists tournament_sections_rating_band_idx
on public.tournament_sections (minimum_rating, maximum_rating);
