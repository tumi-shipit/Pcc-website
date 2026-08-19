create table if not exists public.verified_record_overrides (
  slug text primary key,
  title text,
  summary text,
  content text,
  image_url text,
  album_url text,
  album_label text,
  date_label text,
  organisations jsonb,
  facilitators jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

alter table public.verified_record_overrides
add column if not exists album_url text;

alter table public.verified_record_overrides
add column if not exists album_label text;

alter table public.verified_record_overrides enable row level security;

drop policy if exists "Public can read verified record overrides"
on public.verified_record_overrides;

create policy "Public can read verified record overrides"
on public.verified_record_overrides
for select
to anon, authenticated
using (true);

drop policy if exists "Super admins can insert verified record overrides"
on public.verified_record_overrides;

create policy "Super admins can insert verified record overrides"
on public.verified_record_overrides
for insert
to authenticated
with check (public.is_super_admin());

drop policy if exists "Super admins can update verified record overrides"
on public.verified_record_overrides;

create policy "Super admins can update verified record overrides"
on public.verified_record_overrides
for update
to authenticated
using (public.is_super_admin())
with check (public.is_super_admin());
