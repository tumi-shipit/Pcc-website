import { redirect } from "next/navigation";

export default async function RedirectOldTournamentResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/tournaments/${id}/archive`);
}
