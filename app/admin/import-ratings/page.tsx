import { redirect } from "next/navigation";

export default function RedirectOldRatingsImportPage() {
  redirect("/admin/players/sync");
}
