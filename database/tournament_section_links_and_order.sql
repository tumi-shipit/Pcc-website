alter table public.tournament_sections
add column if not exists chess_results_url text,
add column if not exists display_order integer;

with ordered_sections as (
  select
    id,
    row_number() over (
      partition by tournament_id
      order by
        case when minimum_birth_year is null then 1 else 0 end,
        minimum_birth_year desc nulls last,
        section_name asc
    ) as next_order
  from public.tournament_sections
)
update public.tournament_sections as section
set display_order = ordered_sections.next_order
from ordered_sections
where section.id = ordered_sections.id
  and section.display_order is null;

create index if not exists tournament_sections_display_order_idx
on public.tournament_sections (tournament_id, display_order, section_name);
