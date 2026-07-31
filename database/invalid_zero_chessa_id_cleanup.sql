-- Clean imported placeholder Chess SA IDs.
-- Some Swiss/Excel files use 0 when a player has no Chess SA ID.
-- On PCC this must be treated as blank, otherwise many players can collapse
-- into the same Player Centre record during bulk registration imports.

update public.players
set
  chess_sa_id = null,
  verification_status = case
    when verification_status::text = 'Verified' then 'Pending'::public.verification_status
    else verification_status
  end,
  updated_at = now()
where trim(coalesce(chess_sa_id, '')) in ('0', '0.0');

select 'invalid zero chessa ids cleaned' as status;
