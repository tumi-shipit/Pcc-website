-- Admin roles and approval foundation.
-- Run this in Supabase before giving other people admin access.
-- Important: admin_users stays as the simple login whitelist.

drop policy if exists "Admins can read admin users" on public.admin_users;
drop policy if exists "Super admins can manage admin users" on public.admin_users;
alter table public.admin_users disable row level security;
grant select, insert, update on public.admin_users to authenticated;

create table if not exists public.admin_staff_permissions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'admin',
  access_status text not null default 'Active',
  requires_super_admin_approval boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (admin_user_id),
  unique (email)
);

alter table public.admin_staff_permissions
drop constraint if exists admin_staff_permissions_role_check;

update public.admin_staff_permissions
set role = 'admin',
    updated_at = now()
where role <> 'super_admin';

alter table public.admin_staff_permissions
add constraint admin_staff_permissions_role_check
check (
  role in (
    'super_admin',
    'admin'
  )
);

alter table public.admin_staff_permissions
drop constraint if exists admin_staff_permissions_access_status_check;

alter table public.admin_staff_permissions
add constraint admin_staff_permissions_access_status_check
check (access_status in ('Active', 'Suspended'));

create index if not exists admin_staff_permissions_role_idx
on public.admin_staff_permissions (role, access_status);

insert into public.admin_staff_permissions (
  admin_user_id,
  email,
  display_name,
  role,
  access_status,
  requires_super_admin_approval
)
select
  admin_users.user_id,
  coalesce(auth_users.email, admin_users.user_id::text),
  coalesce(auth_users.raw_user_meta_data ->> 'full_name', auth_users.email),
  'super_admin',
  'Active',
  false
from public.admin_users
left join auth.users auth_users on auth_users.id = admin_users.user_id
on conflict (admin_user_id) do nothing;

grant select on public.admin_staff_permissions to authenticated;

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select role
      from public.admin_staff_permissions
      where admin_user_id = auth.uid()
        and access_status = 'Active'
      limit 1
    ),
    (
      select 'super_admin'
      from public.admin_users
      where user_id = auth.uid()
      limit 1
    )
  )
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_admin_role() = 'super_admin', false)
$$;

create table if not exists public.admin_action_requests (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete cascade,
  action_type text not null,
  action_label text not null,
  target_table text,
  target_id text,
  target_label text,
  request_payload jsonb not null default '{}'::jsonb,
  request_status text not null default 'Pending',
  request_note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_action_requests
drop constraint if exists admin_action_requests_status_check;

alter table public.admin_action_requests
add constraint admin_action_requests_status_check
check (request_status in ('Pending', 'Approved', 'Rejected', 'Cancelled'));

create index if not exists admin_action_requests_status_idx
on public.admin_action_requests (request_status, created_at desc);

create index if not exists admin_action_requests_requested_by_idx
on public.admin_action_requests (requested_by, created_at desc);

grant select, insert, update on public.admin_action_requests to authenticated;

alter table public.admin_action_requests enable row level security;

drop policy if exists "Admins can read admin action requests" on public.admin_action_requests;
create policy "Admins can read admin action requests"
on public.admin_action_requests
for select
to authenticated
using (
  public.current_admin_role() is not null
);

drop policy if exists "Admins can create own action requests" on public.admin_action_requests;
create policy "Admins can create own action requests"
on public.admin_action_requests
for insert
to authenticated
with check (
  requested_by = auth.uid()
  and public.current_admin_role() is not null
);

drop policy if exists "Super admins can update action requests" on public.admin_action_requests;
create policy "Super admins can update action requests"
on public.admin_action_requests
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create or replace function public.admin_review_action_request(
  p_request_id uuid,
  p_decision text,
  p_review_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can review restricted admin requests.';
  end if;

  if p_decision not in ('Approved', 'Rejected') then
    raise exception 'Decision must be Approved or Rejected.';
  end if;

  update public.admin_action_requests
  set request_status = p_decision,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = p_review_note,
      updated_at = now()
  where id = p_request_id
    and request_status = 'Pending';

  if not found then
    raise exception 'Pending request was not found.';
  end if;
end;
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
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can manage admin access.';
  end if;

  clean_email := lower(trim(p_email));

  if clean_email = '' then
    raise exception 'Email is required.';
  end if;

  if p_role not in (
    'super_admin',
    'admin'
  ) then
    raise exception 'Role must be Super Admin or Admin.';
  end if;

  if p_access_status not in ('Active', 'Suspended') then
    raise exception 'Unknown access status.';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = clean_email
  limit 1;

  if target_user_id is null then
    raise exception 'That person must create/sign in to an account before admin access can be granted.';
  end if;

  insert into public.admin_users (user_id)
  values (target_user_id)
  on conflict (user_id) do nothing;

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
    nullif(trim(p_display_name), ''),
    p_role,
    p_access_status,
    p_role <> 'super_admin',
    auth.uid(),
    now()
  )
  on conflict (admin_user_id)
  do update set
    email = excluded.email,
    display_name = excluded.display_name,
    role = excluded.role,
    access_status = excluded.access_status,
    requires_super_admin_approval = excluded.requires_super_admin_approval,
    updated_at = now();
end;
$$;

grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.admin_review_action_request(uuid, text, text) to authenticated;
grant execute on function public.admin_upsert_staff_permission(text, text, text, text) to authenticated;
