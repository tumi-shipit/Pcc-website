-- Close CDC Excellence Awards nominations and enable nominee responses.
-- Apply this to the Supabase project used by the PCC website.

alter table public.cdc_excellence_nominations
  add column if not exists eligibility_status text not null default 'pending',
  add column if not exists acceptance_status text not null default 'pending',
  add column if not exists acceptance_token uuid,
  add column if not exists accepted_email text;

alter table public.cdc_excellence_nominations
  drop constraint if exists cdc_excellence_nominations_eligibility_status_check,
  add constraint cdc_excellence_nominations_eligibility_status_check
    check (eligibility_status in ('pending', 'eligible', 'ineligible')),
  drop constraint if exists cdc_excellence_nominations_acceptance_status_check,
  add constraint cdc_excellence_nominations_acceptance_status_check
    check (acceptance_status in ('pending', 'accepted', 'declined'));

create index if not exists cdc_excellence_nominations_acceptance_token_idx
  on public.cdc_excellence_nominations (acceptance_token)
  where acceptance_token is not null;

-- The final poster shortlist is approved as supplied. Normalize confirmed
-- name order/spelling variants in the submissions and mark these rows for
-- private accept/decline invitations.
with approved(category, final_name, final_surname, submitted_name, submitted_surname) as (
  values
    ('Administrator of the Year', 'Elias', 'Mabotja', 'Elias', 'Mabotja'),
    ('Administrator of the Year', 'Tumelo', 'Mmola', 'Tumelo', 'Mmola'),
    ('Organiser of the Year', 'Elias', 'Mabotja', 'Elias', 'Mabotja'),
    ('Organiser of the Year', 'Tumelo', 'Mmola', 'Tumelo', 'Mmola'),
    ('Arbiter of the Year', 'Elias', 'Mabotja', 'Elias', 'Mabotja'),
    ('Arbiter of the Year', 'Tumelo', 'Mmola', 'Tumelo', 'Mmola'),
    ('Arbiter of the Year', 'Kobus', 'Verreynne', 'Kobus', 'Verreynne'),
    ('Upcoming Arbiter of the Year', 'Tumelo', 'Mmola', 'Tumelo', 'Mmola'),
    ('Coach of the Year', 'Joe', 'Mahomole', 'Joe', 'Mahomole'),
    ('Coach of the Year', 'Mohololo', 'Nkoana', 'Mohololo', 'Nkoana'),
    ('Coach of the Year', 'Mohololo', 'Nkoana', 'Nkoana', 'Mohololo'),
    ('Coach of the Year', 'Tumelo', 'Mmola', 'Tumelo', 'Mmola'),
    ('Coach of the Year', 'Anna', 'Chipape', 'Anna', 'Chipape'),
    ('Upcoming Manager of the Year', 'Thapelo', 'Sindani', 'Thapelo', 'Sindani'),
    ('Upcoming Manager of the Year', 'Thapelo', 'Sindani', 'Thapelo', 'Sindane'),
    ('Upcoming Manager of the Year', 'Thapelo', 'Sindani', 'Sindani', 'Thapelo'),
    ('Upcoming Manager of the Year', 'Thapelo', 'Sindani', 'Sindane', 'Thapelo'),
    ('Team Manager of the Year', 'Disele', 'Malope', 'Disele', 'Malope'),
    ('Team Manager of the Year', 'Elias', 'Mabotja', 'Elias', 'Mabotja'),
    ('Team Manager of the Year', 'Thapelo', 'Sindani', 'Thapelo', 'Sindani'),
    ('Team Manager of the Year', 'Thapelo', 'Sindani', 'Thapelo', 'Sindane'),
    ('Team Manager of the Year', 'Thapelo', 'Sindani', 'Sindani', 'Thapelo'),
    ('Team Manager of the Year', 'Thapelo', 'Sindani', 'Sindane', 'Thapelo')
)
update public.cdc_excellence_nominations n
set nominee_name = a.final_name,
    nominee_surname = a.final_surname,
    eligibility_status = 'eligible'
from approved a
where n.category = a.category
  and lower(btrim(n.nominee_name)) = lower(a.submitted_name)
  and lower(btrim(n.nominee_surname)) = lower(a.submitted_surname);

-- Nomination intake is closed immediately. Removing the INSERT policy blocks
-- direct Data API submissions as well as hiding the form in the website.
drop policy if exists cdc_awards_public_nomination_insert on public.cdc_excellence_nominations;
revoke insert on public.cdc_excellence_nominations from anon;

drop policy if exists cdc_awards_admin_nomination_update on public.cdc_excellence_nominations;
create policy cdc_awards_admin_nomination_update
  on public.cdc_excellence_nominations
  for update
  to authenticated
  using ((select public.current_admin_role()) in ('super_admin', 'admin'))
  with check ((select public.current_admin_role()) in ('super_admin', 'admin'));

grant update (eligibility_status, acceptance_status, acceptance_token, accepted_email)
  on public.cdc_excellence_nominations to authenticated;

drop policy if exists cdc_awards_public_nominee_list_read on public.cdc_excellence_nominations;
create policy cdc_awards_public_nominee_list_read
  on public.cdc_excellence_nominations
  for select
  to anon
  using (
    criteria_confirmed is true
    and eligibility_status = 'eligible'
    and acceptance_status = 'accepted'
    and (now() at time zone 'Africa/Johannesburg') >= timestamp '2026-10-22 00:00:00'
  );

grant select (nominee_name, nominee_surname, category, school_club, created_at,
              eligibility_status, acceptance_status)
  on public.cdc_excellence_nominations to anon;

create or replace function public.cdc_get_nominee_acceptance(p_token uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'nominee_name', min(n.nominee_name),
    'nominee_surname', min(n.nominee_surname),
    'categories', (
      select jsonb_agg(jsonb_build_object('category', c.category, 'response', c.acceptance_status) order by c.category)
      from (
        select distinct n2.category, n2.acceptance_status
        from public.cdc_excellence_nominations n2
        where n2.acceptance_token = p_token
          and n2.eligibility_status = 'eligible'
          and n2.criteria_confirmed is true
      ) c
    ),
    'open', (now() at time zone 'Africa/Johannesburg') < timestamp '2026-10-22 00:00:00'
  )
  from public.cdc_excellence_nominations n
  where n.acceptance_token = p_token
    and n.eligibility_status = 'eligible'
    and n.criteria_confirmed is true
  having count(*) > 0;
$$;

drop function if exists public.cdc_submit_nominee_acceptance(uuid, jsonb);
drop function if exists public.cdc_submit_nominee_acceptance(uuid, text, jsonb);
create function public.cdc_submit_nominee_acceptance(
  p_token uuid,
  p_email text,
  p_responses jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_count integer;
  v_response_count integer;
  v_updated integer;
begin
  if p_token is null then
    raise exception 'This private response link is invalid.' using errcode = '22023';
  end if;
  if length(v_email) > 254 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid email address.' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_token::text));

  if (now() at time zone 'Africa/Johannesburg') >= timestamp '2026-10-22 00:00:00' then
    raise exception 'The nominee response period has closed.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_responses) <> 'array' then
    raise exception 'Choose accept or decline for every category.' using errcode = '22023';
  end if;
  if exists (
      select 1 from jsonb_array_elements(p_responses) as response_row(value)
      where coalesce(response_row.value->>'response', '') not in ('accepted', 'declined')
    ) then
    raise exception 'Choose accept or decline for every category.' using errcode = '22023';
  end if;

  select count(distinct n.category) into v_count
  from public.cdc_excellence_nominations n
  where n.acceptance_token = p_token
    and n.eligibility_status = 'eligible'
    and n.criteria_confirmed is true;
  if v_count = 0 or jsonb_array_length(p_responses) <> v_count then
    raise exception 'This private response link is invalid or incomplete.' using errcode = '22023';
  end if;

  select count(distinct response_row.value->>'category') into v_response_count
  from jsonb_array_elements(p_responses) as response_row(value);
  if v_response_count <> v_count or exists (
    select 1
    from jsonb_array_elements(p_responses) as response_row(value)
    where not exists (
      select 1 from public.cdc_excellence_nominations n
      where n.acceptance_token = p_token
        and n.eligibility_status = 'eligible'
        and n.criteria_confirmed is true
        and n.category = response_row.value->>'category'
    )
  ) then
    raise exception 'Choose accept or decline for every eligible category.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.cdc_excellence_nominations n
    where n.acceptance_token = p_token
      and n.eligibility_status = 'eligible'
      and n.acceptance_status <> 'pending'
  ) then
    raise exception 'A response has already been recorded for this link.' using errcode = '22023';
  end if;

  update public.cdc_excellence_nominations n
  set acceptance_status = response_row.value->>'response', accepted_email = v_email
  from jsonb_array_elements(p_responses) as response_row(value)
  where n.acceptance_token = p_token
    and n.eligibility_status = 'eligible'
    and n.category = response_row.value->>'category'
    and n.criteria_confirmed is true
    and n.acceptance_status = 'pending';
  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    raise exception 'No response was saved. Check that every category is selected.' using errcode = '22023';
  end if;
  return true;
end;
$$;

revoke all on function public.cdc_get_nominee_acceptance(uuid) from public;
grant execute on function public.cdc_get_nominee_acceptance(uuid) to anon, authenticated;
revoke all on function public.cdc_submit_nominee_acceptance(uuid, text, jsonb) from public;
grant execute on function public.cdc_submit_nominee_acceptance(uuid, text, jsonb) to anon, authenticated;

