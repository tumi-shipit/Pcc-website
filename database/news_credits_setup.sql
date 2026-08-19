create table if not exists public.news_organisations (
  id uuid primary key default gen_random_uuid(),
  news_post_id uuid not null references public.news_posts(id) on delete cascade,
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  role text not null default 'Organisation',
  representative_name text,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.news_officials (
  id uuid primary key default gen_random_uuid(),
  news_post_id uuid not null references public.news_posts(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  role text not null default 'Facilitator',
  notes text,
  display_order integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists news_organisations_post_idx
  on public.news_organisations(news_post_id, display_order);

create index if not exists news_officials_post_idx
  on public.news_officials(news_post_id, display_order);

alter table public.news_organisations enable row level security;
alter table public.news_officials enable row level security;

drop policy if exists "Public can read news organisations" on public.news_organisations;
create policy "Public can read news organisations"
  on public.news_organisations
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.news_posts
      where news_posts.id = news_organisations.news_post_id
        and news_posts.published = true
    )
  );

drop policy if exists "Admins manage news organisations" on public.news_organisations;
create policy "Admins manage news organisations"
  on public.news_organisations
  for all
  to authenticated
  using (public.has_admin_access())
  with check (public.has_admin_access());

drop policy if exists "Public can read news officials" on public.news_officials;
create policy "Public can read news officials"
  on public.news_officials
  for select
  to anon, authenticated
  using (
    exists (
      select 1
      from public.news_posts
      where news_posts.id = news_officials.news_post_id
        and news_posts.published = true
    )
  );

drop policy if exists "Admins manage news officials" on public.news_officials;
create policy "Admins manage news officials"
  on public.news_officials
  for all
  to authenticated
  using (public.has_admin_access())
  with check (public.has_admin_access());
