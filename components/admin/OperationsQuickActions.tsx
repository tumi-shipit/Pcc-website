import Link from "next/link";

const actions = [
  {
    title: "New Tournament",
    href: "/admin/tournaments/new",
    icon: "🏆",
  },
  {
    title: "Review Payments",
    href: "/admin/registrations",
    icon: "💳",
  },
  {
    title: "Verify Players",
    href: "/admin/players/verify",
    icon: "✅",
  },
  {
    title: "Check Duplicates",
    href: "/admin/players/duplicates",
    icon: "🔍",
  },
  {
    title: "Import Centre",
    href: "/admin/imports",
    icon: "📥",
  },
  {
    title: "Media Centre",
    href: "/admin/news",
    icon: "📰",
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
            <p className="text-2xl">{action.icon}</p>
            <p className="mt-2 text-sm font-black text-white">{action.title}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
