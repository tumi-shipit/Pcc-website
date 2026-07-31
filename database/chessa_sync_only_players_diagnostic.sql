-- Diagnostic only: possible Player Centre records created by Chess SA Sync.
-- Review these rows before deleting anything. A player should stay in Player
-- Centre if they have registrations, results, memberships, roles, gallery,
-- news, or any confirmed PCC activity.

select
  players.id,
  players.full_name,
  players.chess_sa_id,
  players.date_of_birth,
  players.rating,
  players.club,
  players.province,
  players.created_at,
  players.updated_at
from public.players
where players.chess_sa_id is not null
  and trim(players.chess_sa_id) <> ''
  and not exists (
    select 1 from public.registrations
    where registrations.player_id = players.id
  )
  and not exists (
    select 1 from public.tournament_results
    where tournament_results.player_id = players.id
  )
  and not exists (
    select 1 from public.tournament_officials
    where tournament_officials.player_id = players.id
  )
  and not exists (
    select 1 from public.member_memberships
    where member_memberships.player_id = players.id
  )
order by players.created_at desc nulls last, players.full_name;
