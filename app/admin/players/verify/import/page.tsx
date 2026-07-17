import { redirect } from "next/navigation";

export default function RedirectOldVerificationImportPage() {
  redirect("/admin/players/sync");
}
