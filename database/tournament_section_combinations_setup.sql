create table if not exists public.tournament_section_combinations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  combined_section_id uuid not null references public.tournament_sections(id) on delete cascade,
  source_section_id uuid not null references public.tournament_sections(id) on delete cascade,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint tournament_section_combinations_distinct_sections
    check (combined_section_id <> source_section_id),
  constraint tournament_section_combinations_unique_source
    unique (tournament_id, combined_section_id, source_section_id)
);

create index if not exists tournament_section_combinations_tournament_idx
on public.tournament_section_combinations (tournament_id, combined_section_id);

alter table public.tournament_section_combinations enable row level security;

grant select on public.tournament_section_combinations to anon, authenticated;
grant insert, update, delete on public.tournament_section_combinations to authenticated;

drop policy if exists "Public can read non-draft section combinations"
on public.tournament_section_combinations;

create policy "Public can read non-draft section combinations"
on public.tournament_section_combinations
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.tournaments
    where tournaments.id = tournament_section_combinations.tournament_id
      and coalesce(tournaments.registration_status::text, 'Open') <> 'Draft'
  )
);

drop policy if exists "Admins manage section combinations"
on public.tournament_section_combinations;

create policy "Admins manage section combinations"
on public.tournament_section_combinations
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
