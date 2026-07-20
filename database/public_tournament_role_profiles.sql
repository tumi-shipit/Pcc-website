create or replace view public.public_tournament_role_profiles as
select
  concat('organiser-', access.id::text) as id,
  access.tournament_id,
  access.player_id,
  coalesce(nullif(access.role, ''), 'Organiser') as role,
  null::text as notes,
  'Organiser'::text as role_group,
  coalesce(players.full_name, access.organiser_name) as full_name,
  coalesce(players.chess_sa_id, access.chess_sa_id) as chess_sa_id,
  players.fide_id,
  players.rating,
  players.club,
  players.province,
  players.profile_photo_url
from public.tournament_organiser_access access
left join public.players players on players.id = access.player_id
where access.access_status = 'Active'

union all

select
  concat('official-', officials.id::text) as id,
  officials.tournament_id,
  officials.player_id,
  officials.role,
  officials.notes,
  'Official'::text as role_group,
  players.full_name,
  players.chess_sa_id,
  players.fide_id,
  players.rating,
  players.club,
  players.province,
  players.profile_photo_url
from public.tournament_officials officials
left join public.players players on players.id = officials.player_id;

grant select on public.public_tournament_role_profiles to anon, authenticated;
