"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/AdminGuard";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string;
  province: string | null;
  registration_status: string;
  entry_fee: number;
  poster_image_url: string | null;
};

type TournamentStats = {
  tournament_id: string;
  total_registrations: number;
  approved_registrations: number;
  paid_registrations: number;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminDashboardPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<TournamentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setMessage("");

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, start_date, venue, province, registration_status, entry_fee, poster_image_url"
        )
        .neq("registration_status", "Draft")
        .order("start_date", { ascending: true });

      const { data: statsData } = await supabase
        .from("tournament_public_stats")
        .select(
          "tournament_id, total_registrations, approved_registrations, paid_registrations"
        );

      if (tournamentError) {
        setMessage(`Could not load tournaments: ${tournamentError.message}`);
      } else {
        setTournaments((tournamentData ?? []) as Tournament[]);
        setStats((statsData ?? []) as TournamentStats[]);
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  function getStats(tournamentId: string) {
    return stats.find((item) => item.tournament_id === tournamentId);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
          Tournament Admin
        </p>

        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            <p className="mt-3 max-w-2xl text-gray-400">
              Choose a tournament to manage registrations, exports, news,
              gallery and live tournament tools.
            </p>
          </div>

          <Link
            href="/admin/registrations"
            className="rounded-lg bg-red-600 px-5 py-3 text-center font-semibold text-white transition hover:bg-red-700"
          >
            All Registrations
          </Link>
        </div>

        {message && (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-gray-400">Loading admin dashboard...</p>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((tournament) => {
              const tournamentStats = getStats(tournament.id);

              return (
                <Link
                  key={tournament.id}
                  href={`/admin/tournaments/${tournament.id}`}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition hover:-translate-y-1 hover:border-red-500/60"
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                          {formatDate(tournament.start_date)}
                        </p>

                        <h2 className="mt-2 text-xl font-bold leading-7 transition group-hover:text-red-300">
                          {tournament.tournament_name}
                        </h2>
                      </div>

                      <span className="shrink-0 rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-gray-300">
                        {tournament.registration_status}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-gray-400">
                      {tournament.venue}
                    </p>

                    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                      <div className="rounded-xl bg-zinc-950 p-3">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="mt-1 text-xl font-bold">
                          {tournamentStats?.total_registrations ?? 0}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-950 p-3">
                        <p className="text-xs text-gray-500">Approved</p>
                        <p className="mt-1 text-xl font-bold text-green-300">
                          {tournamentStats?.approved_registrations ?? 0}
                        </p>
                      </div>

                      <div className="rounded-xl bg-zinc-950 p-3">
                        <p className="text-xs text-gray-500">Paid</p>
                        <p className="mt-1 text-xl font-bold text-blue-300">
                          {tournamentStats?.paid_registrations ?? 0}
                        </p>
                      </div>
                    </div>

                    <p className="mt-5 text-sm font-semibold text-red-300">
                      Open tournament dashboard →
                    </p>
                  </div>
                </Link>
              );
            })}

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
