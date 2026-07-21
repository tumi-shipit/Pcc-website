create table if not exists public.organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  website_url text,
  description text,
  representative_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organisation_committee_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  full_name text not null,
  chess_sa_id text,
  role_title text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organisation_committee_members
add column if not exists player_id uuid references public.players(id) on delete set null,
add column if not exists chess_sa_id text;

create table if not exists public.tournament_organisations (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  role text not null default 'Organiser',
  representative_member_id uuid references public.organisation_committee_members(id) on delete set null,
  representative_name text,
  notes text,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organisation_committee_members_organisation_idx
on public.organisation_committee_members (organisation_id);

create index if not exists organisation_committee_members_player_idx
on public.organisation_committee_members (player_id);

create index if not exists organisation_committee_members_chess_sa_idx
on public.organisation_committee_members (chess_sa_id)
where chess_sa_id is not null and chess_sa_id <> '';

create index if not exists tournament_organisations_tournament_idx
on public.tournament_organisations (tournament_id);

create unique index if not exists tournament_organisations_unique_role
on public.tournament_organisations (
  tournament_id,
  organisation_id,
  role,
  coalesce(representative_member_id::text, ''),
  coalesce(representative_name, '')
);

grant select on public.organisations to anon, authenticated;
grant select on public.organisation_committee_members to anon, authenticated;
grant select on public.tournament_organisations to anon, authenticated;

grant insert, update, delete on public.organisations to authenticated;
grant insert, update, delete on public.organisation_committee_members to authenticated;
grant insert, update, delete on public.tournament_organisations to authenticated;
grant select, insert, update on public.players to authenticated;

alter table public.organisations enable row level security;
alter table public.organisation_committee_members enable row level security;
alter table public.tournament_organisations enable row level security;

drop policy if exists "Public can read organisations" on public.organisations;
create policy "Public can read organisations"
on public.organisations
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read organisation committee members" on public.organisation_committee_members;
create policy "Public can read organisation committee members"
on public.organisation_committee_members
for select
to anon, authenticated
using (true);

drop policy if exists "Public can read tournament organisations" on public.tournament_organisations;
create policy "Public can read tournament organisations"
on public.tournament_organisations
for select
to anon, authenticated
using (true);

drop policy if exists "Admins can manage organisations" on public.organisations;
create policy "Admins can manage organisations"
on public.organisations
for all
to authenticated
using (public.can_edit_organisation(id))
with check (public.can_edit_organisation(id));

drop policy if exists "Admins can manage organisation committee members" on public.organisation_committee_members;
create policy "Admins can manage organisation committee members"
on public.organisation_committee_members
for all
to authenticated
using (public.can_edit_organisation(organisation_id))
with check (public.can_edit_organisation(organisation_id));

drop policy if exists "Admins can manage tournament organisations" on public.tournament_organisations;
create policy "Admins can manage tournament organisations"
on public.tournament_organisations
for all
to authenticated
using (public.can_edit_organisation(organisation_id))
with check (public.can_edit_organisation(organisation_id));

drop policy if exists "Admins can create player profiles" on public.players;
create policy "Admins can create player profiles"
on public.players
for insert
to authenticated
with check (
  exists (
    select 1 from public.admin_users where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can update player profiles" on public.players;
create policy "Admins can update player profiles"
on public.players
for update
to authenticated
using (
  exists (
    select 1 from public.admin_users where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.admin_users where admin_users.user_id = auth.uid()
  )
);
