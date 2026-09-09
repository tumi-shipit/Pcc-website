-- Install before deploying the registration recovery UI. Existing entries are untouched.
begin;
create table if not exists public.registration_recovery (
  registration_id uuid primary key references public.registrations(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);
alter table public.registration_recovery enable row level security;
revoke all on public.registration_recovery from public, anon, authenticated;
grant all on public.registration_recovery to service_role;

create or replace function public.submit_tournament_registration_recoverable(
  p_full_name text, p_pcc_id text, p_chess_sa_id text, p_date_of_birth date,
  p_gender text, p_rating integer, p_email text, p_phone text, p_club text,
  p_province text, p_tournament_id uuid, p_section_id uuid,
  p_payment_status text, p_proof_of_payment_url text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  entry_id uuid;
  recovery_token text := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
begin
  -- A public submission cannot assert that money was received.
  entry_id := public.submit_tournament_registration_with_receipt(
    p_full_name, p_pcc_id, p_chess_sa_id, p_date_of_birth, p_gender, p_rating,
    p_email, p_phone, p_club, p_province, p_tournament_id, p_section_id,
    case when p_payment_status = 'Proof Submitted' then 'Proof Submitted' else 'Pending' end,
    p_proof_of_payment_url
  );
  insert into public.registration_recovery(registration_id, token) values(entry_id, recovery_token);
  return jsonb_build_object('registrationId', entry_id, 'recoveryToken', recovery_token);
end $$;
revoke all on function public.submit_tournament_registration_recoverable(text,text,text,date,text,integer,text,text,text,text,uuid,uuid,text,text) from public;
grant execute on function public.submit_tournament_registration_recoverable(text,text,text,date,text,integer,text,text,text,text,uuid,uuid,text,text) to anon, authenticated;
notify pgrst, 'reload schema';
commit;
select 'Registration payment recovery installed' as status;
