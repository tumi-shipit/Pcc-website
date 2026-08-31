-- PCC organiser access management repair
-- Run this in the Supabase SQL editor. It lets authenticated PCC admins revoke
-- or delete organiser access records while leaving the public read policy intact.

grant select, insert, update, delete on public.tournament_organiser_access to authenticated;

alter table public.tournament_organiser_access enable row level security;

drop policy if exists "Admins manage organiser portal access"
on public.tournament_organiser_access;

create policy "Admins manage organiser portal access"
on public.tournament_organiser_access
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

notify pgrst, 'reload schema';
