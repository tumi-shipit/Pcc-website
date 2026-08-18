insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'organisation-logos',
  'organisation-logos',
  true,
  3145728,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can read organisation logos"
on storage.objects;

create policy "Public can read organisation logos"
on storage.objects
for select
to public
using (
  bucket_id = 'organisation-logos'
);

drop policy if exists "Admins can upload organisation logos"
on storage.objects;

create policy "Admins can upload organisation logos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'organisation-logos'
  and (
    public.has_admin_access()
    or public.can_edit_organisation(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "Admins can update organisation logos"
on storage.objects;

create policy "Admins can update organisation logos"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'organisation-logos'
  and (
    public.has_admin_access()
    or public.can_edit_organisation(((storage.foldername(name))[1])::uuid)
  )
)
with check (
  bucket_id = 'organisation-logos'
  and (
    public.has_admin_access()
    or public.can_edit_organisation(((storage.foldername(name))[1])::uuid)
  )
);

drop policy if exists "Admins can delete organisation logos"
on storage.objects;

create policy "Admins can delete organisation logos"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'organisation-logos'
  and (
    public.has_admin_access()
    or public.can_edit_organisation(((storage.foldername(name))[1])::uuid)
  )
);

notify pgrst, 'reload schema';

select 'Organisation logos storage installed' as status;
