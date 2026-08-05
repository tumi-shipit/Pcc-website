-- Tournaments RLS recursion repair.
-- Run this in Supabase SQL Editor if tournament pages/admin show:
-- "infinite recursion detected in policy for relation \"tournaments\"".

grant usage on schema public to anon, authenticated;

do $$
declare
  public_columns text;
begin
  select string_agg(quote_ident(column_name), ', ' order by ordinal_position)
  into public_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'tournaments'
    and column_name = any (array[
      'id',
      'tournament_name',
      'organiser_name',
      'description',
      'tournament_report',
      'start_date',
      'end_date',
      'venue',
      'province',
      'registration_status',
      'rating_type',
      'entry_fee',
      'poster_image_url',
      'payment_details',
      'chess_results_url',
      'arbiter_player_id'
    ]);

  if public_columns is null then
    raise exception 'No public tournament columns were found. Check public.tournaments.';
  end if;

  execute format(
    'grant select (%s) on public.tournaments to anon, authenticated',
    public_columns
  );
end
$$;

grant select, insert, update, delete on public.tournaments to authenticated;

alter table public.tournaments enable row level security;

-- Remove old/duplicate policies. The assigned-organiser policy is the one that
-- can recurse when tournament_organiser_access also checks tournaments.
drop policy if exists "Organisers can read assigned tournaments"
on public.tournaments;

drop policy if exists "Allow public to view published tournaments"
on public.tournaments;

drop policy if exists "Public can read published tournaments"
on public.tournaments;

drop policy if exists "Public can read non-draft tournaments"
on public.tournaments;

drop policy if exists "Public can read non-draft tournaments safely"
on public.tournaments;

drop policy if exists "Members can read public tournaments"
on public.tournaments;

drop policy if exists "Admins manage tournaments"
on public.tournaments;

drop policy if exists "Admins can manage tournaments"
on public.tournaments;

create policy "Public can read non-draft tournaments safely"
on public.tournaments
for select
to anon, authenticated
using (
  coalesce(registration_status::text, 'Open') <> 'Draft'
);

create policy "Admins can manage tournaments"
on public.tournaments
for all
to authenticated
using (public.has_admin_access())
with check (public.has_admin_access());

notify pgrst, 'reload schema';

select
  'tournaments rls recursion repaired' as status,
  count(*) filter (
    where coalesce(registration_status::text, 'Open') <> 'Draft'
  ) as public_tournaments,
  count(*) filter (
    where registration_status::text = 'Draft'
  ) as draft_tournaments,
  count(*) as total_tournaments
from public.tournaments;
