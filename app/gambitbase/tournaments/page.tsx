import GambitBaseShell from "@/components/gambitbase/GambitBaseShell";
import GambitBaseTournaments from "@/components/gambitbase/GambitBaseTournaments";

type TournamentSearchParams = Promise<{
  search?: string;
  status?: string;
  province?: string;
}>;

export default async function GambitBaseTournamentsPage({
  searchParams,
}: {
  searchParams: TournamentSearchParams;
}) {
  const filters = await searchParams;

  return (
    <GambitBaseShell>
      <main>
        <GambitBaseTournaments filters={filters} />
      </main>
    </GambitBaseShell>
  );
}
