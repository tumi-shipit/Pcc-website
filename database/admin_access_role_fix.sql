-- Repair admin role saving after simplifying access to Super Admin + Admin.
-- Run this in Supabase SQL Editor if the admin page says:
-- "Could not save admin access: unknown admin role"

alter table public.admin_staff_permissions
drop constraint if exists admin_staff_permissions_role_check;

update public.admin_staff_permissions
set role = case
    when lower(replace(replace(trim(role), ' ', '_'), '-', '_')) in ('super_admin', 'superadmin', 'super_administrator')
      then 'super_admin'
    else 'admin'
  end,
  updated_at = now();

alter table public.admin_staff_permissions
add constraint admin_staff_permissions_role_check
check (role in ('super_admin', 'admin'));

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
begin
  if not public.is_super_admin() then
    raise exception 'Only super admins can manage admin access.';
  end if;

  clean_email := lower(trim(p_email));
  clean_role := lower(trim(coalesce(p_role, '')));
  clean_role := replace(clean_role, ' ', '_');
  clean_role := replace(clean_role, '-', '_');

  if clean_role in ('superadmin', 'super_administrator') then
    clean_role := 'super_admin';
  end if;

  if clean_email = '' then
    raise exception 'Email is required.';
  end if;

  if clean_role not in ('super_admin', 'admin') then
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
    clean_role,
    p_access_status,
    clean_role <> 'super_admin',
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

grant execute on function public.admin_upsert_staff_permission(text, text, text, text) to authenticated;
