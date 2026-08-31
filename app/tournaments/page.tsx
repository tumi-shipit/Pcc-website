import Navbar from "@/components/Navbar";
import Tournaments from "@/components/Tournaments";

type TournamentSearchParams = Promise<{
  search?: string;
  status?: string;
  province?: string;
}>;

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: TournamentSearchParams;
}) {
  const filters = await searchParams;

  return (
    <>
      <Navbar />
      <main className="pt-10">
        <Tournaments fullPage filters={filters} />
      </main>
    </>
  );
}
