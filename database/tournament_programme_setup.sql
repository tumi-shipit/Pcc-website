-- Public event programme for tournaments of any size or organising body.
-- Run this in the Supabase SQL Editor before using the Programme admin tab.

create table if not exists public.tournament_programme_items (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  programme_date date not null,
  start_time time,
  end_time time,
  title text not null,
  location text,
  notes text,
  display_order integer not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tournament_programme_items_tournament_idx
on public.tournament_programme_items (
  tournament_id,
  programme_date,
  start_time,
  display_order
);

alter table public.tournament_programme_items enable row level security;

drop policy if exists "Public can read published tournament programme items"
on public.tournament_programme_items;

create policy "Public can read published tournament programme items"
on public.tournament_programme_items
for select
to anon, authenticated
using (is_published = true);

drop policy if exists "Admins manage tournament programme items"
on public.tournament_programme_items;

create policy "Admins manage tournament programme items"
on public.tournament_programme_items
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

grant select on public.tournament_programme_items to anon, authenticated;
grant insert, update, delete on public.tournament_programme_items to authenticated;

notify pgrst, 'reload schema';

select 'Tournament programme installed' as status;
