import { redirect } from "next/navigation";

export default function RedirectOldOperationsPage() {
  redirect("/admin/home");
}
