do $$
begin
  if to_regclass('public.players') is not null then
    create index if not exists players_chess_sa_id_lookup_idx
    on public.players (chess_sa_id)
    where chess_sa_id is not null and chess_sa_id <> '';
  end if;

  if to_regclass('public.tournament_officials') is not null then
    create index if not exists tournament_officials_player_id_idx
    on public.tournament_officials (player_id);
  end if;

  if to_regclass('public.tournament_organiser_access') is not null then
    create index if not exists tournament_organiser_access_chess_sa_id_idx
    on public.tournament_organiser_access (chess_sa_id);

    create index if not exists tournament_organiser_access_player_id_idx
    on public.tournament_organiser_access (player_id);
  end if;

  if to_regclass('public.member_memberships') is not null then
    create index if not exists member_memberships_chess_sa_id_lookup_idx
    on public.member_memberships (chess_sa_id)
    where chess_sa_id is not null and chess_sa_id <> '';
  end if;
end $$;

create or replace function public.refresh_chessa_identity_links()
returns table (
  memberships_linked integer,
  organiser_access_linked integer,
  organiser_access_chess_sa_filled integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  membership_count integer := 0;
  access_count integer := 0;
  access_chessa_count integer := 0;
begin
  if not exists (
    select 1
    from public.admin_users
    where admin_users.user_id = auth.uid()
  ) then
    raise exception 'Only PCC admins can refresh Chess SA identity links.';
  end if;

  update public.member_memberships memberships
  set
    player_id = players.id,
    chess_sa_id = players.chess_sa_id,
    updated_at = now()
  from public.players
  where players.chess_sa_id is not null
    and players.chess_sa_id <> ''
    and memberships.chess_sa_id = players.chess_sa_id
    and (
      memberships.player_id is distinct from players.id
      or memberships.chess_sa_id is distinct from players.chess_sa_id
    );

  get diagnostics membership_count = row_count;

  update public.tournament_organiser_access access
  set
    player_id = players.id,
    chess_sa_id = players.chess_sa_id
  from public.players
  where players.chess_sa_id is not null
    and players.chess_sa_id <> ''
    and access.chess_sa_id = players.chess_sa_id
    and (
      access.player_id is distinct from players.id
      or access.chess_sa_id is distinct from players.chess_sa_id
    );

  get diagnostics access_count = row_count;

  update public.tournament_organiser_access access
  set chess_sa_id = players.chess_sa_id
  from public.players
  where access.player_id = players.id
    and players.chess_sa_id is not null
    and players.chess_sa_id <> ''
    and (access.chess_sa_id is null or access.chess_sa_id = '');

  get diagnostics access_chessa_count = row_count;

  return query select membership_count, access_count, access_chessa_count;
end;
$$;

grant execute on function public.refresh_chessa_identity_links() to authenticated;
