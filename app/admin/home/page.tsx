"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminSearchBar from "@/components/admin/AdminSearchBar";
import type { NewsPost, TournamentLite, TournamentStats } from "@/lib/pccTypes";
import { formatDate } from "@/lib/supabaseHelpers";
import { supabase } from "@/lib/supabase";

type DashboardTournament = Pick<
  TournamentLite,
  "id" | "tournament_name" | "start_date" | "venue" | "registration_status"
>;

type DashboardNewsPost = Pick<
  NewsPost,
  "id" | "title" | "category" | "published" | "created_at" | "published_at"
>;

type PlayerHealthRow = {
  id: string;
  verification_status: string | null;
  chess_sa_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  club: string | null;
  province: string | null;
};

type ImportRow = {
  id: string;
  import_type: string;
  status: string;
  total_rows: number;
  updated_rows: number;
  skipped_rows: number;
  failed_rows: number;
  created_at: string;
};

type OrganiserAccessRow = {
  id: string;
  tournament_id: string;
  organiser_email: string;
  organiser_name: string | null;
  chess_sa_id: string | null;
  access_status: string | null;
  created_at: string | null;
  tournaments: {
    tournament_name: string;
  } | null;
  players: {
    full_name: string;
    chess_sa_id: string | null;
  } | null;
};

const adminDirectory = [
  {
    group: "Daily control",
    links: [
      { href: "/admin/home", label: "Command Overview", text: "Main administration dashboard." },
      { href: "/admin/search", label: "Admin Search", text: "Find players and tournaments quickly." },
      { href: "/admin/organiser-access", label: "Organiser Access", text: "Grant tournament-only entry access." },
      { href: "/admin/organiser-requests", label: "Organiser Requests", text: "Approve or reject organiser entry changes." },
    ],
  },
  {
    group: "Players",
    links: [
      { href: "/admin/players", label: "Player Centre", text: "Search, filter and open player records." },
      { href: "/admin/members", label: "Membership Register", text: "Record paid memberships and renewal dates." },
      { href: "/admin/players/sync", label: "Chess SA Sync", text: "Import ratings and complete missing details." },
      { href: "/admin/players/duplicates", label: "Duplicate Centre", text: "Find and repair duplicate profiles." },
    ],
  },
  {
    group: "Tournaments",
    links: [
      { href: "/admin/tournaments", label: "Tournament Centre", text: "Open and manage all tournaments." },
      { href: "/admin/tournaments/new", label: "New Tournament", text: "Create a new tournament page." },
      { href: "/admin/registrations", label: "Registrations", text: "Approve entries and confirm payments." },
      { href: "/admin/payments", label: "Payment Desk", text: "Review proof of payment and unpaid entries." },
      { href: "/admin/officials", label: "Officials", text: "Assign arbiters, organisers and officials." },
      { href: "/organiser", label: "Organiser Portal", text: "Preview the organiser-facing dashboard." },
    ],
  },
  {
    group: "Records and publishing",
    links: [
      { href: "/admin/imports", label: "Import History", text: "Review every import session." },
      { href: "/admin/imports/review", label: "Import Review", text: "Inspect imported rows that need attention." },
      { href: "/admin/news", label: "Newsroom", text: "Publish news, reports and player stories." },
    ],
  },
];

function statusClass(status: string | null) {
  if (status === "Open") return "bg-green-500/10 text-green-300";
  if (status === "Completed") return "bg-blue-500/10 text-blue-300";
  if (status === "Closed") return "bg-yellow-500/10 text-yellow-300";
  if (status === "Live") return "bg-red-500/10 text-red-300";
  return "bg-zinc-800 text-zinc-300";
}

function formatTimeAgo(value: string | null) {
  if (!value) return "No date";
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

export default function AdminDashboardPage() {
  const [tournaments, setTournaments] = useState<DashboardTournament[]>([]);
  const [stats, setStats] = useState<TournamentStats[]>([]);
  const [newsPosts, setNewsPosts] = useState<DashboardNewsPost[]>([]);
  const [players, setPlayers] = useState<PlayerHealthRow[]>([]);
  const [imports, setImports] = useState<ImportRow[]>([]);
  const [organiserAccess, setOrganiserAccess] = useState<OrganiserAccessRow[]>([]);
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
      .limit(5);

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, verification_status, chess_sa_id, date_of_birth, gender, club, province"
      )
      .limit(20000);

    const { data: importData, error: importError } = await supabase
      .from("import_sessions")
      .select(
        "id, import_type, status, total_rows, updated_rows, skipped_rows, failed_rows, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(5);

    const { data: organiserAccessData, error: organiserAccessError } =
      await supabase
        .from("tournament_organiser_access")
        .select("id, tournament_id, organiser_email, organiser_name, chess_sa_id, access_status, created_at, tournaments(tournament_name), players(full_name, chess_sa_id)")
        .order("created_at", { ascending: false })
        .limit(8);

    if (tournamentError) setMessage(`Could not load tournaments: ${tournamentError.message}`);
    else setTournaments((tournamentData ?? []) as unknown as DashboardTournament[]);

    if (statsError) {
      setMessage((current) => current || `Could not load registration stats: ${statsError.message}`);
    } else {
      setStats((statsData ?? []) as unknown as TournamentStats[]);
    }

    if (newsError) {
      setMessage((current) => current || `Could not load newsroom stats: ${newsError.message}`);
    } else {
      setNewsPosts((newsData ?? []) as unknown as DashboardNewsPost[]);
    }

    if (playerError) {
      setMessage((current) => current || `Could not load player health: ${playerError.message}`);
    } else {
      setPlayers((playerData ?? []) as unknown as PlayerHealthRow[]);
    }

    if (importError) {
      setMessage((current) => current || `Could not load imports: ${importError.message}`);
    } else {
      setImports((importData ?? []) as unknown as ImportRow[]);
    }

    if (organiserAccessError) {
      setMessage((current) => current || "Could not load organiser access. Run the organiser access SQL setup.");
    } else {
      setOrganiserAccess((organiserAccessData ?? []) as unknown as OrganiserAccessRow[]);
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
      ["Open", "Live", "Closed"].includes(item.registration_status ?? "")
    ).length;
    const totalRegistrations = stats.reduce(
      (sum, item) => sum + (item.total_registrations ?? 0),
      0
    );
    const paidRegistrations = stats.reduce(
      (sum, item) => sum + (item.paid_registrations ?? 0),
      0
    );
    const verifiedPlayers = players.filter(
      (player) => player.verification_status === "Verified"
    ).length;
    const incompletePlayers = players.filter(
      (player) =>
        player.verification_status !== "Verified" ||
        !player.chess_sa_id ||
        !player.date_of_birth ||
        !player.gender ||
        !player.club ||
        !player.province
    ).length;
    const draftNews = newsPosts.filter((post) => !post.published).length;
    const failedImports = imports.filter((item) => item.failed_rows > 0).length;
    const activeOrganiserAccess = organiserAccess.filter(
      (item) => item.access_status === "Active"
    ).length;
    const unlinkedOrganiserAccess = organiserAccess.filter(
      (item) => !item.chess_sa_id && !item.players?.chess_sa_id
    ).length;

    return {
      activeTournaments,
      totalRegistrations,
      paidRegistrations,
      verifiedPlayers,
      incompletePlayers,
      draftNews,
      failedImports,
      activeOrganiserAccess,
      unlinkedOrganiserAccess,
    };
  }, [imports, newsPosts, organiserAccess, players, stats, tournaments]);

  const activeTournaments = tournaments.filter((item) =>
    ["Open", "Live", "Closed"].includes(item.registration_status ?? "")
  );
  const nextTournaments = activeTournaments.length > 0 ? activeTournaments : tournaments.slice(0, 6);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <section className="border-b border-white/10 pb-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_520px] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
                  PCC Command Centre
                </p>
              <h1 className="mt-3 text-3xl font-black md:text-6xl">
                  Command Overview
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
                  Manage club records, tournaments, registrations and publishing
                  from one secure workspace.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <CommandStat label="Active events" value={commandStats.activeTournaments} />
                <CommandStat label="Registrations" value={commandStats.totalRegistrations} />
                <CommandStat label="Verified players" value={commandStats.verifiedPlayers} />
                <CommandStat label="Organisers" value={commandStats.activeOrganiserAccess} />
                <CommandStat label="Requires attention" value={commandStats.incompletePlayers} tone="warn" />
              </div>
            </div>
          </section>

          <section className="mt-6">
            <AdminSearchBar />
          </section>

          {message && (
            <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <WorkflowLink
              href="/admin/players"
              title="Clean Player Centre"
              metric={`${commandStats.incompletePlayers} need attention`}
              description="Verify players, repair missing IDs and review Chess SA sync results."
              primary
            />
            <WorkflowLink
              href="/admin/tournaments"
              title="Run Tournaments"
              metric={`${commandStats.activeTournaments} active`}
              description="Open dashboards, registration lists, results and galleries."
            />
            <WorkflowLink
              href="/admin/registrations"
              title="Registrations"
              metric={`${commandStats.paidRegistrations} paid`}
              description="Approve entries, confirm payments and export Swiss lists."
            />
            <WorkflowLink
              href="/admin/imports"
              title="Import History"
              metric={`${commandStats.failedImports} with errors`}
              description="Review Chess SA, archive and tournament import reports."
            />
            <WorkflowLink
              href="/admin/organiser-access"
              title="Organiser Access"
              metric={`${commandStats.activeOrganiserAccess} active`}
              description={
                commandStats.unlinkedOrganiserAccess > 0
                  ? `${commandStats.unlinkedOrganiserAccess} need Chess SA link`
                  : "Grant tournament-only access linked to Chess SA IDs."
              }
            />
            <WorkflowLink
              href="/admin/organisations"
              title="Organisations"
              metric="Logos & reps"
              description="Manage clubs, schools, partners and committee representatives."
            />
            <WorkflowLink
              href="/admin/organiser-requests"
              title="Organiser Requests"
              metric="Admin approval"
              description="Review organiser entry changes before they affect the tournament."
            />
          </section>

          <section className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
                  Admin Directory
                </p>
              <h2 className="mt-2 text-2xl font-black">
                  Admin Directory
                </h2>
              </div>
              <Link
                href="/admin/login"
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
              >
                Login page
              </Link>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-2">
              {adminDirectory.map((section) => (
                <AdminDirectoryGroup
                  key={section.group}
                  group={section.group}
                  links={section.links}
                />
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
              Core Systems
            </p>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <KeepItem title="Player verification" text="Protect public profile quality and identity accuracy." />
              <KeepItem title="Chess SA sync" text="Keep ratings and player details aligned with official source data." />
              <KeepItem title="Tournament archive" text="Preserve tournament results, reports and galleries." />
              <KeepItem title="News publishing" text="Publish club updates, reports and player stories." />
            </div>
          </section>

          <section className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                    Event Operations
                  </p>
                  <h2 className="mt-2 text-3xl font-black">Active dashboards</h2>
                </div>
                <Link
                  href="/admin/tournaments/new"
                  className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  New event
                </Link>
              </div>

              {loading ? (
                <p className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
                  Loading command centre...
                </p>
              ) : nextTournaments.length === 0 ? (
                <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
                  No tournaments found.
                </p>
              ) : (
                <div className="mt-6 overflow-hidden rounded-xl border border-white/10 bg-zinc-900">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="p-4">Tournament</th>
                        <th className="p-4">Date</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Entries</th>
                        <th className="p-4">Paid</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nextTournaments.map((tournament) => {
                        const tournamentStats = getStats(tournament.id);
                        return (
                          <tr key={tournament.id} className="border-t border-white/10">
                            <td className="p-4">
                              <p className="font-black text-white">{tournament.tournament_name}</p>
                              <p className="mt-1 text-xs text-zinc-500">{tournament.venue}</p>
                            </td>
                            <td className="p-4 text-zinc-300">{formatDate(tournament.start_date)}</td>
                            <td className="p-4">
                              <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(tournament.registration_status)}`}>
                                {tournament.registration_status ?? "TBA"}
                              </span>
                            </td>
                            <td className="p-4 text-zinc-300">
                              {tournamentStats?.total_registrations ?? 0}
                            </td>
                            <td className="p-4 text-zinc-300">
                              {tournamentStats?.paid_registrations ?? 0}
                            </td>
                            <td className="p-4">
                              <Link
                                href={`/admin/tournaments/${tournament.id}`}
                                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-red-500"
                              >
                                Open
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <aside className="space-y-6">
              <section className="rounded-xl border border-white/10 bg-zinc-900 p-5">
                <h2 className="text-xl font-black">Core Tools</h2>
                <div className="mt-4 space-y-3">
                  <QuickLink href="/admin/organiser-access" label="Organiser access" />
                  <QuickLink href="/admin/organisations" label="Organisations" />
                  <QuickLink href="/admin/players/sync" label="Chess SA sync" />
                  <QuickLink href="/admin/players/duplicates" label="Duplicate checks" />
                  <QuickLink href="/admin/tournaments" label="Tournament centre" />
                  <QuickLink href="/admin/news" label="News publishing" />
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-900 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-xl font-black">Organiser access</h2>
                  <Link
                    href="/admin/organiser-access"
                    className="text-sm font-semibold text-red-300 transition hover:text-red-200"
                  >
                    Manage
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {organiserAccess.length === 0 ? (
                    <p className="text-sm text-zinc-400">No organiser access recorded.</p>
                  ) : (
                    organiserAccess.map((item) => (
                      <Link
                        key={item.id}
                        href="/admin/organiser-access"
                        className="block rounded-lg border border-white/10 bg-zinc-950 p-3 transition hover:border-red-500"
                      >
                        <p className="font-bold text-white">
                          {item.players?.full_name || item.organiser_name || item.organiser_email}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Chess SA: {item.chess_sa_id ?? item.players?.chess_sa_id ?? "Not linked"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {item.tournaments?.tournament_name ?? "Tournament"} - {item.access_status ?? "Active"}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-900 p-5">
                <h2 className="text-xl font-black">Recent imports</h2>
                <div className="mt-4 space-y-3">
                  {imports.length === 0 ? (
                    <p className="text-sm text-zinc-400">No imports recorded.</p>
                  ) : (
                    imports.map((item) => (
                      <Link
                        key={item.id}
                        href="/admin/imports"
                        className="block rounded-lg border border-white/10 bg-zinc-950 p-3 transition hover:border-red-500"
                      >
                        <p className="font-bold text-white">{item.import_type}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {item.updated_rows} updated, {item.skipped_rows} skipped - {formatTimeAgo(item.created_at)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-900 p-5">
                <h2 className="text-xl font-black">Newsroom</h2>
                <div className="mt-4 space-y-3">
                  {newsPosts.length === 0 ? (
                    <p className="text-sm text-zinc-400">No news posts yet.</p>
                  ) : (
                    newsPosts.map((post) => (
                      <Link
                        key={post.id}
                        href="/admin/news"
                        className="block rounded-lg border border-white/10 bg-zinc-950 p-3 transition hover:border-red-500"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <p className="font-bold text-white">{post.title}</p>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${post.published ? "bg-green-500/10 text-green-300" : "bg-yellow-500/10 text-yellow-300"}`}>
                            {post.published ? "Live" : "Draft"}
                          </span>
                        </div>
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

function CommandStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-3 text-center">
      <p className={`text-2xl font-black ${tone === "warn" ? "text-yellow-300" : "text-white"}`}>
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function WorkflowLink({
  href,
  title,
  metric,
  description,
  primary = false,
}: {
  href: string;
  title: string;
  metric: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-5 transition ${
        primary
          ? "border-red-500/50 bg-red-600 text-white hover:bg-red-700"
          : "border-white/10 bg-zinc-900 text-white hover:border-red-500"
      }`}
    >
      <p className="text-lg font-black">{title}</p>
      <p className={`mt-2 text-sm font-bold ${primary ? "text-red-50" : "text-red-300"}`}>
        {metric}
      </p>
      <p className={`mt-3 text-sm leading-6 ${primary ? "text-red-50/80" : "text-zinc-400"}`}>
        {description}
      </p>
    </Link>
  );
}

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="block rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm font-bold text-white transition hover:border-red-500"
    >
      {label}
    </Link>
  );
}

function KeepItem({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-950 p-4">
      <p className="font-black text-white">{title}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}

function AdminDirectoryGroup({
  group,
  links,
}: {
  group: string;
  links: { href: string; label: string; text: string }[];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-sm font-black text-white">{group}</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-lg border border-white/10 bg-zinc-900 p-3 transition hover:border-red-500"
          >
            <p className="text-sm font-black text-white">{link.label}</p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">{link.text}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
