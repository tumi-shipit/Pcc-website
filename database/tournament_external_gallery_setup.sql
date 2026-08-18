alter table public.tournaments
add column if not exists external_gallery_url text,
add column if not exists external_gallery_label text;

comment on column public.tournaments.external_gallery_url is
'External photo gallery link for tournament albums stored outside Supabase, such as Google Drive, Google Photos, MEGA or iCloud.';

comment on column public.tournaments.external_gallery_label is
'Public label for the external tournament gallery link.';
