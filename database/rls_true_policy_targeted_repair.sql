-- Targeted repair for overly broad RLS policies from Supabase warnings.
-- Run this in Supabase SQL Editor.
--
-- This tightens admin/internal policies while leaving intentional public
-- read access in place for the website's public tournament and organisation pages.

-- Import sessions are admin-only operational records.
alter table public.import_sessions enable row level security;
alter table public.import_session_rows enable row level security;

drop policy if exists "Authenticated users can read import sessions"
on public.import_sessions;
drop policy if exists "Authenticated users can read import_session_rows"
on public.import_session_rows;
drop policy if exists "Authenticated users can read import session rows"
on public.import_session_rows;

create policy "Admins can read import sessions"
on public.import_sessions
for select
to authenticated
using (public.has_admin_access());

create policy "Admins can read import session rows"
on public.import_session_rows
for select
to authenticated
using (public.has_admin_access());

-- Public readers can only see published news. Admins manage all news.
alter table public.news_posts enable row level security;

drop policy if exists "Admins can manage news"
on public.news_posts;
drop policy if exists "Public can read published news"
on public.news_posts;

create policy "Public can read published news"
on public.news_posts
for select
to anon, authenticated
using (published = true);

create policy "Admins can manage news"
on public.news_posts
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

-- Tournament results are public to read, but only admins should write/manage.
alter table public.tournament_results enable row level security;

drop policy if exists "Admins can manage tournament results"
on public.tournament_results;

create policy "Admins can manage tournament results"
on public.tournament_results
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());
