-- Solid admin access rebuild.
-- Run this in Supabase SQL Editor.
--
-- What this fixes:
-- 1. You can grant admin access by email before the person has logged in.
-- 2. When that person logs in later, the permission links itself to their account.
-- 3. admin_staff_permissions is the source of truth for Super Admin vs Admin.
-- 4. admin_users is only a compatibility whitelist for older admin policies.
-- 5. The admin save function no longer fails just because auth.users has no row yet.

do $$
begin
  if to_regclass('public.admin_staff_permissions') is not null then
    execute 'drop policy if exists "Admins can read admin staff permissions" on public.admin_staff_permissions';
    execute 'drop policy if exists "Super admins can insert admin staff permissions" on public.admin_staff_permissions';
    execute 'drop policy if exists "Super admins can update admin staff permissions" on public.admin_staff_permissions';
  end if;

  if to_regclass('public.admin_action_requests') is not null then
    execute 'drop policy if exists "Admins can read admin action requests" on public.admin_action_requests';
    execute 'drop policy if exists "Admins can create own action requests" on public.admin_action_requests';
    execute 'drop policy if exists "Super admins can update action requests" on public.admin_action_requests';
  end if;

  if to_regclass('public.admin_access_audit_log') is not null then
    execute 'drop policy if exists "Admins can read admin access audit log" on public.admin_access_audit_log';
  end if;

  if to_regclass('public.organisation_admin_permissions') is not null then
    execute 'drop policy if exists "Admins can read organisation admin permissions" on public.organisation_admin_permissions';
    execute 'drop policy if exists "Super admins can manage organisation admin permissions" on public.organisation_admin_permissions';
  end if;
end $$;

create table if not exists public.admin_staff_permissions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'admin',
  access_status text not null default 'Active',
  requires_super_admin_approval boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.admin_staff_permissions
alter column admin_user_id drop not null;

alter table public.admin_staff_permissions
add column if not exists updated_by uuid references auth.users(id) on delete set null;

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

create table if not exists public.admin_access_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_admin_user_id uuid references auth.users(id) on delete set null,
  target_email text not null,
  action_type text not null,
  previous_role text,
  new_role text,
  previous_status text,
  new_status text,
  created_at timestamptz not null default now()
);

create index if not exists admin_access_audit_log_created_idx
on public.admin_access_audit_log (created_at desc);

create index if not exists admin_access_audit_log_target_email_idx
on public.admin_access_audit_log (target_email, created_at desc);

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

create table if not exists public.organisation_admin_permissions (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  admin_user_id uuid references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  role text not null default 'organisation_admin',
  access_status text not null default 'Active',
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.organisation_admin_permissions
alter column admin_user_id drop not null;

alter table public.organisation_admin_permissions
drop constraint if exists organisation_admin_permissions_role_check;

alter table public.organisation_admin_permissions
add constraint organisation_admin_permissions_role_check
check (role in ('organisation_admin', 'tournament_staff', 'finance_viewer'));

alter table public.organisation_admin_permissions
drop constraint if exists organisation_admin_permissions_access_status_check;

alter table public.organisation_admin_permissions
add constraint organisation_admin_permissions_access_status_check
check (access_status in ('Active', 'Suspended'));

create unique index if not exists organisation_admin_permissions_org_email_idx
on public.organisation_admin_permissions (organisation_id, email);

create index if not exists organisation_admin_permissions_user_idx
on public.organisation_admin_permissions (admin_user_id)
where admin_user_id is not null;

create index if not exists organisation_admin_permissions_org_role_idx
on public.organisation_admin_permissions (organisation_id, role, access_status);

with legacy_admins as (
  select
    admin_users.user_id,
    lower(coalesce(auth_users.email, admin_users.user_id::text)) as email,
    coalesce(auth_users.raw_user_meta_data ->> 'full_name', auth_users.email) as display_name,
    row_number() over (order by admin_users.user_id) as legacy_order
  from public.admin_users
  left join auth.users auth_users on auth_users.id = admin_users.user_id
)
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
  legacy_admins.user_id,
  legacy_admins.email,
  legacy_admins.display_name,
  case
    when not exists (
      select 1
      from public.admin_staff_permissions
      where role = 'super_admin'
    )
    and legacy_admins.legacy_order = 1
      then 'super_admin'
    else 'admin'
  end,
  'Active',
  case
    when not exists (
      select 1
      from public.admin_staff_permissions
      where role = 'super_admin'
    )
    and legacy_admins.legacy_order = 1
      then false
    else true
  end,
  now()
from legacy_admins
on conflict (email)
do update set
  admin_user_id = coalesce(excluded.admin_user_id, public.admin_staff_permissions.admin_user_id),
  display_name = coalesce(excluded.display_name, public.admin_staff_permissions.display_name),
  access_status = 'Active',
  updated_at = now();

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

    update public.organisation_admin_permissions
    set admin_user_id = auth.uid(),
        updated_at = now()
    where admin_user_id is null
      and lower(email) = clean_email;
  end if;

  if exists (
    select 1
    from public.admin_staff_permissions
    where access_status = 'Suspended'
      and (
        admin_user_id = auth.uid()
        or (clean_email <> '' and lower(email) = clean_email)
      )
  ) then
    return null;
  end if;

  if exists (
    select 1
    from public.organisation_admin_permissions
    where access_status = 'Suspended'
      and (
        admin_user_id = auth.uid()
        or (clean_email <> '' and lower(email) = clean_email)
      )
  )
  and not exists (
    select 1
    from public.organisation_admin_permissions
    where access_status = 'Active'
      and (
        admin_user_id = auth.uid()
        or (clean_email <> '' and lower(email) = clean_email)
      )
  ) then
    return null;
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
    begin
      insert into public.admin_users (user_id)
      select auth.uid()
      where not exists (
        select 1
        from public.admin_users
        where user_id = auth.uid()
      );
    exception
      when others then
        null;
    end;

    return resolved_role;
  end if;

  select role
  into resolved_role
  from public.organisation_admin_permissions
  where access_status = 'Active'
    and (
      admin_user_id = auth.uid()
      or (clean_email <> '' and lower(email) = clean_email)
    )
  order by case
    when role = 'organisation_admin' then 0
    when role = 'tournament_staff' then 1
    else 2
  end
  limit 1;

  if resolved_role is not null then
    return resolved_role;
  end if;

  if exists (
    select 1
    from public.admin_users
    where user_id = auth.uid()
  ) then
    if not exists (
      select 1
      from public.admin_staff_permissions
      where role = 'super_admin'
        and access_status = 'Active'
    ) then
      return 'super_admin';
    end if;

    return 'admin';
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
    case
      when exists (
        select 1
        from public.admin_staff_permissions
        where access_status = 'Suspended'
          and (
            admin_user_id = auth.uid()
            or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
      ) then false
      else
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
          from public.organisation_admin_permissions
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
        )
    end,
    false
  )
$$;

create or replace function public.can_manage_organisation(p_organisation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    public.current_admin_role() in ('super_admin', 'admin')
    or exists (
      select 1
      from public.organisation_admin_permissions
      where organisation_id = p_organisation_id
        and access_status = 'Active'
        and role in ('organisation_admin', 'tournament_staff', 'finance_viewer')
        and (
          admin_user_id = auth.uid()
          or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    ),
    false
  )
$$;

create or replace function public.can_edit_organisation(p_organisation_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select coalesce(
    public.current_admin_role() in ('super_admin', 'admin')
    or exists (
      select 1
      from public.organisation_admin_permissions
      where organisation_id = p_organisation_id
        and access_status = 'Active'
        and role in ('organisation_admin', 'tournament_staff')
        and (
          admin_user_id = auth.uid()
          or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
        )
    ),
    false
  )
$$;

create or replace function public.current_admin_context()
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'role', public.current_admin_role(),
    'is_super_admin', public.is_super_admin(),
    'organisations',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'organisation_id', organisation_id,
            'role', role,
            'access_status', access_status
          )
          order by role, organisation_id
        )
        from public.organisation_admin_permissions
        where access_status = 'Active'
          and (
            admin_user_id = auth.uid()
            or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
          )
      ),
      '[]'::jsonb
    )
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
  existing_user_id uuid;
  clean_email text;
  clean_role text;
  clean_status text;
  previous_role text;
  previous_status text;
  action_kind text;
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

  select admin_user_id, role, access_status
  into existing_user_id, previous_role, previous_status
  from public.admin_staff_permissions
  where email = clean_email
  limit 1;

  target_user_id := coalesce(target_user_id, existing_user_id);

  if target_user_id = auth.uid() and clean_status = 'Suspended' then
    raise exception 'You cannot suspend your own admin access.';
  end if;

  if previous_role = 'super_admin'
    and (clean_role <> 'super_admin' or clean_status <> 'Active')
    and not exists (
      select 1
      from public.admin_staff_permissions
      where role = 'super_admin'
        and access_status = 'Active'
        and email <> clean_email
    ) then
    raise exception 'You cannot remove the last active super admin.';
  end if;

  update public.admin_staff_permissions
  set admin_user_id = coalesce(admin_user_id, target_user_id),
      email = clean_email,
      display_name = nullif(trim(coalesce(p_display_name, '')), ''),
      role = clean_role,
      access_status = clean_status,
      requires_super_admin_approval = clean_role <> 'super_admin',
      updated_by = auth.uid(),
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
      updated_by,
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
      auth.uid(),
      now()
    );
  end if;

  if target_user_id is not null and clean_status = 'Active' then
    begin
      insert into public.admin_users (user_id)
      select target_user_id
      where not exists (
        select 1
        from public.admin_users
        where user_id = target_user_id
      );
    exception
      when others then
        null;
    end;
  elsif target_user_id is not null and clean_status = 'Suspended' then
    begin
      delete from public.admin_users
      where user_id = target_user_id;
    exception
      when others then
        null;
    end;
  end if;

  action_kind := case
    when previous_role is null then 'created'
    when clean_status = 'Suspended' and previous_status <> 'Suspended' then 'suspended'
    when clean_status = 'Active' and previous_status = 'Suspended' then 'restored'
    when previous_role <> clean_role then 'role_changed'
    else 'updated'
  end;

  insert into public.admin_access_audit_log (
    actor_user_id,
    target_admin_user_id,
    target_email,
    action_type,
    previous_role,
    new_role,
    previous_status,
    new_status
  )
  values (
    auth.uid(),
    target_user_id,
    clean_email,
    action_kind,
    previous_role,
    clean_role,
    previous_status,
    clean_status
  );
end;
$$;

create or replace function public.admin_upsert_organisation_permission(
  p_organisation_id uuid,
  p_email text,
  p_display_name text,
  p_role text default 'organisation_admin',
  p_access_status text default 'Active'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
  existing_user_id uuid;
  clean_email text;
  clean_role text;
  clean_status text;
  previous_role text;
  previous_status text;
  action_kind text;
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can manage organisation admin access.';
  end if;

  if p_organisation_id is null then
    raise exception 'Organisation is required.';
  end if;

  if not exists (
    select 1
    from public.organisations
    where id = p_organisation_id
  ) then
    raise exception 'Organisation was not found.';
  end if;

  clean_email := lower(trim(coalesce(p_email, '')));
  clean_role := lower(trim(coalesce(p_role, '')));
  clean_role := replace(clean_role, ' ', '_');
  clean_role := replace(clean_role, '-', '_');
  clean_status := coalesce(nullif(trim(p_access_status), ''), 'Active');

  if clean_email = '' then
    raise exception 'Email is required.';
  end if;

  if clean_email !~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$' then
    raise exception 'Enter a valid email address.';
  end if;

  if clean_role not in ('organisation_admin', 'tournament_staff', 'finance_viewer') then
    raise exception 'Unknown organisation role.';
  end if;

  if clean_status not in ('Active', 'Suspended') then
    raise exception 'Unknown access status.';
  end if;

  select id
  into target_user_id
  from auth.users
  where lower(email) = clean_email
  limit 1;

  select admin_user_id, role, access_status
  into existing_user_id, previous_role, previous_status
  from public.organisation_admin_permissions
  where organisation_id = p_organisation_id
    and email = clean_email
  limit 1;

  target_user_id := coalesce(target_user_id, existing_user_id);

  update public.organisation_admin_permissions
  set admin_user_id = coalesce(admin_user_id, target_user_id),
      email = clean_email,
      display_name = nullif(trim(coalesce(p_display_name, '')), ''),
      role = clean_role,
      access_status = clean_status,
      updated_by = auth.uid(),
      updated_at = now()
  where organisation_id = p_organisation_id
    and email = clean_email;

  if not found then
    insert into public.organisation_admin_permissions (
      organisation_id,
      admin_user_id,
      email,
      display_name,
      role,
      access_status,
      created_by,
      updated_by,
      updated_at
    )
    values (
      p_organisation_id,
      target_user_id,
      clean_email,
      nullif(trim(coalesce(p_display_name, '')), ''),
      clean_role,
      clean_status,
      auth.uid(),
      auth.uid(),
      now()
    );
  end if;

  action_kind := case
    when previous_role is null then 'organisation_access_created'
    when clean_status = 'Suspended' and previous_status <> 'Suspended' then 'organisation_access_suspended'
    when clean_status = 'Active' and previous_status = 'Suspended' then 'organisation_access_restored'
    when previous_role <> clean_role then 'organisation_role_changed'
    else 'organisation_access_updated'
  end;

  insert into public.admin_access_audit_log (
    actor_user_id,
    target_admin_user_id,
    target_email,
    action_type,
    previous_role,
    new_role,
    previous_status,
    new_status
  )
  values (
    auth.uid(),
    target_user_id,
    clean_email,
    action_kind,
    previous_role,
    clean_role,
    previous_status,
    clean_status
  );
end;
$$;

create or replace function public.admin_request_restricted_action(
  p_action_type text,
  p_action_label text,
  p_target_table text default null,
  p_target_id text default null,
  p_target_label text default null,
  p_request_payload jsonb default '{}'::jsonb,
  p_request_note text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  request_id uuid;
begin
  if not public.has_admin_access() then
    raise exception 'Only admins can request restricted actions.';
  end if;

  if nullif(trim(coalesce(p_action_type, '')), '') is null then
    raise exception 'Action type is required.';
  end if;

  if nullif(trim(coalesce(p_action_label, '')), '') is null then
    raise exception 'Action label is required.';
  end if;

  insert into public.admin_action_requests (
    requested_by,
    action_type,
    action_label,
    target_table,
    target_id,
    target_label,
    request_payload,
    request_note
  )
  values (
    auth.uid(),
    nullif(trim(coalesce(p_action_type, '')), ''),
    nullif(trim(coalesce(p_action_label, '')), ''),
    nullif(trim(coalesce(p_target_table, '')), ''),
    nullif(trim(coalesce(p_target_id, '')), ''),
    nullif(trim(coalesce(p_target_label, '')), ''),
    coalesce(p_request_payload, '{}'::jsonb),
    nullif(trim(coalesce(p_request_note, '')), '')
  )
  returning id into request_id;

  if request_id is null then
    raise exception 'Could not create restricted action request.';
  end if;

  return request_id;
end;
$$;

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

grant select on public.admin_staff_permissions to authenticated;
grant select on public.organisation_admin_permissions to authenticated;
grant select on public.admin_access_audit_log to authenticated;
grant select, insert, update on public.admin_action_requests to authenticated;
grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.has_admin_access() to authenticated;
grant execute on function public.can_manage_organisation(uuid) to authenticated;
grant execute on function public.can_edit_organisation(uuid) to authenticated;
grant execute on function public.current_admin_context() to authenticated;
grant execute on function public.admin_upsert_staff_permission(text, text, text, text) to authenticated;
grant execute on function public.admin_upsert_organisation_permission(uuid, text, text, text, text) to authenticated;
grant execute on function public.admin_request_restricted_action(text, text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.admin_review_action_request(uuid, text, text) to authenticated;

alter table public.admin_staff_permissions enable row level security;
alter table public.organisation_admin_permissions enable row level security;
alter table public.admin_access_audit_log enable row level security;
alter table public.admin_action_requests enable row level security;

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

create policy "Admins can read organisation admin permissions"
on public.organisation_admin_permissions
for select
to authenticated
using (
  public.current_admin_role() in ('super_admin', 'admin')
  or (
    access_status = 'Active'
    and (
      admin_user_id = auth.uid()
      or lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
  )
);

create policy "Super admins can manage organisation admin permissions"
on public.organisation_admin_permissions
for all
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());

create policy "Admins can read admin access audit log"
on public.admin_access_audit_log
for select
to authenticated
using (public.has_admin_access());

create policy "Admins can read admin action requests"
on public.admin_action_requests
for select
to authenticated
using (public.has_admin_access());

create policy "Admins can create own action requests"
on public.admin_action_requests
for insert
to authenticated
with check (
  requested_by = auth.uid()
  and public.has_admin_access()
);

create policy "Super admins can update action requests"
on public.admin_action_requests
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());
