-- Live tournament round updates for long-running events and leagues.

create table if not exists public.tournament_live_updates (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  section_id uuid references public.tournament_sections(id) on delete set null,
  round_number integer not null default 1,
  board_number integer,
  previous_board_number integer,
  player_name text not null,
  opponent_name text,
  result text,
  points numeric(5, 2),
  notes text,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tournament_live_updates_tournament_idx
on public.tournament_live_updates (tournament_id, round_number desc, display_order, board_number);

create index if not exists tournament_live_updates_section_idx
on public.tournament_live_updates (section_id);

alter table public.tournament_live_updates enable row level security;

drop policy if exists "Public can read published live updates"
on public.tournament_live_updates;

create policy "Public can read published live updates"
on public.tournament_live_updates
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Admins manage live updates"
on public.tournament_live_updates;

create policy "Admins manage live updates"
on public.tournament_live_updates
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

grant select on public.tournament_live_updates to anon, authenticated;
grant insert, update, delete on public.tournament_live_updates to authenticated;

notify pgrst, 'reload schema';

select 'Tournament live updates installed' as status;
