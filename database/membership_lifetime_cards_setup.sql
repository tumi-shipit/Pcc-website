-- Adds secure digital cards for manually-created memberships and supports
-- memberships that never expire. Safe to run more than once.
alter table public.member_memberships
add column if not exists verification_token uuid not null default gen_random_uuid();

alter table public.member_memberships
add column if not exists payment_method text;

update public.member_memberships
set payment_method = 'Yoco'
where payment_method is null and notes ilike '%purchased through PCC membership checkout%';

create unique index if not exists member_memberships_verification_token_key
on public.member_memberships (verification_token);

-- The PCC Super Admin's approved lifetime membership.
update public.member_memberships
set membership_type = 'Lifetime',
    membership_status = 'Active',
    end_date = null,
    payment_method = 'Complimentary',
    notes = concat_ws(E'\n', nullif(notes, ''), 'Lifetime PCC membership'),
    updated_at = now()
where chess_sa_id = '198045799';

notify pgrst, 'reload schema';
select 'Lifetime and manual digital membership cards installed' as status;
