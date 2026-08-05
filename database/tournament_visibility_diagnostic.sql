-- Tournament visibility diagnostic.
-- Run this in Supabase SQL Editor and send the result tables back.
-- This does not change data.

select
  count(*) as total_tournaments,
  count(*) filter (
    where coalesce(registration_status::text, 'Open') <> 'Draft'
  ) as should_be_public,
  count(*) filter (
    where registration_status::text = 'Draft'
  ) as draft_tournaments,
  count(*) filter (
    where registration_status is null
  ) as blank_status_tournaments
from public.tournaments;

select
  coalesce(registration_status::text, '(blank)') as registration_status,
  count(*) as tournaments
from public.tournaments
group by coalesce(registration_status::text, '(blank)')
order by registration_status;

select
  id,
  tournament_name,
  start_date,
  registration_status::text as registration_status,
  case
    when coalesce(registration_status::text, 'Open') <> 'Draft'
      then 'SHOULD SHOW PUBLICLY'
    else 'HIDDEN AS DRAFT'
  end as public_visibility
from public.tournaments
order by
  case
    when coalesce(registration_status::text, 'Open') <> 'Draft' then 0
    else 1
  end,
  start_date desc nulls last,
  tournament_name;

select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'tournaments'
order by policyname;
