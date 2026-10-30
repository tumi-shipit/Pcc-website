-- Nominee attendance responses for the 2026 CDC Excellence Awards.
create table if not exists public.cdc_excellence_awards_rsvps (
  id uuid primary key default gen_random_uuid(),
  nominee_name text not null check (length(btrim(nominee_name)) between 1 and 80),
  nominee_surname text not null check (length(btrim(nominee_surname)) between 1 and 80),
  email text not null check (length(btrim(email)) between 3 and 254),
  phone text check (phone is null or length(btrim(phone)) <= 40),
  attending boolean not null,
  guest_count integer not null default 0,
  dietary_requirements text check (dietary_requirements is null or length(btrim(dietary_requirements)) <= 300),
  created_at timestamptz not null default now(),
  constraint cdc_awards_rsvp_attendance_guests_check
    check ((attending and guest_count between 0 and 1) or (not attending and guest_count = 0))
);

alter table public.cdc_excellence_awards_rsvps
  drop constraint if exists cdc_excellence_awards_rsvps_guest_count_check,
  drop constraint if exists cdc_awards_rsvp_attendance_guests_check,
  add constraint cdc_excellence_awards_rsvps_guest_count_check check (guest_count between 0 and 1),
  add constraint cdc_awards_rsvp_attendance_guests_check
    check ((attending and guest_count between 0 and 1) or (not attending and guest_count = 0));

alter table public.cdc_excellence_awards_rsvps enable row level security;
revoke all on public.cdc_excellence_awards_rsvps from public, anon, authenticated;
grant insert (nominee_name, nominee_surname, email, phone, attending, guest_count, dietary_requirements)
  on public.cdc_excellence_awards_rsvps to anon, authenticated;
grant select on public.cdc_excellence_awards_rsvps to authenticated;

drop policy if exists cdc_awards_public_rsvp_insert on public.cdc_excellence_awards_rsvps;
create policy cdc_awards_public_rsvp_insert
  on public.cdc_excellence_awards_rsvps
  for insert to anon, authenticated
  with check (
    length(btrim(nominee_name)) between 1 and 80
    and length(btrim(nominee_surname)) between 1 and 80
    and length(btrim(email)) between 3 and 254
    and guest_count between 0 and 1
    and (attending or guest_count = 0)
    and (now() at time zone 'Africa/Johannesburg') < timestamp '2026-11-14 17:00:00'
  );

drop policy if exists cdc_awards_admin_rsvp_read on public.cdc_excellence_awards_rsvps;
create policy cdc_awards_admin_rsvp_read
  on public.cdc_excellence_awards_rsvps
  for select to authenticated
  using ((select public.current_admin_role()) in ('super_admin', 'admin'));
