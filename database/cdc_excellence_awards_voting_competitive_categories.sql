update public.cdc_excellence_voting_settings set closes_at = '2026-10-22 12:00:00+02'::timestamptz, updated_at = now() where singleton is true;

create or replace function public.cdc_voting_candidates()
returns table(category text, nominee_name text, nominee_surname text, school_club text)
language sql
stable
security definer
set search_path = ''
as $$
  with candidates as (
    select n.category,
           min(btrim(n.nominee_name)) as nominee_name,
           min(btrim(n.nominee_surname)) as nominee_surname,
           min(btrim(n.school_club)) as school_club
    from public.cdc_excellence_nominations n
    where n.award_year = 2026
      and n.criteria_confirmed is true
      and n.eligibility_status = 'eligible'
      and n.acceptance_status = 'accepted'
    group by n.category,
      lower(regexp_replace(btrim(n.nominee_name), '[[:space:]]+', ' ', 'g')),
      lower(regexp_replace(btrim(n.nominee_surname), '[[:space:]]+', ' ', 'g'))
  ), eligible_categories as (
    select c.category
    from candidates c
    group by c.category
    having count(*) >= 2
  )
  select c.category, c.nominee_name, c.nominee_surname, c.school_club
  from candidates c
  join eligible_categories e using (category);
$$;

revoke all on function public.cdc_voting_candidates() from public;
grant execute on function public.cdc_voting_candidates() to anon, authenticated;

drop policy if exists cdc_awards_public_nominee_list_read on public.cdc_excellence_nominations;
create policy cdc_awards_public_nominee_list_read
  on public.cdc_excellence_nominations
  for select
  to anon
  using (
    criteria_confirmed is true
    and eligibility_status = 'eligible'
    and acceptance_status = 'accepted'
    and public.cdc_voting_is_open()
    and exists (
      select 1 from public.cdc_voting_candidates() c
      where c.category = cdc_excellence_nominations.category
    )
  );

create or replace function public.cdc_voting_winners()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with tallies as (
    select v.category, v.nominee_name, v.nominee_surname, count(*) as private_tally
    from public.cdc_excellence_votes v
    join public.cdc_voting_candidates() c
      on c.category = v.category
     and lower(regexp_replace(btrim(c.nominee_name), '[[:space:]]+', ' ', 'g'))
         = lower(regexp_replace(btrim(v.nominee_name), '[[:space:]]+', ' ', 'g'))
     and lower(regexp_replace(btrim(c.nominee_surname), '[[:space:]]+', ' ', 'g'))
         = lower(regexp_replace(btrim(v.nominee_surname), '[[:space:]]+', ' ', 'g'))
    where v.award_year = 2026
    group by v.category, v.nominee_name, v.nominee_surname
  ), ranked as (
    select t.category, t.nominee_name, t.nominee_surname,
      rank() over (partition by t.category order by t.private_tally desc) as place
    from tallies t
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'category', r.category,
    'name', r.nominee_name,
    'surname', r.nominee_surname
  ) order by r.category, r.nominee_surname, r.nominee_name), '[]'::jsonb)
  from ranked r
  where r.place = 1;
$$;
