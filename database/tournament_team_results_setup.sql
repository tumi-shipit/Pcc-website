-- Team standings for Swiss system tournaments with team tiebreaks.
-- Run this in Supabase SQL Editor before importing team results.

create table if not exists public.tournament_team_results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  section_id uuid references public.tournament_sections(id) on delete set null,
  final_position integer,
  team_name text not null,
  federation text,
  match_points numeric,
  board_points numeric,
  tie_break text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tournament_team_results_tournament_section_idx
on public.tournament_team_results(tournament_id, section_id, final_position);

alter table public.tournament_team_results enable row level security;

grant select on public.tournament_team_results to anon, authenticated;
grant insert, update, delete on public.tournament_team_results to authenticated;

drop policy if exists "Public can view tournament team results"
on public.tournament_team_results;

create policy "Public can view tournament team results"
on public.tournament_team_results
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_team_results.tournament_id
      and coalesce(tournaments.registration_status::text, 'Open') <> 'Draft'
  )
);

drop policy if exists "Admins can manage tournament team results"
on public.tournament_team_results;

create policy "Admins can manage tournament team results"
on public.tournament_team_results
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

drop trigger if exists tournament_team_results_updated_at
on public.tournament_team_results;

create trigger tournament_team_results_updated_at
before update on public.tournament_team_results
for each row
execute function public.set_updated_at();
