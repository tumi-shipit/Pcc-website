import { redirect } from "next/navigation";

export default async function RedirectOldTournamentOrganisersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/tournaments/${id}/arbiters`);
}
