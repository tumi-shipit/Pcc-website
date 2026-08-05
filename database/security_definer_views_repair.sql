-- Repair Supabase security warnings for public views.
-- Run this in Supabase SQL Editor.
--
-- These views should respect the permissions/RLS of the user querying them
-- instead of running with the view owner's privileges.

alter view if exists public.tournament_public_stats
set (security_invoker = true);

alter view if exists public.registration_details
set (security_invoker = true);

alter view if exists public.public_tournament_role_profiles
set (security_invoker = true);

grant select on public.tournament_public_stats to anon, authenticated;
grant select on public.registration_details to authenticated;
grant select on public.public_tournament_role_profiles to anon, authenticated;
