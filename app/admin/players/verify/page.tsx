import { redirect } from "next/navigation";

export default function RedirectOldVerificationQueuePage() {
  redirect("/admin/players");
}
