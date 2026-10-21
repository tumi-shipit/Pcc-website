-- Admin-only live CDC Excellence Awards vote tally.
-- Does not expose voter identities or make live totals public.
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
  v_tallies jsonb := '[]'::jsonb;
  v_total_voters integer := 0;
  v_total_votes integer := 0;
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

  select count(distinct v.voter_id)::integer, count(*)::integer
  into v_total_voters, v_total_votes
  from public.cdc_excellence_votes v
  where v.award_year = 2026;

  select coalesce(jsonb_agg(jsonb_build_object(
    'category', tally.category,
    'name', tally.nominee_name,
    'surname', tally.nominee_surname,
    'votes', tally.vote_count
  ) order by tally.category, tally.nominee_surname, tally.nominee_name), '[]'::jsonb)
  into v_tallies
  from (
    select c.category, c.nominee_name, c.nominee_surname, count(v.id)::integer as vote_count
    from public.cdc_voting_candidates() c
    left join public.cdc_excellence_votes v
      on v.award_year = 2026
     and v.category = c.category
     and v.nominee_name = c.nominee_name
     and v.nominee_surname = c.nominee_surname
    group by c.category, c.nominee_name, c.nominee_surname
  ) tally;

  if v_state = 'closed' and now() >= v_results_at then
    v_winners := public.cdc_voting_winners();
  end if;

  return jsonb_build_object(
    'state', v_state,
    'opens_at', v_opens_at,
    'closes_at', v_closes_at,
    'results_at', v_results_at,
    'winners', v_winners,
    'total_voters', v_total_voters,
    'total_votes', v_total_votes,
    'tallies', v_tallies
  );
end;
$$;

revoke all on function public.cdc_admin_get_voting_summary() from public;
grant execute on function public.cdc_admin_get_voting_summary() to authenticated;
