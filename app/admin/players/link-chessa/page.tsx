import { redirect } from "next/navigation";

export default function RedirectOldChessSaLinkPage() {
  redirect("/admin/players/sync");
}
