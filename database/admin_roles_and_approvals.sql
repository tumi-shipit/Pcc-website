-- Admin roles and approval foundation.
-- Run this in Supabase before giving other people admin access.
-- Existing admins are kept as super_admin so you do not lock yourself out.

alter table public.admin_users
add column if not exists email text,
add column if not exists display_name text,
add column if not exists role text not null default 'super_admin',
add column if not exists access_status text not null default 'Active',
add column if not exists requires_super_admin_approval boolean not null default true,
add column if not exists created_at timestamptz not null default now(),
add column if not exists updated_at timestamptz not null default now();

alter table public.admin_users
drop constraint if exists admin_users_role_check;

alter table public.admin_users
add constraint admin_users_role_check
check (
  role in (
    'super_admin',
    'tournament_manager',
    'event_assistant',
    'payment_reviewer',
    'content_editor',
    'data_manager',
    'viewer'
  )
);

alter table public.admin_users
drop constraint if exists admin_users_access_status_check;

alter table public.admin_users
add constraint admin_users_access_status_check
check (access_status in ('Active', 'Suspended'));

create index if not exists admin_users_role_idx
on public.admin_users (role, access_status);

create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.admin_users
  where user_id = auth.uid()
    and access_status = 'Active'
  limit 1
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
grant select, insert, update on public.admin_users to authenticated;

drop policy if exists "Admins can read admin users" on public.admin_users;
drop policy if exists "Super admins can manage admin users" on public.admin_users;
alter table public.admin_users disable row level security;

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

grant execute on function public.current_admin_role() to authenticated;
grant execute on function public.is_super_admin() to authenticated;
grant execute on function public.admin_review_action_request(uuid, text, text) to authenticated;
