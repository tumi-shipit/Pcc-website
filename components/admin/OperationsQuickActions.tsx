import Link from "next/link";

const actions = [
  {
    title: "New Tournament",
    href: "/admin/tournaments/new",
    label: "Event",
  },
  {
    title: "Review Payments",
    href: "/admin/registrations",
    label: "Pay",
  },
  {
    title: "Verify Players",
    href: "/admin/players/verify",
    label: "Verify",
  },
  {
    title: "Check Duplicates",
    href: "/admin/players/duplicates",
    label: "Match",
  },
  {
    title: "Import Centre",
    href: "/admin/imports",
    label: "Import",
  },
  {
    title: "Media Centre",
    href: "/admin/news",
    label: "News",
  },
];

export default function OperationsQuickActions() {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
        Quick Actions
      </p>

      <h2 className="mt-3 text-2xl font-black">Mission shortcuts</h2>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:-translate-y-1 hover:border-red-500"
          >
            <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">
              {action.label}
            </p>
            <p className="mt-2 text-sm font-black text-white">{action.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

