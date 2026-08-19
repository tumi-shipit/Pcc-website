alter table public.tournaments
  add column if not exists competition_document_url text,
  add column if not exists competition_document_label text;

comment on column public.tournaments.competition_document_url
  is 'Optional public link for a tournament prospectus, rules pack, invitation, circular or competition document.';

comment on column public.tournaments.competition_document_label
  is 'Optional public button label for the competition document link.';

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'competition-documents',
  'competition-documents',
  true,
  10485760,
  array['application/pdf']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Public can read competition documents'
  ) then
    create policy "Public can read competition documents"
      on storage.objects
      for select
      to anon, authenticated
      using (bucket_id = 'competition-documents');
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Admins can upload competition documents'
  ) then
    create policy "Admins can upload competition documents"
      on storage.objects
      for insert
      to authenticated
      with check (
        bucket_id = 'competition-documents'
        and public.has_admin_access()
      );
  end if;
end $$;
