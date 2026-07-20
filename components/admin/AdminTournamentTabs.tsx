"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tournamentTabs = [
  ["Overview", ""],
  ["Results & Completed", "/archive"],
  ["Gallery", "/gallery"],
  ["Officials", "/arbiters"],
  ["Live", "/live"],
  ["Edit", "/edit"],
];

export default function AdminTournamentTabs({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/admin/tournaments/${id}`;

  return (
    <nav className="mb-6 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900 p-2">
      <div className="flex min-w-max gap-2">
        {tournamentTabs.map(([label, suffix]) => {
          const href = `${base}${suffix}`;
          const active = pathname === href;

          return (
            <Link
              key={href}
              href={href}
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                active
                  ? "bg-red-600 text-white shadow-lg shadow-red-950/30"
                  : "text-gray-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
