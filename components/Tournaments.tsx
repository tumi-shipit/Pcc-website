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
  registration_status: "Draft" | "Open" | "Closed";
  entry_fee: number;
  poster_image_url: string | null;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  if (amount === 0) return "Free / TBA";

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
  }).format(amount);
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
        .neq("registration_status", "Draft")
        .order("start_date", { ascending: true });

      setTournaments((data ?? []) as Tournament[]);
      setLoading(false);
    }

    loadTournaments();
  }, []);

  return (
    <section id="tournaments" className="bg-zinc-950 py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-red-500">
            Club Calendar
          </p>

          <h2 className="text-4xl font-bold md:text-5xl">
            Upcoming Tournaments
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-400">
            Compete, improve your game and register for open PCC tournament
            events.
          </p>
        </div>

        {loading ? (
          <p className="text-gray-400">Loading tournaments...</p>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            {tournaments.map((tournament) => (
              <article
                key={tournament.id}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-red-500/60"
              >
                <div className="relative h-64 overflow-hidden bg-black">
                  {tournament.poster_image_url ? (
                    <Image
                      src={tournament.poster_image_url}
                      alt={`${tournament.tournament_name} poster`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-500">
                      Poster coming soon
                    </div>
                  )}

                  <span
                    className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider text-white ${
                      tournament.registration_status === "Open"
                        ? "bg-green-600"
                        : "bg-zinc-700"
                    }`}
                  >
                    {tournament.registration_status === "Open"
                      ? "Registration Open"
                      : "Registration Closed"}
                  </span>
                </div>

                <div className="p-7">
                  <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
                    {formatDate(tournament.start_date)}
                  </p>

                  <h3 className="mt-3 text-2xl font-bold">
                    {tournament.tournament_name}
                  </h3>

                  <div className="mt-5 space-y-2 text-sm leading-6 text-gray-400">
                    <p>
                      <span className="font-semibold text-white">Venue:</span>{" "}
                      {tournament.venue}
                    </p>

                    <p>
                      <span className="font-semibold text-white">Province:</span>{" "}
                      {tournament.province ?? "TBA"}
                    </p>

                    <p>
                      <span className="font-semibold text-white">Entry fee:</span>{" "}
                      {formatMoney(tournament.entry_fee)}
                    </p>
                  </div>

                  {tournament.description && (
                    <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-gray-400">
                      {tournament.description}
                    </p>
                  )}

                  {tournament.registration_status === "Open" ? (
                    <Link
                      href="/register"
                      className="mt-6 inline-block rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      Register Now →
                    </Link>
                  ) : (
                    <span className="mt-6 inline-block rounded-lg bg-zinc-800 px-5 py-3 text-sm text-gray-400">
                      Registration Closed
                    </span>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}