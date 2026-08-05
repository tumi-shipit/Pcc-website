-- Player rating history setup.
-- Run this before using /admin/import-ratings for Rapid and Blitz files.

create table if not exists public.player_rating_history (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  rating_type text not null default 'standard',
  rating integer not null,
  rating_date date,
  source text,
  created_at timestamptz not null default now()
);

alter table public.player_rating_history
drop constraint if exists player_rating_history_rating_type_check;

alter table public.player_rating_history
add constraint player_rating_history_rating_type_check
check (
  rating_type in ('standard', 'rapid', 'blitz', 'classical')
);

create index if not exists player_rating_history_player_type_date_idx
on public.player_rating_history (
  player_id,
  rating_type,
  rating_date desc nulls last,
  created_at desc
);

alter table public.player_rating_history enable row level security;

drop policy if exists "Public can read player rating history"
on public.player_rating_history;

drop policy if exists "Admins can manage player rating history"
on public.player_rating_history;

create policy "Public can read player rating history"
on public.player_rating_history
for select
to anon, authenticated
using (true);

create policy "Admins can manage player rating history"
on public.player_rating_history
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

grant select on public.player_rating_history to anon, authenticated;
grant insert, update, delete on public.player_rating_history to authenticated;

notify pgrst, 'reload schema';
