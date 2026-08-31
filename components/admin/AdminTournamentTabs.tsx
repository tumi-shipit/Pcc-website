"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AdminTournamentPoster from "@/components/admin/AdminTournamentPoster";

const tournamentTabs = [
  ["Overview", ""],
  ["Results & Completed", "/archive"],
  ["Gallery", "/gallery"],
  ["Officials", "/arbiters"],
  ["Organisations", "/organisations"],
  ["Programme", "/programme"],
  ["Live", "/live"],
  ["Edit", "/edit"],
];

type TournamentPoster = {
  tournament_name: string;
  poster_image_url: string | null;
};

export default function AdminTournamentTabs({
  id,
  showPoster = true,
}: {
  id: string;
  showPoster?: boolean;
}) {
  const pathname = usePathname();
  const base = `/admin/tournaments/${id}`;
  const [tournament, setTournament] = useState<TournamentPoster | null>(null);

  useEffect(() => {
    async function loadPoster() {
      const { data } = await supabase
        .from("tournaments")
        .select("tournament_name, poster_image_url")
        .eq("id", id)
        .maybeSingle();

      setTournament((data ?? null) as TournamentPoster | null);
    }

    if (showPoster && id) loadPoster();
  }, [id, showPoster]);

  return (
    <>
      <nav className="mb-3 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-900 p-2">
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

      {showPoster && tournament && (
        <AdminTournamentPoster
          tournamentName={tournament.tournament_name}
          posterUrl={tournament.poster_image_url}
          className="mb-6"
        />
      )}
    </>
  );
}
