-- CDC Excellence Awards 2026 public voting.
-- Apply this after cdc_excellence_awards_acceptance_setup.sql.
-- Any Supabase account with a confirmed email may vote once in each category.

create table if not exists public.cdc_excellence_voting_settings (
  singleton boolean primary key default true check (singleton is true),
  opens_at timestamptz not null default '2026-10-21 22:00:00+00',
  closes_at timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.cdc_excellence_voting_settings (singleton)
values (true)
on conflict (singleton) do nothing;

alter table public.cdc_excellence_voting_settings enable row level security;
revoke all on public.cdc_excellence_voting_settings from public, anon, authenticated;

create table if not exists public.cdc_excellence_votes (
  id uuid primary key default gen_random_uuid(),
  award_year integer not null default 2026 check (award_year = 2026),
  voter_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in (
    'Coach of the Year',
    'Arbiter of the Year',
    'Upcoming Arbiter of the Year',
    'Organiser of the Year',
    'Administrator of the Year',
    'Team Manager of the Year',
    'Upcoming Manager of the Year'
  )),
  nominee_name text not null,
  nominee_surname text not null,
  created_at timestamptz not null default now(),
  unique (voter_id, category)
);

alter table public.cdc_excellence_votes enable row level security;
revoke all on public.cdc_excellence_votes from public, anon, authenticated;
create index if not exists cdc_excellence_votes_result_idx
  on public.cdc_excellence_votes (category, nominee_surname, nominee_name);

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
    and (now() at time zone 'Africa/Johannesburg') >= timestamp '2026-10-22 00:00:00'
  group by n.category,
    lower(regexp_replace(btrim(n.nominee_name), '[[:space:]]+', ' ', 'g')),
    lower(regexp_replace(btrim(n.nominee_surname), '[[:space:]]+', ' ', 'g'));
$$;

revoke all on function public.cdc_voting_candidates() from public, anon, authenticated;

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
begin
  select s.opens_at, s.closes_at
  into v_opens_at, v_closes_at
  from public.cdc_excellence_voting_settings s
  where s.singleton is true;

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

  return jsonb_build_object(
    'state', v_state,
    'opens_at', v_opens_at,
    'closes_at', v_closes_at,
    'categories', v_categories,
    'my_votes', v_my_votes
  );
end;
$$;

revoke all on function public.cdc_get_voting_ballot() from public;
grant execute on function public.cdc_get_voting_ballot() to anon, authenticated;

create or replace function public.cdc_cast_voting_ballot(p_choices jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_confirmed_at timestamptz;
  v_opens_at timestamptz;
  v_closes_at timestamptz;
  v_expected_categories integer;
  v_choice_count integer;
  v_distinct_categories integer;
  v_inserted integer;
begin
  if v_user_id is null then
    raise exception 'Verify your email before voting.' using errcode = '42501';
  end if;

  select u.email_confirmed_at into v_confirmed_at
  from auth.users u where u.id = v_user_id;
  if v_confirmed_at is null then
    raise exception 'Verify your email before voting.' using errcode = '42501';
  end if;

  select s.opens_at, s.closes_at into v_opens_at, v_closes_at
  from public.cdc_excellence_voting_settings s where s.singleton is true;
  if now() < v_opens_at then
    raise exception 'Voting has not opened yet.' using errcode = '22023';
  end if;
  if v_closes_at is not null and now() >= v_closes_at then
    raise exception 'Voting has closed.' using errcode = '22023';
  end if;
  if jsonb_typeof(p_choices) is distinct from 'array' then
    raise exception 'Choose one nominee in every available category.' using errcode = '22023';
  end if;

  select count(distinct c.category) into v_expected_categories
  from public.cdc_voting_candidates() c;
  select count(*), count(distinct choice.value->>'category')
  into v_choice_count, v_distinct_categories
  from jsonb_array_elements(p_choices) as choice(value);

  if v_expected_categories = 0
     or v_choice_count <> v_expected_categories
     or v_distinct_categories <> v_expected_categories then
    raise exception 'Choose exactly one nominee in every available category.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_choices) as choice(value)
    where not exists (
      select 1 from public.cdc_voting_candidates() c
      where c.category = choice.value->>'category'
        and lower(regexp_replace(btrim(c.nominee_name), '[[:space:]]+', ' ', 'g'))
            = lower(regexp_replace(btrim(coalesce(choice.value->>'name', '')), '[[:space:]]+', ' ', 'g'))
        and lower(regexp_replace(btrim(c.nominee_surname), '[[:space:]]+', ' ', 'g'))
            = lower(regexp_replace(btrim(coalesce(choice.value->>'surname', '')), '[[:space:]]+', ' ', 'g'))
    )
  ) then
    raise exception 'One or more selections are not on the accepted nominee list.' using errcode = '22023';
  end if;

  begin
    insert into public.cdc_excellence_votes (voter_id, category, nominee_name, nominee_surname)
    select v_user_id, c.category, c.nominee_name, c.nominee_surname
    from jsonb_array_elements(p_choices) as choice(value)
    join public.cdc_voting_candidates() c
      on c.category = choice.value->>'category'
     and lower(regexp_replace(btrim(c.nominee_name), '[[:space:]]+', ' ', 'g'))
         = lower(regexp_replace(btrim(choice.value->>'name'), '[[:space:]]+', ' ', 'g'))
     and lower(regexp_replace(btrim(c.nominee_surname), '[[:space:]]+', ' ', 'g'))
         = lower(regexp_replace(btrim(choice.value->>'surname'), '[[:space:]]+', ' ', 'g'));
  exception when unique_violation then
    raise exception 'A vote was already recorded for one or more categories. Submitted votes cannot be changed.' using errcode = '23505';
  end;
  get diagnostics v_inserted = row_count;

  if v_inserted <> v_expected_categories then
    raise exception 'A vote was already recorded for one or more categories. Submitted votes cannot be changed.' using errcode = '23505';
  end if;

  return public.cdc_get_voting_ballot();
end;
$$;

revoke all on function public.cdc_cast_voting_ballot(jsonb) from public;
grant execute on function public.cdc_cast_voting_ballot(jsonb) to authenticated;

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
  v_results jsonb := null;
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

  if v_state = 'closed' then
    select coalesce(jsonb_agg(jsonb_build_object(
      'category', totals.category,
      'name', totals.nominee_name,
      'surname', totals.nominee_surname,
      'votes', totals.vote_count
    ) order by totals.category, totals.vote_count desc, totals.nominee_surname, totals.nominee_name), '[]'::jsonb)
    into v_results
    from (
      select v.category, v.nominee_name, v.nominee_surname, count(*)::integer as vote_count
      from public.cdc_excellence_votes v
      where v.award_year = 2026
      group by v.category, v.nominee_name, v.nominee_surname
    ) totals;
  end if;

  return jsonb_build_object(
    'state', v_state,
    'opens_at', v_opens_at,
    'closes_at', v_closes_at,
    'voter_count', (select count(distinct v.voter_id) from public.cdc_excellence_votes v where v.award_year = 2026),
    'results', v_results
  );
end;
$$;

create or replace function public.cdc_admin_set_voting_close_at(p_closes_at timestamptz)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_opens_at timestamptz;
begin
  if coalesce(public.current_admin_role(), '') not in ('admin', 'super_admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;
  select s.opens_at into v_opens_at
  from public.cdc_excellence_voting_settings s where s.singleton is true;
  if p_closes_at is not null and p_closes_at < v_opens_at then
    raise exception 'The voting close must be at or after the voting open time.' using errcode = '22023';
  end if;
  update public.cdc_excellence_voting_settings
  set closes_at = p_closes_at, updated_at = now()
  where singleton is true;
  return p_closes_at;
end;
$$;

revoke all on function public.cdc_admin_get_voting_summary() from public;
grant execute on function public.cdc_admin_get_voting_summary() to authenticated;
revoke all on function public.cdc_admin_set_voting_close_at(timestamptz) from public;
grant execute on function public.cdc_admin_set_voting_close_at(timestamptz) to authenticated;
