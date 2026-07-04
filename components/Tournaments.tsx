"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: "Draft" | "Open" | "Closed" | "Live" | "Completed";
  entry_fee: number;
  poster_image_url: string | null;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  if (amount === 0) return "Free / TBA";

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusLabel(status: Tournament["registration_status"]) {
  if (status === "Open") return "Open";
  if (status === "Live") return "Live";
  if (status === "Completed") return "Completed";
  if (status === "Closed") return "Closed";
  return "Coming Soon";
}

function getStatusClass(status: Tournament["registration_status"]) {
  if (status === "Open") return "bg-green-600";
  if (status === "Live") return "bg-red-600";
  if (status === "Completed") return "bg-blue-600";
  return "bg-zinc-700";
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTournaments() {
      setLoading(true);

      const { data } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, description, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url"
        )
        .in("registration_status", ["Open", "Closed"])
        .order("start_date", { ascending: true });

      setTournaments((data ?? []) as Tournament[]);
      setLoading(false);
    }

    loadTournaments();
  }, []);

  return (
    <section id="tournaments" className="bg-zinc-950 py-16 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 max-w-3xl md:mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-500 md:text-sm">
            Tournament Centre
          </p>

          <h2 className="text-3xl font-bold md:text-5xl">
            Upcoming Tournaments
          </h2>

          <p className="mt-4 text-sm leading-6 text-gray-400 md:text-lg md:leading-8">
            View tournament details, posters and registration status. Entries
            only open when organisers make registration available.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading tournaments...</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {tournaments.map((tournament) => {
              const isOpen = tournament.registration_status === "Open";

              return (
                <article
                  key={tournament.id}
                  className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-red-500/60"
                >
                  <Link
                    href={`/tournaments/${tournament.id}`}
                    className="relative block aspect-[3/4] overflow-hidden bg-black"
                  >
                    {tournament.poster_image_url ? (
                      <Image
                        src={tournament.poster_image_url}
                        alt={`${tournament.tournament_name} poster`}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-3 text-center text-xs text-gray-500">
                        Poster coming soon
                      </div>
                    )}

                    <span
                      className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${getStatusClass(
                        tournament.registration_status
                      )}`}
                    >
                      {getStatusLabel(tournament.registration_status)}
                    </span>
                  </Link>

                  <div className="p-3 md:p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400 md:text-xs">
                      {formatDate(tournament.start_date)}
                    </p>

                    <Link href={`/tournaments/${tournament.id}`}>
                      <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5 transition hover:text-red-400 md:text-base">
                        {tournament.tournament_name}
                      </h3>
                    </Link>

                    <p className="mt-2 line-clamp-1 text-xs text-gray-400">
                      {tournament.venue}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-gray-300">
                      {formatMoney(tournament.entry_fee)}
                    </p>

                    <div className="mt-4 grid gap-2">
                      <Link
                        href={`/tournaments/${tournament.id}`}
                        className="block rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-semibold text-white transition hover:border-red-500"
                      >
                        View Tournament
                      </Link>

                      {isOpen ? (
                        <Link
                          href="/register"
                          className="block rounded-lg bg-red-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-red-700"
                        >
                          Register
                        </Link>
                      ) : (
                        <span className="block rounded-lg bg-zinc-800 px-3 py-2 text-center text-xs text-gray-400">
                          Not Open
                        </span>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
