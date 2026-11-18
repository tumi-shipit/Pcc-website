-- Anonymous feedback for the 2026 Capricorn District Chess Excellence Awards.
-- Admin and Super Admin users can read submissions in the CDC awards dashboard.

create table if not exists public.cdc_awards_feedback (
  id uuid primary key default gen_random_uuid(),
  award_year integer not null default 2026,
  satisfaction smallint not null check (satisfaction between 1 and 5),
  what_worked_well text not null default '',
  improvements text not null default '',
  issues_faced text not null default '',
  created_at timestamptz not null default now(),
  constraint cdc_awards_feedback_year_check check (award_year = 2026),
  constraint cdc_awards_feedback_text_length_check check (
    char_length(what_worked_well) <= 2000
    and char_length(improvements) <= 2000
    and char_length(issues_faced) <= 2000
  )
);

create index if not exists cdc_awards_feedback_created_at_idx
  on public.cdc_awards_feedback (created_at desc);

alter table public.cdc_awards_feedback enable row level security;

revoke all on public.cdc_awards_feedback from anon, authenticated;
grant insert (satisfaction, what_worked_well, improvements, issues_faced)
  on public.cdc_awards_feedback to anon, authenticated;
grant select on public.cdc_awards_feedback to authenticated;

drop policy if exists cdc_awards_feedback_public_insert on public.cdc_awards_feedback;
create policy cdc_awards_feedback_public_insert
  on public.cdc_awards_feedback
  for insert
  to anon, authenticated
  with check (
    award_year = 2026
    and satisfaction between 1 and 5
    and char_length(what_worked_well) <= 2000
    and char_length(improvements) <= 2000
    and char_length(issues_faced) <= 2000
  );

drop policy if exists cdc_awards_feedback_admin_read on public.cdc_awards_feedback;
create policy cdc_awards_feedback_admin_read
  on public.cdc_awards_feedback
  for select
  to authenticated
  using ((select public.current_admin_role()) in ('super_admin', 'admin'));
