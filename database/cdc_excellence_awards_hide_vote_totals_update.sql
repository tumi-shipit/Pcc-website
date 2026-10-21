-- Apply this if cdc_excellence_awards_voting_setup.sql was already run.
-- Public and admin results expose winner names only after voting closes and
-- the announced publication time. Ties are returned together; counts are never returned.

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

revoke all on function public.cdc_voting_winners() from public, anon, authenticated;

create or replace function public.cdc_voting_responses_complete()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.cdc_excellence_nominations n
    where n.award_year = 2026
      and n.criteria_confirmed is true
      and n.eligibility_status = 'eligible'
  ) and not exists (
    select 1 from public.cdc_excellence_nominations n
    where n.award_year = 2026
      and n.criteria_confirmed is true
      and n.eligibility_status = 'eligible'
      and n.acceptance_status = 'pending'
  );
$$;

revoke all on function public.cdc_voting_responses_complete() from public, anon, authenticated;

create or replace function public.cdc_voting_is_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select now() >= s.opens_at or public.cdc_voting_responses_complete()
  from public.cdc_excellence_voting_settings s
  where s.singleton is true;
$$;

revoke all on function public.cdc_voting_is_open() from public;
grant execute on function public.cdc_voting_is_open() to anon, authenticated;

create or replace function public.cdc_voting_candidates()
returns table(category text, nominee_name text, nominee_surname text, school_club text)
language sql
stable
security definer
set search_path = ''
as $$
  select n.category,
         min(btrim(n.nominee_name)),
         min(btrim(n.nominee_surname)),
         min(btrim(n.school_club))
  from public.cdc_excellence_nominations n
  where n.award_year = 2026
    and n.criteria_confirmed is true
    and n.eligibility_status = 'eligible'
    and n.acceptance_status = 'accepted'
  group by n.category,
    lower(regexp_replace(btrim(n.nominee_name), '[[:space:]]+', ' ', 'g')),
    lower(regexp_replace(btrim(n.nominee_surname), '[[:space:]]+', ' ', 'g'));
$$;

revoke all on function public.cdc_voting_candidates() from public, anon, authenticated;

create or replace function public.cdc_open_voting_when_responses_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.cdc_voting_responses_complete() then
    update public.cdc_excellence_voting_settings
    set opens_at = least(opens_at, now()), updated_at = now()
    where singleton is true;
  end if;
  return new;
end;
$$;

drop trigger if exists cdc_open_voting_when_responses_complete
  on public.cdc_excellence_nominations;
create trigger cdc_open_voting_when_responses_complete
  after update of acceptance_status on public.cdc_excellence_nominations
  for each row
  when (new.acceptance_status in ('accepted', 'declined')
        and new.acceptance_status is distinct from old.acceptance_status)
  execute function public.cdc_open_voting_when_responses_complete();

update public.cdc_excellence_voting_settings
set opens_at = least(opens_at, now()), updated_at = now()
where singleton is true and public.cdc_voting_responses_complete();

drop policy if exists cdc_awards_public_nominee_list_read
  on public.cdc_excellence_nominations;
create policy cdc_awards_public_nominee_list_read
  on public.cdc_excellence_nominations
  for select
  to anon
  using (
    criteria_confirmed is true
    and eligibility_status = 'eligible'
    and acceptance_status = 'accepted'
    and public.cdc_voting_is_open()
  );

create or replace function public.cdc_get_voting_ballot()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_opens_at timestamptz;
  v_closes_at timestamptz;
  v_now timestamptz := now();
  v_state text;
  v_categories jsonb := '[]'::jsonb;
  v_my_votes jsonb := '[]'::jsonb;
  v_results_at timestamptz := timestamptz '2026-11-14 21:00:00+02';
  v_winners jsonb := null;
begin
  select s.opens_at, s.closes_at into v_opens_at, v_closes_at
  from public.cdc_excellence_voting_settings s where s.singleton is true;

  if v_now < v_opens_at then
    v_state := 'not_open';
  elsif v_closes_at is not null and v_now >= v_closes_at then
    v_state := 'closed';
  else
    v_state := 'open';
  end if;

  if v_state = 'open' then
    select coalesce(jsonb_agg(
      jsonb_build_object('category', grouped.category, 'nominees', grouped.nominees)
      order by grouped.category
    ), '[]'::jsonb)
    into v_categories
    from (
      select c.category,
        jsonb_agg(jsonb_build_object(
          'name', c.nominee_name,
          'surname', c.nominee_surname,
          'school_club', c.school_club
        ) order by c.nominee_surname, c.nominee_name) as nominees
      from public.cdc_voting_candidates() c
      group by c.category
    ) grouped;
  end if;

  if v_user_id is not null then
    select coalesce(jsonb_agg(jsonb_build_object(
      'category', v.category,
      'name', v.nominee_name,
      'surname', v.nominee_surname
    ) order by v.category), '[]'::jsonb)
    into v_my_votes
    from public.cdc_excellence_votes v
    where v.voter_id = v_user_id and v.award_year = 2026;
  end if;

  if v_state = 'closed' and v_now >= v_results_at then
    v_winners := public.cdc_voting_winners();
  end if;

  return jsonb_build_object(
    'state', v_state,
    'opens_at', v_opens_at,
    'closes_at', v_closes_at,
    'results_at', v_results_at,
    'winners', v_winners,
    'categories', v_categories,
    'my_votes', v_my_votes
  );
end;
$$;

revoke all on function public.cdc_get_voting_ballot() from public;
grant execute on function public.cdc_get_voting_ballot() to anon, authenticated;

create or replace function public.cdc_admin_get_voting_summary()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opens_at timestamptz;
  v_closes_at timestamptz;
  v_state text;
  v_winners jsonb := null;
  v_results_at timestamptz := timestamptz '2026-11-14 21:00:00+02';
begin
  if coalesce(public.current_admin_role(), '') not in ('admin', 'super_admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  select s.opens_at, s.closes_at into v_opens_at, v_closes_at
  from public.cdc_excellence_voting_settings s where s.singleton is true;
  v_state := case
    when now() < v_opens_at then 'not_open'
    when v_closes_at is not null and now() >= v_closes_at then 'closed'
    else 'open'
  end;

  if v_state = 'closed' and now() >= v_results_at then
    v_winners := public.cdc_voting_winners();
  end if;

  return jsonb_build_object(
    'state', v_state,
    'opens_at', v_opens_at,
    'closes_at', v_closes_at,
    'results_at', v_results_at,
    'winners', v_winners
  );
end;
$$;

revoke all on function public.cdc_admin_get_voting_summary() from public;
grant execute on function public.cdc_admin_get_voting_summary() to authenticated;
