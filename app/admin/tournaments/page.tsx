"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type TournamentStatus = "Draft" | "Open" | "Closed" | "Live" | "Completed";

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
  if (status === "Live") return "bg-red-500/10 text-red-300";
  if (status === "Completed") return "bg-blue-500/10 text-blue-300";
  if (status === "Closed") return "bg-yellow-500/10 text-yellow-300";
  return "bg-zinc-800 text-zinc-300";
}

function isUpcoming(date: string | null) {
  if (!date) return false;
  const eventDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);

  return eventDate.getTime() >= today.getTime();
}

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [statusFilter, setStatusFilter] = useState<
    "Active" | "Upcoming" | "Draft" | "Completed" | "All"
  >("Active");
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
    const timer = window.setTimeout(() => {
      void loadTournaments();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const active = tournaments.filter((tournament) =>
      ["Open", "Live", "Closed"].includes(tournament.registration_status)
    ).length;
    const upcoming = tournaments.filter((tournament) =>
      isUpcoming(tournament.start_date)
    ).length;
    const drafts = tournaments.filter(
      (tournament) => tournament.registration_status === "Draft"
    ).length;
    const completed = tournaments.filter(
      (tournament) => tournament.registration_status === "Completed"
    ).length;

    return { active, upcoming, drafts, completed, total: tournaments.length };
  }, [tournaments]);

  const visibleTournaments = useMemo(() => {
    return tournaments.filter((tournament) => {
      if (statusFilter === "All") return true;
      if (statusFilter === "Active") {
        return ["Open", "Live", "Closed"].includes(
          tournament.registration_status
        );
      }
      if (statusFilter === "Upcoming") return isUpcoming(tournament.start_date);
      if (statusFilter === "Draft") {
        return tournament.registration_status === "Draft";
      }
      return tournament.registration_status === "Completed";
    });
  }, [statusFilter, tournaments]);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Admin Dashboard
          </Link>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_520px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                Tournament Management
              </p>

              <h1 className="mt-3 text-3xl font-black md:text-6xl">
                Tournament operations
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
                Create tournaments, edit details, control registration status and
                publish events to the Tournament Centre.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              <BoardStat label="Active" value={stats.active} />
              <BoardStat label="Upcoming" value={stats.upcoming} />
              <BoardStat label="Drafts" value={stats.drafts} tone="muted" />
              <BoardStat label="Completed" value={stats.completed} />
              <BoardStat label="Total" value={stats.total} />
            </div>
          </div>

          <section className="mt-6 grid gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-3 md:grid-cols-[1fr_auto] md:items-center">
            <div className="grid gap-2 sm:grid-cols-5">
              {(["Active", "Upcoming", "Draft", "Completed", "All"] as const).map(
                (filter) => (
                  <button
                    key={filter}
                    type="button"
                    onClick={() => setStatusFilter(filter)}
                    className={`rounded-lg px-4 py-3 text-sm font-bold transition ${
                      statusFilter === filter
                        ? "bg-red-600 text-white"
                        : "border border-white/10 bg-zinc-950 text-zinc-300 hover:border-red-500 hover:text-white"
                    }`}
                  >
                    {filter}
                  </button>
                )
              )}
            </div>

            <Link
              href="/admin/tournaments/new"
              className="rounded-lg bg-red-600 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-red-700"
            >
              New Tournament
            </Link>
          </section>

          {message && (
            <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          {loading ? (
            <p className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
              Loading tournaments...
            </p>
          ) : (
            <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {visibleTournaments.map((tournament) => (
                <article
                  key={tournament.id}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/10 transition hover:-translate-y-1 hover:border-red-500/60"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-zinc-950">
                    {tournament.poster_image_url ? (
                      <Image
                        src={tournament.poster_image_url}
                        alt={`${tournament.tournament_name} poster`}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-6 text-center text-sm font-semibold text-zinc-600">
                        Poster not uploaded
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" />
                    <span
                      className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-black ${statusClass(
                        tournament.registration_status
                      )}`}
                    >
                      {tournament.registration_status}
                    </span>
                    <p className="absolute bottom-4 left-4 right-4 text-xs font-black uppercase tracking-[0.18em] text-red-200">
                      {formatDate(tournament.start_date)}
                    </p>
                  </div>

                  <div className="p-5">
                    <h2 className="text-xl font-black leading-7">
                      {tournament.tournament_name}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-gray-400">
                      {tournament.venue}
                    </p>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                        <p className="text-xs text-zinc-500">Province</p>
                        <p className="mt-1 font-bold text-white">
                          {tournament.province ?? "Not set"}
                        </p>
                      </div>
                      <div className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                        <p className="text-xs text-zinc-500">Entry fee</p>
                        <p className="mt-1 font-bold text-white">
                          R{tournament.entry_fee ?? 0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <Link
                        href={`/admin/tournaments/${tournament.id}`}
                        className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                      >
                        Dashboard
                      </Link>

                      <Link
                        href={`/admin/tournaments/${tournament.id}/arbiters`}
                        className="rounded-lg border border-green-500/40 bg-green-500/10 px-4 py-3 text-center text-sm font-bold text-green-100 transition hover:bg-green-500/20"
                      >
                        Officials
                      </Link>

                      <Link
                        href={`/admin/tournaments/${tournament.id}/edit`}
                        className="rounded-lg bg-red-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
                      >
                        Edit
                      </Link>
                    </div>

                    <Link
                      href={`/tournaments/${tournament.id}`}
                      className="mt-3 block rounded-lg bg-zinc-950 px-4 py-3 text-center text-sm font-bold text-gray-300 transition hover:text-white"
                    >
                      View Public Page
                    </Link>
                  </div>
                </article>
              ))}

              {visibleTournaments.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
                  No tournaments match this view.
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

function BoardStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "muted";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-3 text-center">
      <p
        className={`text-2xl font-black ${
          tone === "muted" ? "text-zinc-400" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

