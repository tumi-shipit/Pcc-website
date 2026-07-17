import { redirect } from "next/navigation";

export default async function RedirectOldTournamentImportResultsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/tournaments/${id}/archive`);
}
