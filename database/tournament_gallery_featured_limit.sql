create or replace function public.enforce_tournament_gallery_featured_limit()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  existing_count integer;
begin
  select count(*)
  into existing_count
  from public.tournament_gallery
  where tournament_id = new.tournament_id
    and id is distinct from new.id;

  if existing_count >= 4 then
    raise exception 'Tournament featured gallery is limited to 4 images.';
  end if;

  return new;
end;
$$;

drop trigger if exists tournament_gallery_featured_limit
on public.tournament_gallery;

create trigger tournament_gallery_featured_limit
before insert or update of tournament_id
on public.tournament_gallery
for each row
execute function public.enforce_tournament_gallery_featured_limit();
