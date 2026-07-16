create table if not exists public.member_memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  chess_sa_id text,
  member_email text not null,
  membership_type text not null default 'Annual',
  membership_status text not null default 'Active',
  start_date date,
  end_date date,
  amount_paid numeric(10, 2),
  payment_reference text,
  payment_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists member_memberships_member_email_key
on public.member_memberships (lower(member_email));

create unique index if not exists member_memberships_member_email_unique
on public.member_memberships (member_email);

create index if not exists member_memberships_player_id_idx
on public.member_memberships (player_id);

create index if not exists member_memberships_chess_sa_id_idx
on public.member_memberships (chess_sa_id);

alter table public.member_memberships enable row level security;

grant select, insert, update, delete on public.member_memberships to authenticated;

drop policy if exists "Members can read own membership"
on public.member_memberships;

create policy "Members can read own membership"
on public.member_memberships
for select
to authenticated
using (
  user_id = auth.uid()
  or lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can manage memberships"
on public.member_memberships;

create policy "Admins can manage memberships"
on public.member_memberships
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

create table if not exists public.member_payment_requests (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.member_memberships(id) on delete cascade,
  member_email text not null,
  amount numeric(10, 2) not null,
  payment_method text not null default 'EFT',
  payment_reference text,
  proof_url text,
  request_status text not null default 'Pending',
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_payment_requests_membership_id_idx
on public.member_payment_requests (membership_id);

create index if not exists member_payment_requests_status_idx
on public.member_payment_requests (request_status);

alter table public.member_payment_requests enable row level security;

grant select, insert, update, delete on public.member_payment_requests to authenticated;

drop policy if exists "Members can submit and read own payment requests"
on public.member_payment_requests;

create policy "Members can submit and read own payment requests"
on public.member_payment_requests
for select
to authenticated
using (
  lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Members can create own payment requests"
on public.member_payment_requests;

create policy "Members can create own payment requests"
on public.member_payment_requests
for insert
to authenticated
with check (
  lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
);

drop policy if exists "Admins can manage member payment requests"
on public.member_payment_requests;

create policy "Admins can manage member payment requests"
on public.member_payment_requests
for all
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

grant select on public.registration_details to authenticated;
grant select on public.registrations to authenticated;
grant select on public.players to authenticated;
grant select on public.tournaments to authenticated;
grant select on public.tournament_sections to authenticated;
grant select on public.tournament_results to authenticated;
grant select on public.tournament_officials to authenticated;

drop policy if exists "Members can read public tournaments"
on public.tournaments;

create policy "Members can read public tournaments"
on public.tournaments
for select
to authenticated
using (
  coalesce(registration_status, '') <> 'Draft'
  or exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Members can read own tournament registrations"
on public.registrations;

create policy "Members can read own tournament registrations"
on public.registrations
for select
to authenticated
using (
  exists (
    select 1
    from public.member_memberships
    left join public.players registration_player
      on registration_player.id = registrations.player_id
    where lower(member_memberships.member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and (
      member_memberships.player_id = registrations.player_id
      or (
        member_memberships.chess_sa_id is not null
        and registration_player.chess_sa_id = member_memberships.chess_sa_id
      )
    )
  )
  or exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Members can read own tournament results"
on public.tournament_results;

create policy "Members can read own tournament results"
on public.tournament_results
for select
to authenticated
using (
  exists (
    select 1
    from public.member_memberships
    left join public.players result_player
      on result_player.id = tournament_results.player_id
    left join public.players member_player
      on member_player.id = member_memberships.player_id
      or (
        member_memberships.chess_sa_id is not null
        and member_player.chess_sa_id = member_memberships.chess_sa_id
      )
    where lower(member_memberships.member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and (
      member_memberships.player_id = tournament_results.player_id
      or (
        member_memberships.chess_sa_id is not null
        and result_player.chess_sa_id = member_memberships.chess_sa_id
      )
      or (
        tournament_results.player_id is null
        and tournament_results.imported_name is not null
        and member_player.full_name is not null
        and lower(tournament_results.imported_name) = lower(member_player.full_name)
      )
    )
  )
  or exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Members can read own official assignments"
on public.tournament_officials;

create policy "Members can read own official assignments"
on public.tournament_officials
for select
to authenticated
using (
  exists (
    select 1
    from public.member_memberships
    left join public.players official_player
      on official_player.id = tournament_officials.player_id
    where lower(member_memberships.member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    and (
      member_memberships.player_id = tournament_officials.player_id
      or (
        member_memberships.chess_sa_id is not null
        and official_player.chess_sa_id = member_memberships.chess_sa_id
      )
    )
  )
  or exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
