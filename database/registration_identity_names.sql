-- Install BEFORE deploying the matching application changes.
-- Additive: no registrations, payments, names or player IDs are deleted/merged.
begin;
alter table public.players add column if not exists first_names text;
alter table public.players add column if not exists surname text;

-- Preserve the installed view's columns, filters and joins. Read identity from
-- the actual registered player, not a registration-time snapshot. Keep RLS.
do $$
declare
  definition text;
  columns_sql text;
begin
  definition := rtrim(pg_get_viewdef('public.registration_details'::regclass, true), E';\n ');
  select string_agg(
    case when a.attname = 'chess_sa_id' then 'p.chess_sa_id as chess_sa_id'
         when a.attname = 'first_names' then 'p.first_names as first_names'
         when a.attname = 'surname' then 'p.surname as surname'
         else format('existing.%I', a.attname) end, ', ' order by a.attnum)
  into columns_sql
  from pg_attribute a
  where a.attrelid = 'public.registration_details'::regclass and a.attnum > 0 and not a.attisdropped;
  if not exists (select 1 from pg_attribute where attrelid = 'public.registration_details'::regclass and attname = 'first_names' and not attisdropped) then
    columns_sql := columns_sql || ', p.first_names';
  end if;
  if not exists (select 1 from pg_attribute where attrelid = 'public.registration_details'::regclass and attname = 'surname' and not attisdropped) then
    columns_sql := columns_sql || ', p.surname';
  end if;
  execute format('create or replace view public.registration_details with (security_invoker = true) as select %s from (%s) existing left join public.registrations r on r.id = existing.registration_id left join public.players p on p.id = r.player_id', columns_sql, definition);
end $$;

-- Keep the existing receipt/recovery/payment validation intact. Store name parts
-- only for a profile created by this submission, never overwrite an existing child.
create or replace function public.submit_tournament_registration_named(
  p_full_name text, p_pcc_id text, p_chess_sa_id text, p_date_of_birth date,
  p_gender text, p_rating integer, p_email text, p_phone text, p_club text,
  p_province text, p_tournament_id uuid, p_section_id uuid,
  p_payment_status text, p_proof_of_payment_url text,
  p_first_names text, p_surname text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare receipt jsonb;
begin
  if nullif(trim(p_first_names), '') is not null or nullif(trim(p_surname), '') is not null then
    if nullif(trim(p_first_names), '') is null or nullif(trim(p_surname), '') is null
      or regexp_replace(trim(p_full_name), '\s+', ' ', 'g') <> regexp_replace(trim(p_first_names) || ' ' || trim(p_surname), '\s+', ' ', 'g') then
      raise exception 'First names and surname must match the submitted full name';
    end if;
  end if;
  receipt := public.submit_tournament_registration_recoverable(
    p_full_name, p_pcc_id, p_chess_sa_id, p_date_of_birth, p_gender, p_rating,
    p_email, p_phone, p_club, p_province, p_tournament_id, p_section_id,
    p_payment_status, p_proof_of_payment_url);
  if nullif(trim(p_first_names), '') is not null and nullif(trim(p_surname), '') is not null then
    update public.players p set first_names = trim(p_first_names), surname = trim(p_surname)
    from public.registrations r
    where r.id = (receipt->>'registrationId')::uuid and p.id = r.player_id
      and p.created_at >= transaction_timestamp()
      and p.first_names is null and p.surname is null
      and p.full_name = p_full_name and p.date_of_birth = p_date_of_birth;
  end if;
  return receipt;
end $$;
revoke all on function public.submit_tournament_registration_named(text,text,text,date,text,integer,text,text,text,text,uuid,uuid,text,text,text,text) from public;
grant execute on function public.submit_tournament_registration_named(text,text,text,date,text,integer,text,text,text,text,uuid,uuid,text,text,text,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
select 'Registration identity and structured names installed' as status;
