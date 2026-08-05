-- Allows new/unrated players to register while still blocking rated players
-- whose rating falls outside the selected tournament section.

create or replace function public.registration_section_error(
  p_section_id uuid,
  p_date_of_birth date,
  p_gender text,
  p_rating integer
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  section_record record;
  player_birth_year integer;
  clean_gender text;
begin
  select
    section_name,
    minimum_birth_year,
    maximum_birth_year,
    minimum_rating,
    maximum_rating,
    gender_restriction
  into section_record
  from public.tournament_sections
  where id = p_section_id;

  if not found then
    return 'Tournament section was not found.';
  end if;

  if section_record.minimum_birth_year is not null
    or section_record.maximum_birth_year is not null then
    if p_date_of_birth is null then
      return 'Date of birth is required for this section.';
    end if;

    player_birth_year := extract(year from p_date_of_birth)::integer;

    if section_record.minimum_birth_year is not null
      and player_birth_year < section_record.minimum_birth_year then
      return format(
        'This player is not eligible for %s. This section is for players born %s or later.',
        section_record.section_name,
        section_record.minimum_birth_year
      );
    end if;

    if section_record.maximum_birth_year is not null
      and player_birth_year > section_record.maximum_birth_year then
      return format(
        'This player is not eligible for %s. This section is for players born %s or earlier.',
        section_record.section_name,
        section_record.maximum_birth_year
      );
    end if;
  end if;

  clean_gender := lower(trim(coalesce(p_gender, '')));

  if section_record.gender_restriction is not null
    and section_record.gender_restriction <> ''
    and lower(section_record.gender_restriction) <> 'all'
    and clean_gender <> lower(section_record.gender_restriction) then
    return format(
      '%s is restricted to %s players.',
      section_record.section_name,
      section_record.gender_restriction
    );
  end if;

  if p_rating is not null then
    if section_record.minimum_rating is not null
      and p_rating < section_record.minimum_rating then
      return format(
        'This player is not eligible for %s. This section is for players rated %s or higher.',
        section_record.section_name,
        section_record.minimum_rating
      );
    end if;

    if section_record.maximum_rating is not null
      and p_rating > section_record.maximum_rating then
      return format(
        'This player is not eligible for %s. This section is for players rated %s or below.',
        section_record.section_name,
        section_record.maximum_rating
      );
    end if;
  end if;

  return null;
end;
$$;

grant execute on function public.registration_section_error(uuid, date, text, integer)
to anon, authenticated;

notify pgrst, 'reload schema';

select 'Unrated registration section repair installed' as status;
