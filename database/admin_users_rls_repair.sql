-- Enable RLS on admin_users without reintroducing admin policy recursion.
-- Run this in Supabase SQL Editor.
--
-- admin_users is now only a compatibility whitelist. The source of truth for
-- Super Admin vs Admin is admin_staff_permissions.

grant select on public.admin_users to authenticated;

create or replace function public.is_super_admin_from_permissions()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.admin_staff_permissions
      where role = 'super_admin'
        and access_status = 'Active'
        and (
          admin_user_id = auth.uid()
          or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    ),
    false
  )
$$;

grant execute on function public.is_super_admin_from_permissions() to authenticated;

drop policy if exists "Admin users can read own admin row" on public.admin_users;
drop policy if exists "Admins manage admin users" on public.admin_users;
drop policy if exists "Admins can read admin users" on public.admin_users;
drop policy if exists "Super admins can manage admin users" on public.admin_users;

alter table public.admin_users enable row level security;

create policy "Admin users can read own admin row"
on public.admin_users
for select
to authenticated
using (user_id = auth.uid());

create policy "Super admins can manage admin users"
on public.admin_users
for all
to authenticated
using (public.is_super_admin_from_permissions())
with check (public.is_super_admin_from_permissions());
