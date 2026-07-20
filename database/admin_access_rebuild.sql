-- Solid admin access rebuild.
-- Run this in Supabase SQL Editor.
--
-- What this fixes:
-- 1. You can grant admin access by email before the person has logged in.
-- 2. When that person logs in later, the permission links itself to their account.
-- 3. Existing admin_users rows remain super admins.
-- 4. The admin save function no longer fails just because auth.users has no row yet.

drop policy if exists "Admins can read admin staff permissions" on public.admin_staff_permissions;
drop policy if exists "Super admins can insert admin staff permissions" on public.admin_staff_permissions;
drop policy if exists "Super admins can update admin staff permissions" on public.admin_staff_permissions;

create table if not exists public.admin_staff_permissions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'admin',
  access_status text not null default 'Active',
  requires_super_admin_approval boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_staff_permissions
alter column admin_user_id drop not null;

update public.admin_staff_permissions
set email = lower(trim(email)),
    role = case
      when lower(replace(replace(trim(role), ' ', '_'), '-', '_')) in ('super_admin', 'superadmin', 'super_administrator')
        then 'super_admin'
      else 'admin'
    end,
    access_status = case
      when access_status = 'Suspended' then 'Suspended'
      else 'Active'
    end,
    updated_at = now();

alter table public.admin_staff_permissions
drop constraint if exists admin_staff_permissions_role_check;

alter table public.admin_staff_permissions
add constraint admin_staff_permissions_role_check
check (role in ('super_admin', 'admin'));

alter table public.admin_staff_permissions
drop constraint if exists admin_staff_permissions_access_status_check;

alter table public.admin_staff_permissions
add constraint admin_staff_permissions_access_status_check
check (access_status in ('Active', 'Suspended'));

create unique index if not exists admin_staff_permissions_email_unique_idx
on public.admin_staff_permissions (email);

create unique index if not exists admin_staff_permissions_user_unique_idx
on public.admin_staff_permissions (admin_user_id)
where admin_user_id is not null;

create index if not exists admin_staff_permissions_role_idx
on public.admin_staff_permissions (role, access_status);

insert into public.admin_staff_permissions (
  admin_user_id,
  email,
  display_name,
  role,
  access_status,
  requires_super_admin_approval,
  updated_at
)
select
  admin_users.user_id,
  lower(coalesce(auth_users.email, admin_users.user_id::text)),
  coalesce(auth_users.raw_user_meta_data ->> 'full_name', auth_users.email),
  'super_admin',
  'Active',
  false,
  now()
from public.admin_users
left join auth.users auth_users on auth_users.id = admin_users.user_id
on conflict (email)
do update set
  admin_user_id = coalesce(excluded.admin_user_id, public.admin_staff_permissions.admin_user_id),
  display_name = coalesce(excluded.display_name, public.admin_staff_permissions.display_name),
  role = 'super_admin',
  access_status = 'Active',
  requires_super_admin_approval = false,
  updated_at = now();

update public.admin_staff_permissions permissions
set role = 'super_admin',
    access_status = 'Active',
    requires_super_admin_approval = false,
    updated_at = now()
from public.admin_users admin_users
where permissions.admin_user_id = admin_users.user_id;

create or replace function public.current_admin_role()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_email text;
  resolved_role text;
begin
  if auth.uid() is null then
    return null;
  end if;

  clean_email := lower(trim(coalesce(auth.jwt() ->> 'email', '')));

  if clean_email <> '' then
    update public.admin_staff_permissions
    set admin_user_id = auth.uid(),
        updated_at = now()
    where admin_user_id is null
      and lower(email) = clean_email;
  end if;

  select role
  into resolved_role
  from public.admin_staff_permissions
  where access_status = 'Active'
    and (
      admin_user_id = auth.uid()
      or (clean_email <> '' and lower(email) = clean_email)
    )
  order by case when role = 'super_admin' then 0 else 1 end
  limit 1;

  if resolved_role is not null then
    insert into public.admin_users (user_id)
    select auth.uid()
    where not exists (
      select 1
      from public.admin_users
      where user_id = auth.uid()
    );

    return resolved_role;
  end if;

  if exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  ) then
    return 'super_admin';
  end if;

  return null;
end;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(public.current_admin_role() = 'super_admin', false)
$$;

create or replace function public.has_admin_access()
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    exists (
      select 1
      from public.admin_staff_permissions
      where access_status = 'Active'
        and (
          admin_user_id = auth.uid()
          or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    )
    or exists (
      select 1
      from public.admin_users
      where user_id = auth.uid()
    ),
    false
  )
$$;

create or replace function public.admin_upsert_staff_permission(
  p_email text,
  p_display_name text,
  p_role text,
  p_access_status text default 'Active'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  clean_email text;
  clean_role text;
  clean_status text;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can manage admin access.';
  end if;

  clean_email := lower(trim(coalesce(p_email, '')));
  clean_role := lower(trim(coalesce(p_role, '')));
  clean_role := replace(clean_role, ' ', '_');
  clean_role := replace(clean_role, '-', '_');
  clean_status := coalesce(nullif(trim(p_access_status), ''), 'Active');

  if clean_role in ('superadmin', 'super_administrator') then
    clean_role := 'super_admin';
  end if;

  if clean_email = '' then
    raise exception 'Email is required.';
  end if;

  if clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid email address.';
  end if;

  if clean_role not in ('super_admin', 'admin') then
    raise exception 'Role must be Super Admin or Admin.';
  end if;

  if clean_status not in ('Active', 'Suspended') then
    raise exception 'Unknown access status.';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = clean_email
  limit 1;

  update public.admin_staff_permissions
  set admin_user_id = coalesce(admin_user_id, target_user_id),
      email = clean_email,
      display_name = nullif(trim(coalesce(p_display_name, '')), ''),
      role = clean_role,
      access_status = clean_status,
      requires_super_admin_approval = clean_role <> 'super_admin',
      updated_at = now()
  where email = clean_email;

  if not found then
    insert into public.admin_staff_permissions (
      admin_user_id,
      email,
      display_name,
      role,
      access_status,
      requires_super_admin_approval,
      created_by,
      updated_at
    )
    values (
      target_user_id,
      clean_email,
      nullif(trim(coalesce(p_display_name, '')), ''),
      clean_role,
      clean_status,
      clean_role <> 'super_admin',
      auth.uid(),
      now()
    );
  end if;

  if target_user_id is not null and clean_status = 'Active' then
    insert into public.admin_users (user_id)
    select target_user_id
    where not exists (
      select 1
      from public.admin_users
      where user_id = target_user_id
    );
  end if;
end;
$$;

grant select on public.admin_staff_permissions to authenticated;
grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.has_admin_access() to authenticated;
grant execute on function public.admin_upsert_staff_permission(text, text, text, text) to authenticated;

alter table public.admin_staff_permissions enable row level security;

create policy "Admins can read admin staff permissions"
on public.admin_staff_permissions
for select
to authenticated
using (public.has_admin_access());

create policy "Super admins can insert admin staff permissions"
on public.admin_staff_permissions
for insert
to authenticated
with check (public.is_super_admin());

create policy "Super admins can update admin staff permissions"
on public.admin_staff_permissions
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());
