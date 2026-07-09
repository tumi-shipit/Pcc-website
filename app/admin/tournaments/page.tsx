"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type TournamentStatus = "Draft" | "Open" | "Closed" | "Completed";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: TournamentStatus;
  entry_fee: number;
  poster_image_url: string | null;
};

function formatDate(date: string | null) {
  if (!date) return "TBA";

  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status: TournamentStatus) {
  if (status === "Open") return "bg-green-500/10 text-green-300";
  if (status === "Completed") return "bg-blue-500/10 text-blue-300";
  if (status === "Closed") return "bg-yellow-500/10 text-yellow-300";
  return "bg-zinc-800 text-zinc-300";
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadTournaments() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("tournaments")
      .select(
        "id, tournament_name, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url"
      )
      .order("start_date", { ascending: false });

    if (error) {
      setMessage(`Could not load tournaments: ${error.message}`);
    } else {
      setTournaments((data ?? []) as unknown as Tournament[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Admin Dashboard
          </Link>

          <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Tournament Management
              </p>

              <h1 className="mt-3 text-4xl font-bold">Manage Tournaments</h1>

              <p className="mt-3 max-w-2xl text-gray-400">
                Create tournaments, edit details, control registration status and
                publish events to the Tournament Centre.
              </p>
            </div>

            <Link
              href="/admin/tournaments/new"
              className="rounded-lg bg-red-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-red-700"
            >
              + New Tournament
            </Link>
          </div>

          {message && (
            <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          {loading ? (
            <p className="mt-8 text-gray-400">Loading tournaments...</p>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {tournaments.map((tournament) => (
                <article
                  key={tournament.id}
                  className="rounded-2xl border border-white/10 bg-zinc-900 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                        {formatDate(tournament.start_date)}
                      </p>

                      <h2 className="mt-2 text-xl font-bold leading-7">
                        {tournament.tournament_name}
                      </h2>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                        tournament.registration_status
                      )}`}
                    >
                      {tournament.registration_status}
                    </span>
                  </div>

                  <p className="mt-3 text-sm text-gray-400">
                    {tournament.venue}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    {tournament.province ?? "Province not set"}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <Link
                      href={`/admin/tournaments/${tournament.id}`}
                      className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm font-semibold text-white transition hover:border-red-500"
                    >
                      Dashboard
                    </Link>

                    <Link
                      href={`/admin/tournaments/${tournament.id}/edit`}
                      className="rounded-lg bg-red-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      Edit
                    </Link>
                  </div>

                  <Link
                    href={`/tournaments/${tournament.id}`}
                    className="mt-3 block rounded-lg bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-gray-300 transition hover:text-white"
                  >
                    View Public Page →
                  </Link>
                </article>
              ))}

              {tournaments.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
                  No tournaments found.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}
