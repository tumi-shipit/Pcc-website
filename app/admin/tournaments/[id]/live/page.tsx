"use client";

import { use, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminTournamentTabs from "@/components/admin/AdminTournamentTabs";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
};

type TournamentStats = {
  tournament_id: string;
  total_registrations: number;
  approved_registrations: number;
  paid_registrations: number;
};

type ResultRow = {
  id: string;
  section_id: string | null;
  final_position: number | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
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

type Official = {
  id: string;
  role: string;
  players: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
  } | null;
};

type NewsPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
};

type AnnouncementForm = {
  title: string;
  excerpt: string;
  content: string;
  published: boolean;
};

const emptyAnnouncement: AnnouncementForm = {
  title: "",
  excerpt: "",
  content: "",
  published: true,
};

const liveStatuses = ["Open", "Closed", "Live", "Completed"];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function formatDate(value: string | null) {
  if (!value) return "TBA";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "TBA";
  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
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

export default function TournamentLiveControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tournamentId = id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [announcement, setAnnouncement] =
    useState<AnnouncementForm>(emptyAnnouncement);
  const [currentRound, setCurrentRound] = useState("1");
  const [roundStatus, setRoundStatus] = useState("Not started");
  const [clockMinutes, setClockMinutes] = useState("25");
  const [incrementSeconds, setIncrementSeconds] = useState("2");
  const [loading, setLoading] = useState(true);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [message, setMessage] = useState("");

  async function loadLiveCentre() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      setMessage("Tournament could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: statsData } = await supabase
      .from("tournament_public_stats")
      .select(
        "tournament_id, total_registrations, approved_registrations, paid_registrations"
      )
      .eq("tournament_id", tournamentId)
      .single();

    const { data: resultData } = await supabase
      .from("tournament_results")
      .select(
        "id, section_id, final_position, points, tie_break, award_title, players(id, full_name, rating, club), tournament_sections(id, section_name)"
      )
      .eq("tournament_id", tournamentId)
      .order("section_id", { ascending: true, nullsFirst: true })
      .order("final_position", { ascending: true, nullsFirst: false })
      .limit(30);

    const { data: officialData } = await supabase
      .from("tournament_officials")
      .select("id, role, players(id, full_name, profile_photo_url)")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    const { data: newsData } = await supabase
      .from("news_posts")
      .select("id, title, excerpt, category, published, published_at, created_at")
      .or(`content.ilike.%${tournamentId}%,excerpt.ilike.%${tournamentId}%,title.ilike.%${tournamentData.tournament_name}%`)
      .order("created_at", { ascending: false })
      .limit(8);

    setTournament(tournamentData as Tournament);
    setStats((statsData ?? null) as TournamentStats | null);
    setResults((resultData ?? []) as unknown as ResultRow[]);
    setOfficials((officialData ?? []) as unknown as Official[]);
    setNews((newsData ?? []) as unknown as NewsPost[]);
    setLoading(false);
  }

  useEffect(() => {
    loadLiveCentre();
  }, [tournamentId]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, ResultRow[]> = {};

    results.forEach((result) => {
      const sectionName = result.tournament_sections?.section_name ?? "Overall";
      groups[sectionName] = groups[sectionName] ?? [];
      groups[sectionName].push(result);
    });

    return Object.entries(groups);
  }, [results]);

  const unpaidCount = useMemo(() => {
    const approved = stats?.approved_registrations ?? 0;
    const paid = stats?.paid_registrations ?? 0;
    return Math.max(approved - paid, 0);
  }, [stats]);

  async function updateTournamentStatus(status: string) {
    setMessage("");

    const { error } = await supabase
      .from("tournaments")
      .update({
        registration_status: status,
      })
      .eq("id", tournamentId);

    if (error) {
      setMessage(`Could not update status: ${error.message}`);
      return;
    }

    setMessage(`Tournament status set to ${status}.`);
    await loadLiveCentre();
  }

  async function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!announcement.title.trim() || !announcement.excerpt.trim()) {
      setMessage("Announcement title and excerpt are required.");
      return;
    }

    setSavingAnnouncement(true);
    setMessage("");

    const now = new Date().toISOString();

    const content = `${announcement.content.trim() || announcement.excerpt.trim()}

Tournament: ${tournament?.tournament_name ?? ""}
Public page: /tournaments/${tournamentId}
Tournament ID: ${tournamentId}`;

    const { error } = await supabase.from("news_posts").insert({
      title: announcement.title.trim(),
      excerpt: announcement.excerpt.trim(),
      content,
      image_url: null,
      category: "Live Update",
      published: announcement.published,
      published_at: announcement.published ? now : null,
      updated_at: now,
    });

    if (error) {
      setMessage(`Could not publish announcement: ${error.message}`);
      setSavingAnnouncement(false);
      return;
    }

    setAnnouncement(emptyAnnouncement);
    setMessage("Live announcement published.");
    setSavingAnnouncement(false);
    await loadLiveCentre();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading live control room...
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
             Back to Tournament Dashboard
          </Link>

          <AdminTournamentTabs id={tournamentId} />

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Live Tournament Control Room
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-6xl">
                  {tournament.tournament_name}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                  Control tournament status, publish live updates, monitor
                  registrations, track officials and access live results tools.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                    {formatDate(tournament.start_date)}
                  </span>
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                    {tournament.venue ?? "Venue TBA"}
                  </span>
                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                    {tournament.registration_status ?? "Status TBA"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/tournaments/${tournamentId}`}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Public Page
                </Link>

                <Link
                  href={`/admin/tournaments/${tournamentId}/results`}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Results Centre
                </Link>
              </div>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Total Registered" value={stats?.total_registrations ?? 0} />
            <StatCard label="Approved" value={stats?.approved_registrations ?? 0} tone="green" />
            <StatCard label="Paid" value={stats?.paid_registrations ?? 0} />
            <StatCard label="Unpaid" value={unpaidCount} tone="yellow" />
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
            <section className="space-y-8">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Tournament Status
                </p>
                <h2 className="mt-3 text-2xl font-black">Control state</h2>

                <div className="mt-6 grid gap-3 sm:grid-cols-4">
                  {liveStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateTournamentStatus(status)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        tournament.registration_status === status
                          ? "border-red-500 bg-red-500/10"
                          : "border-white/10 bg-zinc-950 hover:border-red-500"
                      }`}
                    >
                      <p className="text-xl font-black">{status}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        Set tournament {status}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Round Control
                </p>
                <h2 className="mt-3 text-2xl font-black">Current round</h2>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Round
                    </span>
                    <input
                      value={currentRound}
                      onChange={(event) => setCurrentRound(event.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Status
                    </span>
                    <select
                      value={roundStatus}
                      onChange={(event) => setRoundStatus(event.target.value)}
                      className={inputClass}
                    >
                      <option>Not started</option>
                      <option>Pairings published</option>
                      <option>Round in progress</option>
                      <option>Results being entered</option>
                      <option>Round completed</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Minutes
                    </span>
                    <input
                      value={clockMinutes}
                      onChange={(event) => setClockMinutes(event.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Increment
                    </span>
                    <input
                      value={incrementSeconds}
                      onChange={(event) => setIncrementSeconds(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5">
                  <p className="text-sm text-gray-400">Display summary</p>
                  <p className="mt-2 text-2xl font-black">
                    Round {currentRound}  -  {clockMinutes}+{incrementSeconds}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{roundStatus}</p>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                      Live Standings
                    </p>
                    <h2 className="mt-3 text-2xl font-black">Top rankings</h2>
                  </div>

                  <Link
                    href={`/admin/tournaments/${tournamentId}/import-results`}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Import Results
                  </Link>
                </div>

                {groupedResults.length === 0 ? (
                  <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                    No standings imported yet.
                  </p>
                ) : (
                  <div className="mt-6 space-y-5">
                    {groupedResults.map(([sectionName, sectionResults]) => (
                      <div
                        key={sectionName}
                        className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                      >
                        <h3 className="text-xl font-black">{sectionName}</h3>

                        <div className="mt-4 space-y-2">
                          {sectionResults.slice(0, 5).map((result) => (
                            <Link
                              key={result.id}
                              href={`/admin/players/${result.players?.id}`}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 p-3 transition hover:border-red-500"
                            >
                              <span className="font-bold text-white">
                                {medal(result.final_position)}{" "}
                                {result.players?.full_name ?? "Player not linked"}
                              </span>

                              <span className="text-sm text-gray-400">
                                {valueOrDash(result.points)} pts
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </section>

            <aside className="space-y-8">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Live Announcement
                </p>
                <h2 className="mt-3 text-2xl font-black">Publish update</h2>

                <form onSubmit={publishAnnouncement} className="mt-6 space-y-4">
                  <input
                    value={announcement.title}
                    onChange={(event) =>
                      setAnnouncement((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Round 3 pairings published"
                    className={inputClass}
                  />

                  <textarea
                    value={announcement.excerpt}
                    onChange={(event) =>
                      setAnnouncement((current) => ({
                        ...current,
                        excerpt: event.target.value,
                      }))
                    }
                    placeholder="Short public update..."
                    rows={3}
                    className={inputClass}
                  />

                  <textarea
                    value={announcement.content}
                    onChange={(event) =>
                      setAnnouncement((current) => ({
                        ...current,
                        content: event.target.value,
                      }))
                    }
                    placeholder="Full announcement..."
                    rows={5}
                    className={inputClass}
                  />

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 p-4">
                    <input
                      type="checkbox"
                      checked={announcement.published}
                      onChange={(event) =>
                        setAnnouncement((current) => ({
                          ...current,
                          published: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 accent-red-600"
                    />
                    <span className="text-sm font-semibold">Publish immediately</span>
                  </label>

                  <button
                    type="submit"
                    disabled={savingAnnouncement}
                    className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {savingAnnouncement ? "Publishing..." : "Publish Update"}
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Officials
                </p>
                <h2 className="mt-3 text-2xl font-black">Arbiter team</h2>

                <div className="mt-6 space-y-3">
                  {officials.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                      No officials linked yet.
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
                  Latest Updates
                </p>
                <h2 className="mt-3 text-2xl font-black">Newsroom</h2>

                <div className="mt-6 space-y-3">
                  {news.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                      No linked live updates yet.
                    </p>
                  ) : (
                    news.map((post) => (
                      <Link
                        key={post.id}
                        href={`/news/${post.id}`}
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <p className="font-bold text-white">{post.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {post.category ?? "News"}  - {" "}
                          {formatDateTime(post.published_at)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
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

