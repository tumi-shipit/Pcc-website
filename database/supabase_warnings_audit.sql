-- Supabase warning audit helper.
-- Run this in Supabase SQL Editor instead of opening warnings one by one.

-- 1. Functions missing an explicit search_path.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.proconfig as current_config
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prokind = 'f'
  and not exists (
    select 1
    from unnest(coalesce(p.proconfig, array[]::text[])) config
    where config like 'search_path=%'
  )
order by p.proname, arguments;

-- 2. RLS policies that are fully open for INSERT, UPDATE or DELETE.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual as using_expression,
  with_check as check_expression
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (
    lower(coalesce(qual, '')) in ('true', '(true)')
    or lower(coalesce(with_check, '')) in ('true', '(true)')
  )
order by tablename, policyname, cmd;

-- 3. Public SELECT policies that are open by design. These are often OK for
-- public website content, but they should still be reviewed.
select
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  qual as using_expression
from pg_policies
where schemaname = 'public'
  and cmd in ('SELECT', 'ALL')
  and lower(coalesce(qual, '')) in ('true', '(true)')
order by tablename, policyname, cmd;
