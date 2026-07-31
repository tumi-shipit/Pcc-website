-- Allow tournaments to be marked as postponed.
-- Run this once in Supabase before saving a tournament with the Postponed status.

alter table public.tournaments
add column if not exists postponement_reason text;

do $$
begin
  if exists (
    select 1
    from pg_type
    where typnamespace = 'public'::regnamespace
      and typname = 'tournament_registration_status'
  )
  and not exists (
    select 1
    from pg_enum
    join pg_type on pg_type.oid = pg_enum.enumtypid
    where pg_type.typnamespace = 'public'::regnamespace
      and pg_type.typname = 'tournament_registration_status'
      and pg_enum.enumlabel = 'Postponed'
  ) then
    alter type public.tournament_registration_status add value 'Postponed';
  end if;
end $$;

select 'tournament postponed status ready' as status;
