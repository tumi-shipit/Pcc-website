-- Replace nominee email verification with an email field on the private
-- response form. The one-time UUID invitation link authorizes the response.

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

revoke all on function public.cdc_submit_nominee_acceptance(uuid, text, jsonb) from public;
grant execute on function public.cdc_submit_nominee_acceptance(uuid, text, jsonb) to anon, authenticated;
