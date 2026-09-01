import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

const membershipTools = [
  {
    href: "/admin/membership-plans",
    eyebrow: "Plans and designs",
    title: "Membership cards",
    description:
      "Upload the Monthly, 3 Months, 6 Months and Yearly card images, set prices and control which plans are available to buy.",
    action: "Manage cards and prices",
    accent: "border-red-500/30 bg-red-500/10 text-red-200",
  },
  {
    href: "/admin/members",
    eyebrow: "Member administration",
    title: "Membership register",
    description:
      "View active and expired memberships, connect members to player records and add or correct membership periods manually.",
    action: "Open membership register",
    accent: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  },
  {
    href: "/membership",
    eyebrow: "Public experience",
    title: "Membership sales page",
    description:
      "Preview exactly where visitors compare membership periods and pay securely through Yoco.",
    action: "View public membership page",
    accent: "border-blue-500/30 bg-blue-500/10 text-blue-200",
    external: true,
  },
  {
    href: "/members/login",
    eyebrow: "Member experience",
    title: "Member Centre",
    description:
      "Open the sign-in area members use to see their profile and current membership period.",
    action: "View Member Centre",
    accent: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    external: true,
  },
];

export default function AdminMembershipPage() {
  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-5 pb-20 pt-28 text-white">
        <div className="mx-auto max-w-7xl">
          <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900">
            <div className="h-1.5 bg-red-600" />
            <div className="grid gap-8 p-7 sm:p-10 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">
                  PCC membership
                </p>
                <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                  Membership centre
                </h1>
                <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-400">
                  Everything related to membership is collected here. Manage the
                  card products and prices, maintain member records, and check the
                  public experience without searching through the rest of admin.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-5 py-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">
                  Payment provider
                </p>
                <p className="mt-2 font-black text-white">Yoco secure checkout</p>
                <p className="mt-1 text-sm text-emerald-300">Connected</p>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-5 md:grid-cols-2">
            {membershipTools.map((tool) => (
              <article
                key={tool.href}
                className="flex min-h-64 flex-col rounded-3xl border border-white/10 bg-zinc-900 p-6 shadow-xl shadow-black/10"
              >
                <p
                  className={`w-fit rounded-full border px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] ${tool.accent}`}
                >
                  {tool.eyebrow}
                </p>
                <h2 className="mt-5 text-2xl font-black">{tool.title}</h2>
                <p className="mt-3 flex-1 text-sm leading-6 text-zinc-400">
                  {tool.description}
                </p>
                <Link
                  href={tool.href}
                  target={tool.external ? "_blank" : undefined}
                  rel={tool.external ? "noreferrer" : undefined}
                  className="mt-6 inline-flex w-fit items-center rounded-xl bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-red-600 hover:text-white"
                >
                  {tool.action}
                </Link>
              </article>
            ))}
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
              Membership flow
            </p>
            <div className="mt-5 grid gap-3 text-sm font-bold text-zinc-300 sm:grid-cols-4">
              {[
                "1. Publish a plan",
                "2. Member pays with Yoco",
                "3. Payment is confirmed",
                "4. Membership is activated",
              ].map((step) => (
                <div key={step} className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-4">
                  {step}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}
