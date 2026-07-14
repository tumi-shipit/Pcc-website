"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminPlayerTabs from "@/components/admin/AdminPlayerTabs";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  verification_status: string | null;
};

type TournamentResult = {
  id: string;
  tournament_id: string;
  section_id: string | null;
  final_position: number | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  notes: string | null;
  created_at: string | null;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    end_date: string | null;
    venue: string | null;
    province: string | null;
    registration_status: string | null;
  } | null;
  tournament_sections: {
    id: string;
    section_name: string;
  } | null;
};

type Registration = {
  id: string;
  tournament_id: string;
  section_id: string | null;
  payment_status: string | null;
  registration_status: string | null;
  created_at: string | null;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    venue: string | null;
    registration_status: string | null;
  } | null;
  tournament_sections: {
    id: string;
    section_name: string;
  } | null;
};

function formatDate(value: string | null) {
  if (!value) return "TBA";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function medal(position: number | null) {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return "";
}

export default function AdminPlayerHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playerId = id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlayerHistory() {
      setLoading(true);
      setMessage("");

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select(
          "id, full_name, chess_sa_id, fide_id, club, province, rating, verification_status"
        )
        .eq("id", playerId)
        .single();

      if (playerError || !playerData) {
        setMessage("Player could not be loaded.");
        setLoading(false);
        return;
      }

      const { data: resultData } = await supabase
        .from("tournament_results")
        .select(
          "id, tournament_id, section_id, final_position, points, tie_break, award_title, notes, created_at, tournaments(id, tournament_name, start_date, end_date, venue, province, registration_status), tournament_sections(id, section_name)"
        )
        .eq("player_id", playerId);

      const { data: registrationData } = await supabase
        .from("registrations")
        .select(
          "id, tournament_id, section_id, payment_status, registration_status, created_at, tournaments(id, tournament_name, start_date, venue, registration_status), tournament_sections(id, section_name)"
        )
        .eq("player_id", playerId)
        .order("created_at", { ascending: false });

      setPlayer(playerData as Player);
      setResults((resultData ?? []) as unknown as TournamentResult[]);
      setRegistrations((registrationData ?? []) as unknown as Registration[]);
      setLoading(false);
    }

    loadPlayerHistory();
  }, [playerId]);

  const sortedResults = useMemo(() => {
    return [...results].sort((a, b) => {
      const dateA = a.tournaments?.start_date ?? "1900-01-01";
      const dateB = b.tournaments?.start_date ?? "1900-01-01";
      return dateB.localeCompare(dateA);
    });
  }, [results]);

  const sections = useMemo(() => {
    const names = sortedResults
      .map((result) => result.tournament_sections?.section_name ?? "Overall")
      .filter(Boolean);

    return ["All", ...Array.from(new Set(names))];
  }, [sortedResults]);

  const filteredResults = useMemo(() => {
    const text = search.trim().toLowerCase();

    return sortedResults.filter((result) => {
      const tournamentName = result.tournaments?.tournament_name ?? "";
      const venue = result.tournaments?.venue ?? "";
      const sectionName = result.tournament_sections?.section_name ?? "Overall";

      const matchesSearch =
        !text ||
        tournamentName.toLowerCase().includes(text) ||
        venue.toLowerCase().includes(text) ||
        sectionName.toLowerCase().includes(text) ||
        (result.award_title ?? "").toLowerCase().includes(text);

      const matchesSection =
        sectionFilter === "All" || sectionFilter === sectionName;

      return matchesSearch && matchesSection;
    });
  }, [sortedResults, search, sectionFilter]);

  const stats = useMemo(() => {
    const wins = results.filter((result) => result.final_position === 1).length;
    const podiums = results.filter((result) =>
      [1, 2, 3].includes(result.final_position ?? 0)
    ).length;
    const totalPoints = results.reduce(
      (sum, result) => sum + Number(result.points ?? 0),
      0
    );

    const bestFinish =
      results
        .map((result) => result.final_position)
        .filter((position): position is number => Boolean(position))
        .sort((a, b) => a - b)[0] ?? null;

    return {
      tournaments: new Set([
        ...results.map((result) => result.tournament_id),
        ...registrations.map((registration) => registration.tournament_id),
      ]).size,
      results: results.length,
      registrations: registrations.length,
      wins,
      podiums,
      totalPoints,
      bestFinish,
    };
  }, [results, registrations]);

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading player history...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!player || message) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
            {message || "Player could not be found."}
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href={`/admin/players/${playerId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Player Profile
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Player Tournament History
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              {player.full_name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Complete tournament activity linked to this player profile,
              including final rankings, points, awards, sections and archived
              tournament registrations.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                Chess SA: {valueOrDash(player.chess_sa_id)}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                FIDE: {valueOrDash(player.fide_id)}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                Rating: {valueOrDash(player.rating)}
              </span>
            </div>

            <AdminPlayerTabs id={playerId} />
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-7">
            <StatCard label="Events" value={stats.tournaments} />
            <StatCard label="Results" value={stats.results} />
            <StatCard label="Registrations" value={stats.registrations} />
            <StatCard label="Wins" value={stats.wins} tone="yellow" />
            <StatCard label="Podiums" value={stats.podiums} tone="green" />
            <StatCard label="Best Finish" value={stats.bestFinish ?? "-"} />
            <StatCard label="Total Points" value={stats.totalPoints} tone="red" />
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Results Archive
                </p>
                <h2 className="mt-3 text-2xl font-black">
                  Tournament Results
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search tournament, venue, section..."
                  className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
                />

                <select
                  value={sectionFilter}
                  onChange={(event) => setSectionFilter(event.target.value)}
                  className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
                >
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredResults.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                No tournament results match your filters.
              </p>
            ) : (
              <div className="mt-6 overflow-auto rounded-2xl border border-white/10">
                <table className="w-full min-w-[980px] text-left text-sm">
                  <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="p-4">Date</th>
                      <th className="p-4">Tournament</th>
                      <th className="p-4">Section</th>
                      <th className="p-4">Venue</th>
                      <th className="p-4">Rank</th>
                      <th className="p-4">Points</th>
                      <th className="p-4">Tie-break</th>
                      <th className="p-4">Award</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredResults.map((result) => (
                      <tr key={result.id} className="border-t border-white/10">
                        <td className="p-4 text-gray-300">
                          {formatDate(result.tournaments?.start_date ?? null)}
                        </td>

                        <td className="p-4">
                          <Link
                            href={`/admin/tournaments/${result.tournament_id}`}
                            className="font-bold text-white transition hover:text-red-300"
                          >
                            {result.tournaments?.tournament_name ??
                              "Unknown tournament"}
                          </Link>
                        </td>

                        <td className="p-4 text-gray-300">
                          {result.tournament_sections?.section_name ?? "Overall"}
                        </td>

                        <td className="p-4 text-gray-300">
                          {valueOrDash(result.tournaments?.venue)}
                        </td>

                        <td className="p-4 font-black text-white">
                          {medal(result.final_position)}{" "}
                          {valueOrDash(result.final_position)}
                        </td>

                        <td className="p-4 font-bold text-white">
                          {valueOrDash(result.points)}
                        </td>

                        <td className="p-4 text-gray-300">
                          {valueOrDash(result.tie_break)}
                        </td>

                        <td className="p-4">
                          {result.award_title ? (
                            <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-200">
                              {result.award_title}
                            </span>
                          ) : (
                            <span className="text-gray-600">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Registration Activity
            </p>
            <h2 className="mt-3 text-2xl font-black">
              Tournament Registrations
            </h2>

            {registrations.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                No registrations linked to this player.
              </p>
            ) : (
              <div className="mt-6 grid gap-3 md:grid-cols-2">
                {registrations.map((registration) => (
                  <Link
                    key={registration.id}
                    href={`/admin/tournaments/${registration.tournament_id}`}
                    className="rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                  >
                    <p className="font-bold text-white">
                      {registration.tournaments?.tournament_name ??
                        "Unknown tournament"}
                    </p>
                    <p className="mt-1 text-sm text-gray-400">
                      {formatDate(registration.tournaments?.start_date ?? null)}  - {" "}
                      {registration.tournament_sections?.section_name ?? "Overall"}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-gray-300">
                        {registration.registration_status ?? "Pending"}
                      </span>
                      <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-gray-300">
                        {registration.payment_status ?? "Payment TBA"}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "yellow" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "red"
      ? "text-red-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

