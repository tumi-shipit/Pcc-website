-- Add an optional player district for provincial tournament entry grouping.
alter table public.players
  add column if not exists district text;

grant select (district) on public.players to anon, authenticated;
