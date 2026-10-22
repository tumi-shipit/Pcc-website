-- Shared, admin-only storage for the temporary Google Forms CDC responses.
create table if not exists public.cdc_google_form_responses (
  response_key text primary key,
  email text not null,
  submitted_at timestamptz,
  answers jsonb not null,
  imported_at timestamptz not null default now()
);

revoke all on table public.cdc_google_form_responses from public;

create or replace function public.cdc_admin_get_google_form_responses()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(public.current_admin_role(), '') not in ('admin', 'super_admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  return coalesce((select jsonb_agg(r.answers order by r.submitted_at nulls last, r.response_key)
    from public.cdc_google_form_responses r), '[]'::jsonb);
end;
$$;

create or replace function public.cdc_admin_import_google_form_responses(p_rows jsonb)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  row_data jsonb;
  response_email text;
  response_timestamp text;
  response_key text;
  imported_count integer := 0;
begin
  if coalesce(public.current_admin_role(), '') not in ('admin', 'super_admin') then
    raise exception 'Admin access required.' using errcode = '42501';
  end if;

  for row_data in select value from jsonb_array_elements(coalesce(p_rows, '[]'::jsonb)) loop
    response_email := lower(trim(coalesce(row_data->>'Email Address', row_data->>'email', '')));
    response_timestamp := trim(coalesce(row_data->>'Timestamp', row_data->>'timestamp', ''));
    if response_email = '' then continue; end if;
    response_key := response_email;
    insert into public.cdc_google_form_responses(response_key, email, submitted_at, answers)
    values (
      response_key,
      response_email,
      null,
      row_data
    )
    on conflict (response_key) do nothing;
    if found then imported_count := imported_count + 1; end if;
  end loop;
  return imported_count;
end;
$$;

revoke all on function public.cdc_admin_get_google_form_responses() from public;
revoke all on function public.cdc_admin_import_google_form_responses(jsonb) from public;
grant execute on function public.cdc_admin_get_google_form_responses() to authenticated;
grant execute on function public.cdc_admin_import_google_form_responses(jsonb) to authenticated;
