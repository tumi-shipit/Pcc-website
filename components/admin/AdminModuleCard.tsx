// Path: components/admin/AdminModuleCard.tsx
import Link from "next/link";

export default function AdminModuleCard({
  title,
  description,
  href,
  count,
  color = "red",
}: {
  title: string;
  description: string;
  href: string;
  count?: number | string;
  color?: "red" | "green" | "blue" | "yellow";
}) {
  const accents = {
    red: "border-red-500/40 text-red-300 hover:border-red-500",
    green: "border-green-500/40 text-green-300 hover:border-green-500",
    blue: "border-blue-500/40 text-blue-300 hover:border-blue-500",
    yellow: "border-yellow-500/40 text-yellow-300 hover:border-yellow-500",
  };

  return (
    <Link
      href={href}
      className={`group block rounded-2xl border bg-zinc-900 p-5 shadow-2xl shadow-black/10 transition hover:-translate-y-1 ${accents[color]}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] opacity-80">
            Admin module
          </p>
          <h3 className="mt-2 text-xl font-black text-white">{title}</h3>
        </div>
        {count !== undefined && (
          <span className="rounded-xl border border-current/30 bg-black/20 px-3 py-2 text-2xl font-black">
            {count}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm leading-6 text-gray-400">{description}</p>
      <p className="mt-5 text-sm font-bold text-white opacity-0 transition group-hover:opacity-100">
        Open workspace
      </p>
    </Link>
  );
}
