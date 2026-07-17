grant select on public.tournament_officials to anon, authenticated;

drop policy if exists "Public can read tournament officials"
on public.tournament_officials;

create policy "Public can read tournament officials"
on public.tournament_officials
for select
to anon, authenticated
using (true);
