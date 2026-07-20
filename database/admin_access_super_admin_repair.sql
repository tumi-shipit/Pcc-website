-- Repair accidental super-admin promotions.
-- Run this in Supabase SQL Editor after replacing the owner email if needed.
--
-- This keeps one owner as Super Admin and turns every other accidental
-- super_admin row back into normal Admin access.

with owner as (
  select lower('tumi.f@gmail.com') as email
)
update public.admin_staff_permissions permissions
set role = case
    when lower(permissions.email) = owner.email then 'super_admin'
    else 'admin'
  end,
  requires_super_admin_approval = lower(permissions.email) <> owner.email,
  access_status = 'Active',
  updated_at = now()
from owner
where permissions.role = 'super_admin'
   or lower(permissions.email) = owner.email;

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

grant execute on function public.current_admin_role() to authenticated;
