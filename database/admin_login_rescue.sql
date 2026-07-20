-- Emergency admin login rescue.
-- Run this only if the admin side locks you out after installing admin roles.
-- It restores the old admin_users access behavior so the website can check admins again.

update public.admin_users
set role = coalesce(role, 'super_admin'),
    access_status = coalesce(access_status, 'Active'),
    updated_at = now()
where user_id is not null;

grant select on public.admin_users to authenticated;

alter table public.admin_users disable row level security;
