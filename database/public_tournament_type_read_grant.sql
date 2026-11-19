-- Public tournament pages use the event type to group entry lists at the
-- correct chess structure level. This grants read access to that public label
-- only; it does not change tournament data or write access.
grant select (tournament_type) on public.tournaments to anon, authenticated;

notify pgrst, 'reload schema';
