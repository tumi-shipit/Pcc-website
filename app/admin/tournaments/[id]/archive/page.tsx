"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminTournamentTabs from "@/components/admin/AdminTournamentTabs";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  end_date: string | null;
  venue: string | null;
  province: string | null;
  registration_status: string | null;
  tournament_report: string | null;
  arbiter_player_id: string | null;
};

type Section = {
  id: string;
  section_name: string;
  entry_fee_override: number | null;
  maximum_players: number | null;
};

type ResultRow = {
  id: string;
  tournament_id: string;
  section_id: string | null;
  player_id: string | null;
  final_position: number | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  notes: string | null;
  players: {
    id: string;
    full_name: string;
    rating: number | null;
    club: string | null;
  } | null;
  tournament_sections: {
    id: string;
    section_name: string;
  } | null;
};

type GalleryImage = {
  id: string;
  image_url: string;
  caption: string | null;
};

type Official = {
  id: string;
  role: string;
  players: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
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
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "♟";
}

export default function TournamentArchivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tournamentId = id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(true);
  const [savingReport, setSavingReport] = useState(false);
  const [message, setMessage] = useState("");

  async function loadArchive() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select(
        "id, tournament_name, start_date, end_date, venue, province, registration_status, tournament_report, arbiter_player_id"
      )
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      setMessage("Tournament could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: sectionData } = await supabase
      .from("tournament_sections")
      .select("id, section_name, entry_fee_override, maximum_players")
      .eq("tournament_id", tournamentId)
      .order("section_name", { ascending: true });

    const { data: resultData } = await supabase
      .from("tournament_results")
      .select(
        "id, tournament_id, section_id, player_id, final_position, points, tie_break, award_title, notes, players(id, full_name, rating, club), tournament_sections(id, section_name)"
      )
      .eq("tournament_id", tournamentId)
      .order("section_id", { ascending: true, nullsFirst: true })
      .order("final_position", { ascending: true, nullsFirst: false });

    const { data: galleryData } = await supabase
      .from("tournament_gallery")
      .select("id, image_url, caption")
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: true })
      .limit(8);

    const { data: officialData } = await supabase
      .from("tournament_officials")
      .select("id, role, players(id, full_name, profile_photo_url)")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    const loadedTournament = tournamentData as Tournament;

    setTournament(loadedTournament);
    setReport(loadedTournament.tournament_report ?? "");
    setSections((sectionData ?? []) as unknown as Section[]);
    setResults((resultData ?? []) as unknown as ResultRow[]);
    setGallery((galleryData ?? []) as unknown as GalleryImage[]);
    setOfficials((officialData ?? []) as unknown as Official[]);
    setLoading(false);
  }

  useEffect(() => {
    loadArchive();
  }, [tournamentId]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, ResultRow[]> = {};

    results.forEach((result) => {
      const sectionName = result.tournament_sections?.section_name ?? "Overall";
      groups[sectionName] = groups[sectionName] ?? [];
      groups[sectionName].push(result);
    });

    return Object.entries(groups).map(([sectionName, sectionResults]) => ({
      sectionName,
      results: sectionResults,
      topThree: sectionResults.filter((row) =>
        [1, 2, 3].includes(row.final_position ?? 0)
      ),
    }));
  }, [results]);

  const stats = useMemo(() => {
    return {
      sections: sections.length,
      results: results.length,
      photos: gallery.length,
      officials: officials.length,
      champions: results.filter((row) => row.final_position === 1).length,
    };
  }, [sections, results, gallery, officials]);

  async function saveReport() {
    setSavingReport(true);
    setMessage("");

    const { error } = await supabase
      .from("tournaments")
      .update({
        tournament_report: report.trim() || null,
      })
      .eq("id", tournamentId);

    if (error) {
      setMessage(`Could not save report: ${error.message}`);
      setSavingReport(false);
      return;
    }

    setMessage("Tournament archive report saved.");
    setSavingReport(false);
    await loadArchive();
  }

  async function markCompleted() {
    const { error } = await supabase
      .from("tournaments")
      .update({
        registration_status: "Completed",
      })
      .eq("id", tournamentId);

    if (error) {
      setMessage(`Could not mark completed: ${error.message}`);
      return;
    }

    setMessage("Tournament marked as completed.");
    await loadArchive();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading archive...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!tournament) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
            {message || "Tournament could not be found."}
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
            href={`/admin/tournaments/${tournamentId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Tournament Dashboard
          </Link>

          <AdminTournamentTabs id={tournamentId} />

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Tournament Archive
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              {tournament.tournament_name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Manage the public archive for this tournament: final rankings,
              winners, officials, gallery, report and completion status.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {formatDate(tournament.start_date)}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {tournament.venue ?? "Venue TBA"}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {tournament.registration_status ?? "Status TBA"}
              </span>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-5">
            <StatCard label="Sections" value={stats.sections} />
            <StatCard label="Players / Results" value={stats.results} />
            <StatCard label="Champions" value={stats.champions} tone="yellow" />
            <StatCard label="Officials" value={stats.officials} tone="red" />
            <StatCard label="Photos" value={stats.photos} tone="green" />
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link
              href={`/admin/tournaments/${tournamentId}/import-results`}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:border-red-500"
            >
              <p className="text-xl font-black">Import Results</p>
              <p className="mt-2 text-sm text-gray-400">
                Upload final rankings by section.
              </p>
            </Link>

            <Link
              href={`/admin/tournaments/${tournamentId}/results`}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:border-red-500"
            >
              <p className="text-xl font-black">Results Centre</p>
              <p className="mt-2 text-sm text-gray-400">
                Manage standings and crosstables.
              </p>
            </Link>

            <Link
              href={`/admin/tournaments/${tournamentId}/gallery`}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:border-red-500"
            >
              <p className="text-xl font-black">Gallery</p>
              <p className="mt-2 text-sm text-gray-400">
                Upload tournament photos.
              </p>
            </Link>

            <Link
              href={`/admin/tournaments/${tournamentId}/arbiters`}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:border-red-500"
            >
              <p className="text-xl font-black">Officials</p>
              <p className="mt-2 text-sm text-gray-400">
                Assign arbiters and organisers.
              </p>
            </Link>
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Final Rankings
                  </p>
                  <h2 className="mt-3 text-2xl font-black">Section Results</h2>
                </div>

                <Link
                  href={`/tournaments/${tournamentId}`}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Public Page →
                </Link>
              </div>

              {groupedResults.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  No final rankings imported yet.
                </p>
              ) : (
                <div className="mt-6 space-y-6">
                  {groupedResults.map((group) => (
                    <div
                      key={group.sectionName}
                      className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                            Section
                          </p>
                          <h3 className="mt-2 text-2xl font-black">
                            {group.sectionName}
                          </h3>
                        </div>

                        <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-gray-300">
                          {group.results.length} player
                          {group.results.length === 1 ? "" : "s"}
                        </span>
                      </div>

                      {group.topThree.length > 0 && (
                        <div className="mt-5 grid gap-3 md:grid-cols-3">
                          {group.topThree.map((result) => (
                            <Link
                              key={result.id}
                              href={`/admin/players/${result.player_id}`}
                              className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 transition hover:border-yellow-400"
                            >
                              <p className="text-3xl">
                                {medal(result.final_position)}
                              </p>
                              <p className="mt-2 text-xs font-bold uppercase tracking-wide text-yellow-200">
                                Position {result.final_position}
                              </p>
                              <p className="mt-2 font-black text-white">
                                {result.players?.full_name ?? "Player not linked"}
                              </p>
                              <p className="mt-1 text-sm text-yellow-50/80">
                                {valueOrDash(result.points)} points
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}

                      <div className="mt-5 overflow-auto rounded-2xl border border-white/10">
                        <table className="w-full min-w-[760px] text-left text-sm">
                          <thead className="bg-zinc-900 text-xs uppercase tracking-wide text-gray-500">
                            <tr>
                              <th className="p-4">Rank</th>
                              <th className="p-4">Player</th>
                              <th className="p-4">Rating</th>
                              <th className="p-4">Points</th>
                              <th className="p-4">Tie-break</th>
                              <th className="p-4">Award</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.results.map((result) => (
                              <tr
                                key={result.id}
                                className="border-t border-white/10"
                              >
                                <td className="p-4 font-black text-white">
                                  {medal(result.final_position)}{" "}
                                  {valueOrDash(result.final_position)}
                                </td>
                                <td className="p-4">
                                  {result.player_id ? (
                                    <Link
                                      href={`/admin/players/${result.player_id}`}
                                      className="font-bold text-white transition hover:text-red-300"
                                    >
                                      {result.players?.full_name ??
                                        "Player not linked"}
                                    </Link>
                                  ) : (
                                    <span className="text-gray-500">
                                      Player not linked
                                    </span>
                                  )}
                                  {result.players?.club && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      {result.players.club}
                                    </p>
                                  )}
                                </td>
                                <td className="p-4 text-gray-300">
                                  {valueOrDash(result.players?.rating)}
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
                    </div>
                  ))}
                </div>
              )}
            </section>

            <aside className="space-y-8">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Archive Report
                </p>
                <h2 className="mt-3 text-2xl font-black">Tournament story</h2>

                <textarea
                  value={report}
                  onChange={(event) => setReport(event.target.value)}
                  rows={10}
                  placeholder="Write tournament report, highlights, winners, special moments..."
                  className="mt-6 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
                />

                <div className="mt-4 grid gap-3">
                  <button
                    type="button"
                    onClick={saveReport}
                    disabled={savingReport}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {savingReport ? "Saving..." : "Save Report"}
                  </button>

                  <button
                    type="button"
                    onClick={markCompleted}
                    className="rounded-xl border border-green-500/40 px-5 py-3 text-sm font-bold text-green-200 transition hover:bg-green-500/10"
                  >
                    Mark Tournament Completed
                  </button>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Officials
                </p>
                <h2 className="mt-3 text-2xl font-black">Linked people</h2>

                <div className="mt-6 space-y-3">
                  {officials.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                      No officials linked.
                    </p>
                  ) : (
                    officials.map((official) => (
                      <Link
                        key={official.id}
                        href={`/admin/players/${official.players?.id}`}
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <p className="font-bold text-white">
                          {official.players?.full_name ?? "Unknown official"}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {official.role}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Gallery Preview
                </p>
                <h2 className="mt-3 text-2xl font-black">Photos</h2>

                {gallery.length === 0 ? (
                  <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                    No gallery photos yet.
                  </p>
                ) : (
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {gallery.map((image) => (
                      <Link
                        key={image.id}
                        href={`/admin/tournaments/${tournamentId}/gallery`}
                        className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950"
                      >
                        <img
                          src={image.image_url}
                          alt={image.caption ?? "Tournament gallery"}
                          className="aspect-square w-full object-cover"
                        />
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            </aside>
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
