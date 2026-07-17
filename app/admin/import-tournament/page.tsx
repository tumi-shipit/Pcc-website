import { redirect } from "next/navigation";

export default function RedirectOldGlobalArchiveImportPage() {
  redirect("/admin/tournaments");
}
