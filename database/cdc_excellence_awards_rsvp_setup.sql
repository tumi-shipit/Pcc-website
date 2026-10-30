-- Nominee attendance responses for the 2026 CDC Excellence Awards.
create table if not exists public.cdc_excellence_awards_rsvps (
  id uuid primary key default gen_random_uuid(),
  nominee_name text not null check (length(btrim(nominee_name)) between 1 and 80),
  nominee_surname text not null check (length(btrim(nominee_surname)) between 1 and 80),
  respondent_role text not null default 'nominee',
  nominee_host_name text,
  nomination_categories text[] not null default '{}',
  email text not null check (length(btrim(email)) between 3 and 254),
  phone text check (phone is null or length(btrim(phone)) <= 40),
  attending boolean not null,
  guest_count integer not null default 0,
  guest_name text,
  dietary_requirements text check (dietary_requirements is null or length(btrim(dietary_requirements)) <= 300),
  created_at timestamptz not null default now(),
  constraint cdc_awards_rsvp_attendance_guests_check
    check ((attending and guest_count between 0 and 1) or (not attending and guest_count = 0))
);

alter table public.cdc_excellence_awards_rsvps
  add column if not exists respondent_role text not null default 'nominee',
  add column if not exists nominee_host_name text,
  add column if not exists nomination_categories text[] not null default '{}',
  add column if not exists guest_name text;

update public.cdc_excellence_awards_rsvps
set nominee_host_name = btrim(nominee_name || ' ' || nominee_surname)
where nominee_host_name is null or btrim(nominee_host_name) = '';

alter table public.cdc_excellence_awards_rsvps
  drop constraint if exists cdc_excellence_awards_rsvps_guest_count_check,
  drop constraint if exists cdc_awards_rsvp_attendance_guests_check,
  drop constraint if exists cdc_awards_rsvp_respondent_role_check,
  drop constraint if exists cdc_awards_rsvp_host_name_check,
  drop constraint if exists cdc_awards_rsvp_categories_check,
  drop constraint if exists cdc_awards_rsvp_guest_name_check,
  add constraint cdc_excellence_awards_rsvps_guest_count_check check (guest_count between 0 and 1),
  add constraint cdc_awards_rsvp_attendance_guests_check
    check (
      ((attending and guest_count between 0 and 1) or (not attending and guest_count = 0))
      and (
        (respondent_role = 'nominee' and (
          (guest_count = 0 and guest_name is null)
          or (guest_count = 1 and attending and length(btrim(coalesce(guest_name, ''))) between 1 and 161)
        ))
        or (respondent_role = 'guest' and guest_count = 0 and guest_name is null)
      )
    ),
  add constraint cdc_awards_rsvp_respondent_role_check check (respondent_role in ('nominee', 'guest')),
  add constraint cdc_awards_rsvp_host_name_check check (length(btrim(nominee_host_name)) between 1 and 161),
  add constraint cdc_awards_rsvp_categories_check check (
    cardinality(nomination_categories) = 0
    or (
      cardinality(nomination_categories) between 1 and 7
      and nomination_categories <@ array[
        'Arbiter of the Year',
        'Coach of the Year',
        'Administrator of the Year',
        'Manager of the Year',
        'Upcoming Arbiter of the Year',
        'Upcoming Manager of the Year',
        'Organiser of the Year'
      ]::text[]
    )
  ),
  add constraint cdc_awards_rsvp_guest_name_check check (guest_name is null or length(btrim(guest_name)) between 1 and 161);

alter table public.cdc_excellence_awards_rsvps alter column nominee_host_name set not null;

create unique index if not exists cdc_awards_rsvps_one_attending_guest_idx
  on public.cdc_excellence_awards_rsvps (lower(regexp_replace(btrim(nominee_host_name), '[[:space:]]+', ' ', 'g')))
  where respondent_role = 'guest' and attending is true;

alter table public.cdc_excellence_awards_rsvps enable row level security;
revoke all on public.cdc_excellence_awards_rsvps from public, anon, authenticated;
grant insert (nominee_name, nominee_surname, respondent_role, nominee_host_name, nomination_categories, email, phone, attending, guest_count, guest_name, dietary_requirements)
  on public.cdc_excellence_awards_rsvps to anon, authenticated;
grant select on public.cdc_excellence_awards_rsvps to authenticated;
grant delete on public.cdc_excellence_awards_rsvps to authenticated;

drop policy if exists cdc_awards_public_rsvp_insert on public.cdc_excellence_awards_rsvps;
create policy cdc_awards_public_rsvp_insert
  on public.cdc_excellence_awards_rsvps
  for insert to anon, authenticated
  with check (
    length(btrim(nominee_name)) between 1 and 80
    and length(btrim(nominee_surname)) between 1 and 80
    and respondent_role in ('nominee', 'guest')
    and length(btrim(nominee_host_name)) between 1 and 161
    and (
      (
        respondent_role = 'nominee'
        and cardinality(nomination_categories) between 1 and 7
        and nomination_categories <@ array[
          'Arbiter of the Year',
          'Coach of the Year',
          'Administrator of the Year',
          'Manager of the Year',
          'Upcoming Arbiter of the Year',
          'Upcoming Manager of the Year',
          'Organiser of the Year'
        ]::text[]
      )
      or (respondent_role = 'guest' and cardinality(nomination_categories) = 0)
    )
    and length(btrim(email)) between 3 and 254
    and guest_count between 0 and 1
    and (attending or guest_count = 0)
    and (guest_name is null or length(btrim(guest_name)) between 1 and 161)
    and (
      (respondent_role = 'nominee' and (
        (guest_count = 0 and guest_name is null)
        or (guest_count = 1 and attending and length(btrim(coalesce(guest_name, ''))) between 1 and 161)
      ))
      or (respondent_role = 'guest' and guest_count = 0 and guest_name is null)
    )
    and (now() at time zone 'Africa/Johannesburg') < timestamp '2026-11-14 17:00:00'
  );

drop policy if exists cdc_awards_admin_rsvp_read on public.cdc_excellence_awards_rsvps;
create policy cdc_awards_admin_rsvp_read
  on public.cdc_excellence_awards_rsvps
  for select to authenticated
  using ((select public.current_admin_role()) in ('super_admin', 'admin'));

drop policy if exists cdc_awards_admin_rsvp_delete on public.cdc_excellence_awards_rsvps;
create policy cdc_awards_admin_rsvp_delete
  on public.cdc_excellence_awards_rsvps
  for delete to authenticated
  using ((select public.current_admin_role()) in ('super_admin', 'admin'));
