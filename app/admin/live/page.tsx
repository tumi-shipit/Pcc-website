"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string;
  registration_status: string;
};

type TournamentStats = {
  tournament_id: string;
  total_registrations: number;
  approved_registrations: number;
  paid_registrations: number;
};

type NewsPost = {
  id: string;
  title: string;
  category: string | null;
  published: boolean;
  created_at: string;
  published_at: string | null;
};

type GalleryImage = {
  id: string;
  tournament_id: string;
};

type ResultRow = {
  id: string;
  tournament_id: string;
};

function formatDate(value: string | null) {
  if (!value) return "TBA";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeAgo(value: string | null) {
  if (!value) return "No activity";

  const date = new Date(value);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

function statusClass(status: string) {
  if (status === "Open") return "bg-green-500/10 text-green-300 border-green-500/20";
  if (status === "Live") return "bg-red-500/10 text-red-300 border-red-500/20";
  if (status === "Closed") return "bg-yellow-500/10 text-yellow-300 border-yellow-500/20";
  if (status === "Completed") return "bg-blue-500/10 text-blue-300 border-blue-500/20";
  return "bg-zinc-800 text-zinc-300 border-white/10";
}

export default function AdminLiveControlRoomPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<TournamentStats[]>([]);
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadControlRoom() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status")
      .neq("registration_status", "Draft")
      .order("start_date", { ascending: true });

    const { data: statsData, error: statsError } = await supabase
      .from("tournament_public_stats")
      .select(
        "tournament_id, total_registrations, approved_registrations, paid_registrations"
      );

    const { data: newsData, error: newsError } = await supabase
      .from("news_posts")
      .select("id, title, category, published, created_at, published_at")
      .order("created_at", { ascending: false })
      .limit(8);

    const { data: galleryData } = await supabase
      .from("tournament_gallery")
      .select("id, tournament_id");

    const { data: resultsData } = await supabase
      .from("tournament_results")
      .select("id, tournament_id");

    if (tournamentError) {
      setMessage(`Could not load tournaments: ${tournamentError.message}`);
    } else {
      const tournamentRows = (tournamentData ?? []) as Tournament[];
      setTournaments(tournamentRows);

      if (!selectedTournamentId && tournamentRows.length > 0) {
        const liveTournament =
          tournamentRows.find((tournament) => tournament.registration_status === "Live") ??
          tournamentRows.find((tournament) => tournament.registration_status === "Open") ??
          tournamentRows[0];

        setSelectedTournamentId(liveTournament.id);
      }
    }

    if (statsError) {
      setMessage((current) => current || `Could not load stats: ${statsError.message}`);
    } else {
      setStats((statsData ?? []) as TournamentStats[]);
    }

    if (newsError) {
      setMessage((current) => current || `Could not load news: ${newsError.message}`);
    } else {
      setNewsPosts((newsData ?? []) as NewsPost[]);
    }

    setGallery((galleryData ?? []) as GalleryImage[]);
    setResults((resultsData ?? []) as ResultRow[]);
    setLoading(false);
  }

  useEffect(() => {
    loadControlRoom();

    const interval = window.setInterval(() => {
      loadControlRoom();
    }, 30000);

    return () => window.clearInterval(interval);
  }, []);

  const selectedTournament = useMemo(() => {
    return tournaments.find((tournament) => tournament.id === selectedTournamentId) ?? null;
  }, [selectedTournamentId, tournaments]);

  const selectedStats = useMemo(() => {
    return (
      stats.find((item) => item.tournament_id === selectedTournamentId) ?? {
        tournament_id: selectedTournamentId,
        total_registrations: 0,
        approved_registrations: 0,
        paid_registrations: 0,
      }
    );
  }, [selectedTournamentId, stats]);

  const selectedGalleryCount = useMemo(() => {
    return gallery.filter((image) => image.tournament_id === selectedTournamentId).length;
  }, [gallery, selectedTournamentId]);

  const selectedResultsCount = useMemo(() => {
    return results.filter((result) => result.tournament_id === selectedTournamentId).length;
  }, [results, selectedTournamentId]);

  const unpaidCount = Math.max(
    selectedStats.approved_registrations - selectedStats.paid_registrations,
    0
  );

  const lifecycleSteps = [
    {
      title: "Registrations",
      value: selectedStats.total_registrations,
      description: "Entries received",
      complete: selectedStats.total_registrations > 0,
    },
    {
      title: "Approvals",
      value: selectedStats.approved_registrations,
      description: "Players approved",
      complete: selectedStats.approved_registrations > 0,
    },
    {
      title: "Payments",
      value: selectedStats.paid_registrations,
      description: unpaidCount > 0 ? `${unpaidCount} still unpaid` : "Payments clear",
      complete: selectedStats.paid_registrations > 0 && unpaidCount === 0,
    },
    {
      title: "Results",
      value: selectedResultsCount,
      description: "Results captured",
      complete: selectedResultsCount > 0,
    },
    {
      title: "Gallery",
      value: selectedGalleryCount,
      description: "Photos archived",
      complete: selectedGalleryCount > 0,
    },
  ];

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Command Centre
          </Link>

          <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.28),_transparent_35%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Live Tournament Control Room
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-6xl">
                  Operations Centre
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                  Monitor registrations, payments, results, gallery activity and
                  live tournament updates from one screen.
                </p>

                <p className="mt-3 text-xs text-gray-500">
                  Auto-refreshes every 30 seconds.
                </p>
              </div>

              <button
                type="button"
                onClick={loadControlRoom}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
              >
                Refresh Now
              </button>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Active tournament
                </label>

                <select
                  value={selectedTournamentId}
                  onChange={(event) => setSelectedTournamentId(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
                >
                  {tournaments.map((tournament) => (
                    <option key={tournament.id} value={tournament.id}>
                      {tournament.tournament_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                  Status
                </p>

                <p
                  className={`mt-2 w-fit rounded-full border px-3 py-1 text-sm font-bold ${statusClass(
                    selectedTournament?.registration_status ?? "Unknown"
                  )}`}
                >
                  {selectedTournament?.registration_status ?? "No tournament"}
                </p>
              </div>
            </div>

            {selectedTournament && (
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-gray-400">
                <span>{formatDate(selectedTournament.start_date)}</span>
                <span>•</span>
                <span>{selectedTournament.venue}</span>
              </div>
            )}
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {lifecycleSteps.map((step) => (
              <div
                key={step.title}
                className={`rounded-3xl border p-5 ${
                  step.complete
                    ? "border-green-500/30 bg-green-500/10"
                    : "border-white/10 bg-zinc-900"
                }`}
              >
                <p className="text-sm text-gray-400">{step.title}</p>
                <p className="mt-2 text-4xl font-black text-white">{step.value}</p>
                <p className="mt-2 text-sm text-gray-500">{step.description}</p>
              </div>
            ))}
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Tournament Actions
                </p>
                <h2 className="mt-3 text-2xl font-black">Quick controls</h2>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Link
                    href={
                      selectedTournament
                        ? `/admin/tournaments/${selectedTournament.id}`
                        : "/admin/tournaments"
                    }
                    className="rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    Tournament Dashboard
                  </Link>

                  <Link
                    href={
                      selectedTournament
                        ? `/admin/tournaments/${selectedTournament.id}/results`
                        : "/admin/tournaments"
                    }
                    className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Results Centre
                  </Link>

                  <Link
                    href="/admin/registrations"
                    className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Registrations
                  </Link>

                  <Link
                    href="/admin/news"
                    className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Post Live Update
                  </Link>

                  <Link
                    href="/admin/players"
                    className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Player Centre
                  </Link>

                  <Link
                    href="/admin/import-ratings"
                    className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Ratings Import
                  </Link>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Event Lifecycle
                </p>
                <h2 className="mt-3 text-2xl font-black">What needs attention</h2>

                <div className="mt-6 space-y-3">
                  {lifecycleSteps.map((step, index) => (
                    <div
                      key={step.title}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4"
                    >
                      <div>
                        <p className="font-bold text-white">
                          {index + 1}. {step.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-500">
                          {step.description}
                        </p>
                      </div>

                      <span
                        className={`rounded-full px-3 py-1 text-xs font-black ${
                          step.complete
                            ? "bg-green-500/10 text-green-300"
                            : "bg-yellow-500/10 text-yellow-300"
                        }`}
                      >
                        {step.complete ? "OK" : "Needs work"}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Media Feed
                </p>
                <h2 className="mt-3 text-2xl font-black">Latest updates</h2>

                <div className="mt-5 space-y-3">
                  {newsPosts.length === 0 ? (
                    <p className="text-sm text-gray-400">No updates yet.</p>
                  ) : (
                    newsPosts.map((post) => (
                      <Link
                        key={post.id}
                        href="/admin/news"
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold leading-6 text-white">
                            {post.title}
                          </p>

                          <span
                            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
                              post.published
                                ? "bg-green-500/10 text-green-300"
                                : "bg-yellow-500/10 text-yellow-300"
                            }`}
                          >
                            {post.published ? "Live" : "Draft"}
                          </span>
                        </div>

                        <p className="mt-2 text-xs text-gray-500">
                          {post.category ?? "News"} • {" "}
                          {formatTimeAgo(post.published_at ?? post.created_at)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  System Status
                </p>
                <h2 className="mt-3 text-2xl font-black">Platform health</h2>

                <div className="mt-5 space-y-3">
                  <StatusRow label="Website" value="Online" />
                  <StatusRow label="Database" value="Connected" />
                  <StatusRow label="Registrations" value="Active" />
                  <StatusRow label="Results" value="Ready" />
                  <StatusRow label="Media Centre" value="Ready" />
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950 p-4">
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-sm font-bold text-green-300">● {value}</span>
    </div>
  );
}
