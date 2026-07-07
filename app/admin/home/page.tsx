"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/AdminGuard";

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

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTimeAgo(value: string | null) {
  if (!value) return "Not published";

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
  if (status === "Open") return "bg-green-500/10 text-green-300";
  if (status === "Completed") return "bg-blue-500/10 text-blue-300";
  if (status === "Closed") return "bg-yellow-500/10 text-yellow-300";
  if (status === "Live") return "bg-red-500/10 text-red-300";
  return "bg-zinc-800 text-zinc-300";
}

export default function AdminDashboardPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<TournamentStats[]>([]);
  const [newsPosts, setNewsPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadDashboard() {
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
      .limit(6);

    if (tournamentError) {
      setMessage(`Could not load tournaments: ${tournamentError.message}`);
    } else {
      setTournaments((tournamentData ?? []) as Tournament[]);
    }

    if (statsError) {
      setMessage((current) =>
        current || `Could not load registration stats: ${statsError.message}`
      );
    } else {
      setStats((statsData ?? []) as TournamentStats[]);
    }

    if (newsError) {
      setMessage((current) =>
        current || `Could not load newsroom stats: ${newsError.message}`
      );
    } else {
      setNewsPosts((newsData ?? []) as NewsPost[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  function getStats(tournamentId: string) {
    return stats.find((item) => item.tournament_id === tournamentId);
  }

  const commandStats = useMemo(() => {
    const activeTournaments = tournaments.filter((item) =>
      ["Open", "Live", "Closed"].includes(item.registration_status)
    ).length;

    const archivedTournaments = tournaments.filter(
      (item) => item.registration_status === "Completed"
    ).length;

    const totalRegistrations = stats.reduce(
      (sum, item) => sum + (item.total_registrations ?? 0),
      0
    );

    const approvedRegistrations = stats.reduce(
      (sum, item) => sum + (item.approved_registrations ?? 0),
      0
    );

    const paidRegistrations = stats.reduce(
      (sum, item) => sum + (item.paid_registrations ?? 0),
      0
    );

    const publishedNews = newsPosts.filter((post) => post.published).length;
    const draftNews = newsPosts.filter((post) => !post.published).length;
    const liveUpdates = newsPosts.filter(
      (post) => post.category === "Live Update"
    ).length;

    return {
      activeTournaments,
      archivedTournaments,
      totalRegistrations,
      approvedRegistrations,
      paidRegistrations,
      pendingRegistrations: Math.max(
        totalRegistrations - approvedRegistrations,
        0
      ),
      publishedNews,
      draftNews,
      liveUpdates,
    };
  }, [newsPosts, stats, tournaments]);

  const quickActions = [
    {
      title: "New Tournament",
      href: "/admin/tournaments/new",
      icon: "🏆",
      tone: "bg-red-600 hover:bg-red-700",
    },
    {
      title: "News Update",
      href: "/admin/news",
      icon: "📰",
      tone: "bg-zinc-900 hover:border-red-500 border border-white/10",
    },
    {
      title: "Live Update",
      href: "/admin/news",
      icon: "🔴",
      tone: "bg-zinc-900 hover:border-red-500 border border-white/10",
    },
    {
      title: "Registrations",
      href: "/admin/registrations",
      icon: "📝",
      tone: "bg-zinc-900 hover:border-red-500 border border-white/10",
    },
    {
      title: "Import Ratings",
      href: "/admin/import-ratings",
      icon: "📊",
      tone: "bg-zinc-900 hover:border-red-500 border border-white/10",
    },
  ];

  const adminCards = [
    {
      title: "Tournament Management",
      description: `${commandStats.activeTournaments} active • ${commandStats.archivedTournaments} archived`,
      href: "/admin/tournaments",
      icon: "🏆",
    },
    {
      title: "Registrations",
      description: `${commandStats.totalRegistrations} total • ${commandStats.paidRegistrations} paid`,
      href: "/admin/registrations",
      icon: "📝",
    },
    {
      title: "Player Centre",
      description: "Search players, ratings and tournament history.",
      href: "/admin/players",
      icon: "👤",
    },
    {
      title: "Live Control Room",
      description: "Monitor registrations, payments, results and live updates.",
      href: "/admin/live",
      icon: "🎮",
    },
    {
      title: "Media Centre",
      description: `${commandStats.publishedNews} published • ${commandStats.draftNews} drafts`,
      href: "/admin/news",
      icon: "📰",
    },
    {
      title: "Import Ratings",
      description: "Upload Chess SA rating files.",
      href: "/admin/import-ratings",
      icon: "📊",
    },
    {
      title: "Tournament Archive Wizard",
      description: "Import historical tournaments, players and results.",
      href: "/admin/import-tournament",
      icon: "🗄️",
    },
    {
      title: "Public Website",
      description: "Open the public PCC website.",
      href: "/",
      icon: "🌍",
    },
  ];

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.25),_transparent_35%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(45deg,#fff_1px,transparent_1px),linear-gradient(-45deg,#fff_1px,transparent_1px)] [background-size:42px_42px]" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  PCC Command Centre
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-6xl">
                  Club Control Centre
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                  Manage tournaments, registrations, payments, ratings, news,
                  live updates and public website content from one place.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CommandStat label="Active Events" value={commandStats.activeTournaments} />
                <CommandStat label="Registrations" value={commandStats.totalRegistrations} />
                <CommandStat label="Paid" value={commandStats.paidRegistrations} />
                <CommandStat label="Draft News" value={commandStats.draftNews} />
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickActions.map((action) => (
              <Link
                key={action.title}
                href={action.href}
                className={`rounded-2xl px-5 py-4 text-center text-sm font-black text-white transition hover:-translate-y-1 ${action.tone}`}
              >
                <span className="mr-2">{action.icon}</span>
                {action.title}
              </Link>
            ))}
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {adminCards.map((card) => (
              <Link
                key={card.title}
                href={card.href}
                className="group rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:-translate-y-1 hover:border-red-500/60"
              >
                <p className="text-3xl">{card.icon}</p>
                <h2 className="mt-4 text-lg font-black group-hover:text-red-300">
                  {card.title}
                </h2>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {card.description}
                </p>
              </Link>
            ))}
          </section>

          <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Tournament Operations
                  </p>
                  <h2 className="mt-3 text-3xl font-black">Tournament Dashboards</h2>
                </div>

                <Link
                  href="/admin/tournaments/new"
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  + New
                </Link>
              </div>

              {loading ? (
                <p className="mt-8 text-gray-400">Loading admin dashboard...</p>
              ) : (
                <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {tournaments.map((tournament) => {
                    const tournamentStats = getStats(tournament.id);

                    return (
                      <Link
                        key={tournament.id}
                        href={`/admin/tournaments/${tournament.id}`}
                        className="group rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:-translate-y-1 hover:border-red-500/60"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                              {formatDate(tournament.start_date)}
                            </p>

                            <h3 className="mt-2 text-xl font-black leading-7 group-hover:text-red-300">
                              {tournament.tournament_name}
                            </h3>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              tournament.registration_status
                            )}`}
                          >
                            {tournament.registration_status}
                          </span>
                        </div>

                        <p className="mt-3 text-sm text-gray-400">
                          {tournament.venue}
                        </p>

                        <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                          <MiniStat
                            label="Total"
                            value={tournamentStats?.total_registrations ?? 0}
                          />
                          <MiniStat
                            label="Approved"
                            value={tournamentStats?.approved_registrations ?? 0}
                            valueClass="text-green-300"
                          />
                          <MiniStat
                            label="Paid"
                            value={tournamentStats?.paid_registrations ?? 0}
                            valueClass="text-blue-300"
                          />
                        </div>

                        <p className="mt-5 text-sm font-semibold text-red-300">
                          Open tournament dashboard →
                        </p>
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

            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Recent Newsroom
                </p>
                <h2 className="mt-3 text-2xl font-black">Latest Activity</h2>

                <div className="mt-5 space-y-3">
                  {newsPosts.length === 0 ? (
                    <p className="text-sm text-gray-400">No newsroom posts yet.</p>
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
                          {post.category ?? "News"} •{" "}
                          {formatTimeAgo(post.published_at ?? post.created_at)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  System
                </p>
                <h2 className="mt-3 text-2xl font-black">Status</h2>

                <div className="mt-5 space-y-3">
                  <StatusRow label="Website" value="Online" />
                  <StatusRow label="Database" value="Connected" />
                  <StatusRow label="Newsroom" value="Ready" />
                  <StatusRow label="Registrations" value="Active" />
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function CommandStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4 text-center backdrop-blur-md">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${valueClass}`}>{value}</p>
    </div>
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
