grant select, insert, update, delete on public.tournament_officials to authenticated;
grant select, insert, update on public.players to authenticated;

alter table public.tournament_officials enable row level security;

drop policy if exists "Admins can manage tournament officials"
on public.tournament_officials;

create policy "Admins can manage tournament officials"
on public.tournament_officials
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

drop policy if exists "Admins can create player profiles"
on public.players;

create policy "Admins can create player profiles"
on public.players
for insert
to authenticated
with check (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can update player profiles"
on public.players;

create policy "Admins can update player profiles"
on public.players
for update
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
