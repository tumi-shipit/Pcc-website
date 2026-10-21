-- Shift nominee responses to close and public nominee listing to open at
-- 00:00 on 22 October 2026 in South Africa (Africa/Johannesburg).

grant select on public.cdc_excellence_nominations to authenticated;
grant update (acceptance_status, acceptance_token, accepted_email)
  on public.cdc_excellence_nominations to authenticated;

drop policy if exists cdc_awards_admin_nomination_read
  on public.cdc_excellence_nominations;
create policy cdc_awards_admin_nomination_read
  on public.cdc_excellence_nominations
  for select
  to authenticated
  using ((select public.current_admin_role()) in ('super_admin', 'admin'));

drop policy if exists cdc_awards_admin_nomination_update
  on public.cdc_excellence_nominations;
create policy cdc_awards_admin_nomination_update
  on public.cdc_excellence_nominations
  for update
  to authenticated
  using ((select public.current_admin_role()) in ('super_admin', 'admin'))
  with check ((select public.current_admin_role()) in ('super_admin', 'admin'));

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
    and (now() at time zone 'Africa/Johannesburg') >= timestamp '2026-10-22 00:00:00'
  );

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

-- The existing response RPC is retained. This trigger enforces the new
-- cutoff for that RPC and any other API update that attempts an acceptance.
create or replace function public.cdc_enforce_nominee_acceptance_deadline()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.acceptance_status in ('accepted', 'declined')
     and new.acceptance_status is distinct from old.acceptance_status
     and (now() at time zone 'Africa/Johannesburg') >= timestamp '2026-10-22 00:00:00' then
    raise exception 'The nominee response period has closed.' using errcode = '22023';
  end if;
  return new;
end;
$$;

drop trigger if exists cdc_nominee_acceptance_deadline
  on public.cdc_excellence_nominations;
create trigger cdc_nominee_acceptance_deadline
  before update on public.cdc_excellence_nominations
  for each row execute function public.cdc_enforce_nominee_acceptance_deadline();
