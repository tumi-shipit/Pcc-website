import { redirect } from "next/navigation";

export default function RedirectOldHomeDashboardPage() {
  redirect("/admin/home");
}
