insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'player-photos',
  'player-photos',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read player photos"
on storage.objects;

create policy "Public can read player photos"
on storage.objects
for select
to public
using (
  bucket_id = 'player-photos'
);

drop policy if exists "Admins can upload player photos"
on storage.objects;

create policy "Admins can upload player photos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'player-photos'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can update player photos"
on storage.objects;

create policy "Admins can update player photos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'player-photos'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'player-photos'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);

drop policy if exists "Admins can delete player photos"
on storage.objects;

create policy "Admins can delete player photos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'player-photos'
  and exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  )
);
