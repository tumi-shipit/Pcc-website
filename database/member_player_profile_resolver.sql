create or replace function public.resolve_member_player_profile()
returns table (
  id uuid,
  full_name text,
  chess_sa_id text,
  fide_id text,
  rating numeric,
  club text,
  province text,
  profile_photo_url text,
  verification_status text
)
language sql
security definer
set search_path = public
as $function$
  with current_member as (
    select *
    from public.member_memberships
    where
      user_id = auth.uid()
      or lower(member_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    order by end_date desc nulls last, created_at desc
    limit 1
  ),
  member_registration_details as (
    select distinct details.full_name, details.chess_sa_id, details.email
    from public.registration_details details
    cross join current_member member
    where
      lower(details.email) = lower(member.member_email)
      or (
        member.chess_sa_id is not null
        and details.chess_sa_id = member.chess_sa_id
      )
  ),
  member_registrations as (
    select distinct registrations.player_id
    from public.registrations registrations
    cross join current_member member
    where
      member.player_id is not null
      and registrations.player_id = member.player_id
  ),
  member_access as (
    select distinct access.player_id, access.chess_sa_id, access.organiser_name, access.organiser_email
    from public.tournament_organiser_access access
    cross join current_member member
    where
      lower(access.organiser_email) = lower(member.member_email)
      or (
        member.chess_sa_id is not null
        and access.chess_sa_id = member.chess_sa_id
      )
      or (
        member.player_id is not null
        and access.player_id = member.player_id
      )
  ),
  candidate_ids as (
    select players.id
    from public.players players
    join current_member member on players.id = member.player_id

    union

    select players.id
    from public.players players
    join current_member member
      on member.chess_sa_id is not null
      and players.chess_sa_id = member.chess_sa_id

    union

    select players.id
    from public.players players
    join current_member member
      on players.email is not null
      and lower(players.email) = lower(member.member_email)

    union

    select players.id
    from public.players players
    join member_registrations registrations
      on registrations.player_id = players.id

    union

    select players.id
    from public.players players
    join member_registration_details details
      on (
        details.chess_sa_id is not null
        and players.chess_sa_id = details.chess_sa_id
      )
      or lower(players.full_name) = lower(details.full_name)

    union

    select players.id
    from public.players players
    join member_access access
      on access.player_id = players.id
      or (
        access.chess_sa_id is not null
        and players.chess_sa_id = access.chess_sa_id
      )
      or lower(players.full_name) = lower(access.organiser_name)
  )
  select
    players.id,
    players.full_name,
    players.chess_sa_id,
    players.fide_id,
    players.rating,
    players.club,
    players.province,
    players.profile_photo_url,
    players.verification_status
  from public.players players
  join candidate_ids on candidate_ids.id = players.id
  order by
    case when players.profile_photo_url is not null and players.profile_photo_url <> '' then 1 else 0 end desc,
    case when players.verification_status = 'Verified' then 1 else 0 end desc,
    case when players.chess_sa_id is not null and players.chess_sa_id <> '' then 1 else 0 end desc,
    case when players.rating is not null then 1 else 0 end desc,
    players.full_name asc
  limit 1;
$function$;

grant execute on function public.resolve_member_player_profile() to authenticated;

select 'resolve_member_player_profile installed' as status;
