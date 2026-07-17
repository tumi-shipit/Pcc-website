"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import type { TournamentOfficial } from "@/lib/pccTypes";
import {
  formatDate,
  initials,
  valueOrDash,
  singleRelation,
} from "@/lib/supabaseHelpers";
import { supabase } from "@/lib/supabase";

type OfficialPlayer = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  verification_status: string | null;
  profile_photo_url: string | null;
  title: string | null;
};

type OfficialTournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string;
  province: string | null;
  registration_status: string;
};

type OfficialQueryRow = Omit<TournamentOfficial, "players" | "tournaments"> & {
  players: OfficialPlayer | OfficialPlayer[] | null;
  tournaments: OfficialTournament | OfficialTournament[] | null;
};

type NormalizedOfficialRow = Omit<
  TournamentOfficial,
  "players" | "tournaments"
> & {
  players: OfficialPlayer | null;
  tournaments: OfficialTournament | null;
};

type OrganiserAccessPlayer = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  profile_photo_url: string | null;
};

type OrganiserAccessTournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
};

type OrganiserAccessQueryRow = {
  id: string;
  tournament_id: string;
  player_id: string | null;
  chess_sa_id: string | null;
  organiser_email: string;
  organiser_name: string | null;
  role: string | null;
  access_status: string | null;
  created_at: string | null;
  tournaments: OrganiserAccessTournament | OrganiserAccessTournament[] | null;
  players: OrganiserAccessPlayer | OrganiserAccessPlayer[] | null;
};

type NormalizedOrganiserAccessRow = Omit<
  OrganiserAccessQueryRow,
  "players" | "tournaments"
> & {
  players: OrganiserAccessPlayer | null;
  tournaments: OrganiserAccessTournament | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

const roleGroups = {
  Arbiter: [
    "Chief Arbiter",
    "Deputy Arbiter",
    "Deputy Chief Arbiter",
    "Arbiter",
    "Assistant Arbiter",
    "Pairings Officer",
    "Appeals Committee",
  ],
  Organising: [
    "Main Organiser",
    "Chief Organiser",
    "Assistant Organiser",
    "Tournament Director",
    "Organiser",
  ],
  Support: ["Media Officer", "Technical Officer", "Volunteer"],
};

function roleTone(role: string) {
  if (roleGroups.Arbiter.includes(role)) return "bg-red-500/10 text-red-200";
  if (roleGroups.Organising.includes(role))
    return "bg-blue-500/10 text-blue-200";
  if (roleGroups.Support.includes(role))
    return "bg-green-500/10 text-green-200";
  return "bg-zinc-800 text-zinc-300";
}

export default function AdminOfficialsPage() {
  const [officials, setOfficials] = useState<NormalizedOfficialRow[]>([]);
  const [organiserAccess, setOrganiserAccess] = useState<
    NormalizedOrganiserAccessRow[]
  >([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [tournamentFilter, setTournamentFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOfficials() {
    setLoading(true);
    setMessage("");

    const [{ data, error }, { data: accessData, error: accessError }] =
      await Promise.all([
        supabase
      .from("tournament_officials")
      .select(
        "id, tournament_id, player_id, role, notes, created_at, updated_at, players(id, full_name, chess_sa_id, fide_id, club, province, rating, verification_status, profile_photo_url, title), tournaments(id, tournament_name, start_date, venue, province, registration_status)"
      )
      .order("created_at", { ascending: false })
          .limit(10000),
        supabase
          .from("tournament_organiser_access")
          .select(
            "id, tournament_id, player_id, chess_sa_id, organiser_email, organiser_name, role, access_status, created_at, tournaments(id, tournament_name, start_date, venue), players(id, full_name, chess_sa_id, profile_photo_url)"
          )
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

    if (error) {
      setMessage(`Could not load officials: ${error.message}`);
    } else {
      const rows = (data ?? []) as OfficialQueryRow[];

      setOfficials(
        rows.map((row) => ({
          ...row,
          players: singleRelation(row.players),
          tournaments: singleRelation(row.tournaments),
        }))
      );
    }

    if (accessError) {
      setMessage((current) =>
        current || "Could not load organiser portal access. Run the organiser access setup first."
      );
    } else {
      const accessRows = (accessData ?? []) as OrganiserAccessQueryRow[];

      setOrganiserAccess(
        accessRows.map((row) => ({
          ...row,
          players: singleRelation(row.players),
          tournaments: singleRelation(row.tournaments),
        }))
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadOfficials();
  }, []);

  const roles = useMemo(() => {
    return [
      "All",
      ...Array.from(new Set(officials.map((item) => item.role))).sort(),
    ];
  }, [officials]);

  const tournaments = useMemo(() => {
    const map = new Map<string, string>();

    officials.forEach((official) => {
      if (official.tournaments) {
        map.set(official.tournaments.id, official.tournaments.tournament_name);
      }
    });

    return [
      { id: "All", name: "All tournaments" },
      ...Array.from(map.entries()).map(([id, name]) => ({ id, name })),
    ];
  }, [officials]);

  const filteredOfficials = useMemo(() => {
    const text = search.trim().toLowerCase();

    return officials.filter((official) => {
      const player = official.players;
      const tournament = official.tournaments;

      const matchesSearch =
        !text ||
        official.role.toLowerCase().includes(text) ||
        (official.notes ?? "").toLowerCase().includes(text) ||
        (player?.full_name ?? "").toLowerCase().includes(text) ||
        (player?.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (player?.fide_id ?? "").toLowerCase().includes(text) ||
        (player?.club ?? "").toLowerCase().includes(text) ||
        (player?.province ?? "").toLowerCase().includes(text) ||
        (tournament?.tournament_name ?? "").toLowerCase().includes(text) ||
        (tournament?.venue ?? "").toLowerCase().includes(text);

      const matchesRole = roleFilter === "All" || official.role === roleFilter;

      const matchesTournament =
        tournamentFilter === "All" || official.tournament_id === tournamentFilter;

      const matchesStatus =
        statusFilter === "All" ||
        tournament?.registration_status === statusFilter ||
        (statusFilter === "Missing Profile" && !player) ||
        (statusFilter === "Unverified Player" &&
          player &&
          player.verification_status !== "Verified");

      return matchesSearch && matchesRole && matchesTournament && matchesStatus;
    });
  }, [officials, search, roleFilter, tournamentFilter, statusFilter]);

  const stats = useMemo(() => {
    const uniquePeople = new Set(
      officials.map((official) => official.player_id).filter(Boolean)
    ).size;
    const activePortalAccess = organiserAccess.filter(
      (item) => item.access_status !== "Revoked"
    );

    return {
      assignments: officials.length,
      uniquePeople,
      arbiters: officials.filter((item) => roleGroups.Arbiter.includes(item.role))
        .length,
      organisers: officials.filter((item) =>
        roleGroups.Organising.includes(item.role)
      ).length,
      support: officials.filter((item) => roleGroups.Support.includes(item.role))
        .length,
      missingProfiles: officials.filter((item) => !item.players).length,
      portalAccess: activePortalAccess.length,
    };
  }, [officials, organiserAccess]);

  const activeOrganiserAccess = useMemo(
    () => organiserAccess.filter((item) => item.access_status !== "Revoked"),
    [organiserAccess]
  );

  const officialHasPortalAccess = (official: NormalizedOfficialRow) => {
    const playerChessSaId = official.players?.chess_sa_id;

    return activeOrganiserAccess.some((access) => {
      if (access.tournament_id !== official.tournament_id) return false;
      if (access.player_id && access.player_id === official.player_id) return true;
      return Boolean(
        access.chess_sa_id && playerChessSaId && access.chess_sa_id === playerChessSaId
      );
    });
  };

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Admin Home
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Official Centre
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Arbiters & Organisers
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Manage every person serving as an arbiter, organiser, tournament
              director, media officer, technical official or volunteer across
              all tournaments.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-7">
            <StatCard label="Assignments" value={stats.assignments} />
            <StatCard label="People" value={stats.uniquePeople} tone="green" />
            <StatCard label="Arbiter Roles" value={stats.arbiters} tone="red" />
            <StatCard label="Organising" value={stats.organisers} tone="blue" />
            <StatCard label="Portal Access" value={stats.portalAccess} tone="green" />
            <StatCard label="Support" value={stats.support} tone="yellow" />
            <StatCard label="Missing Profiles" value={stats.missingProfiles} tone="red" />
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
            <div className="grid gap-4 lg:grid-cols-[1fr_220px_260px_220px_160px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search official, role, tournament, Chess SA ID..."
                className={inputClass}
              />

              <select
                value={roleFilter}
                onChange={(event) => setRoleFilter(event.target.value)}
                className={inputClass}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role === "All" ? "All roles" : role}
                  </option>
                ))}
              </select>

              <select
                value={tournamentFilter}
                onChange={(event) => setTournamentFilter(event.target.value)}
                className={inputClass}
              >
                {tournaments.map((tournament) => (
                  <option key={tournament.id} value={tournament.id}>
                    {tournament.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={inputClass}
              >
                <option value="All">All status</option>
                <option value="Open">Open tournaments</option>
                <option value="Live">Live tournaments</option>
                <option value="Completed">Completed</option>
                <option value="Missing Profile">Missing profile</option>
                <option value="Unverified Player">Unverified player</option>
              </select>

              <button
                type="button"
                onClick={loadOfficials}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Refresh
              </button>
            </div>
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <QuickAction
              href="/admin/tournaments"
              title="Assign from Tournament"
              description="Open a tournament and assign arbiters or organisers."
            />
            <QuickAction
              href="/admin/organiser-access"
              title="Organiser Access"
              description="Give organisers tournament-only access to entries."
            />
            <QuickAction
              href="/admin/players"
              title="Find Player Profile"
              description="Search the Player Centre before assigning officials."
            />
            <QuickAction
              href="/admin/players"
              title="Verification Queue"
              description="Verify official profiles with missing identity details."
            />
            <QuickAction
              href="/admin/players/duplicates"
              title="Duplicate Centre"
              description="Merge duplicate official or player profiles."
            />
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">
                  Linked Access
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  Organiser Portal Access
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                  Official assignments control event roles. Portal access controls
                  which organiser can log in and view entries for one tournament.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href="/admin/organiser-access"
                  className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Manage Access
                </Link>
                <Link
                  href="/organiser/login"
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Organiser Login
                </Link>
              </div>
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-2">
              {activeOrganiserAccess.slice(0, 8).map((access) => (
                <div
                  key={access.id}
                  className="rounded-2xl border border-white/10 bg-zinc-950 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-black text-white">
                        {access.players?.full_name ||
                          access.organiser_name ||
                          access.organiser_email}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {access.organiser_email}
                      </p>
                    </div>
                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                      {access.access_status ?? "Active"}
                    </span>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-gray-400 md:grid-cols-2">
                    <p>
                      Chess SA:{" "}
                      {valueOrDash(access.chess_sa_id ?? access.players?.chess_sa_id)}
                    </p>
                    <p>Role: {valueOrDash(access.role ?? "Organiser")}</p>
                    <p className="md:col-span-2">
                      Tournament:{" "}
                      {access.tournaments?.tournament_name ?? access.tournament_id}
                    </p>
                  </div>
                </div>
              ))}

              {!loading && activeOrganiserAccess.length === 0 && (
                <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400 lg:col-span-2">
                  No active organiser portal access has been granted yet.
                </p>
              )}
            </div>
          </section>

          {loading ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
              Loading officials...
            </p>
          ) : filteredOfficials.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
              No officials found.
            </p>
          ) : (
            <section className="mt-8 space-y-4">
              {filteredOfficials.map((official) => {
                const player = official.players;
                const tournament = official.tournaments;

                return (
                  <article
                    key={official.id}
                    className="rounded-3xl border border-white/10 bg-zinc-900 p-5 transition hover:border-red-500/50"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <Link
                          href={player ? `/admin/players/${player.id}` : "#"}
                          className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-950 text-lg font-black text-red-200"
                        >
                          {player?.profile_photo_url ? (
                            <Image
                              src={player.profile_photo_url}
                              alt={player.full_name}
                              fill
                              sizes="80px"
                              className="object-cover"
                            />
                          ) : (
                            initials(player?.full_name ?? "Official")
                          )}
                        </Link>

                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${roleTone(
                                official.role
                              )}`}
                            >
                              {official.role}
                            </span>

                            {player?.verification_status === "Verified" ? (
                              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                                Verified
                              </span>
                            ) : (
                              <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300">
                                Needs review
                              </span>
                            )}

                            {!player && (
                              <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">
                                Missing player profile
                              </span>
                            )}

                            {officialHasPortalAccess(official) && (
                              <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                                Portal access linked
                              </span>
                            )}
                          </div>

                          {player ? (
                            <Link
                              href={`/admin/players/${player.id}`}
                              className="mt-3 block text-2xl font-black text-white transition hover:text-red-300"
                            >
                              {player.full_name}
                            </Link>
                          ) : (
                            <p className="mt-3 text-2xl font-black text-white">
                              Unknown official
                            </p>
                          )}

                          <div className="mt-2 grid gap-2 text-sm text-gray-400 md:grid-cols-3">
                            <p>Chess SA: {valueOrDash(player?.chess_sa_id)}</p>
                            <p>FIDE: {valueOrDash(player?.fide_id)}</p>
                            <p>Title: {valueOrDash(player?.title)}</p>
                            <p>Club: {valueOrDash(player?.club)}</p>
                            <p>Province: {valueOrDash(player?.province)}</p>
                            <p>Rating: {valueOrDash(player?.rating)}</p>
                          </div>

                          {official.notes && (
                            <p className="mt-3 text-sm leading-6 text-gray-500">
                              {official.notes}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="min-w-[260px] rounded-2xl border border-white/10 bg-zinc-950 p-4">
                        {tournament ? (
                          <>
                            <Link
                              href={`/admin/tournaments/${tournament.id}`}
                              className="font-black text-white transition hover:text-red-300"
                            >
                              {tournament.tournament_name}
                            </Link>

                            <p className="mt-2 text-sm text-gray-400">
                              {formatDate(tournament.start_date)}  -  {tournament.venue}
                            </p>

                            <p className="mt-1 text-xs text-gray-500">
                              {tournament.registration_status}
                            </p>

                            <div className="mt-4 grid gap-2">
                              <Link
                                href={`/admin/tournaments/${tournament.id}/arbiters`}
                                className="rounded-xl border border-white/10 px-3 py-2 text-center text-xs font-bold text-white transition hover:border-red-500"
                              >
                                Arbiters
                              </Link>

                              <Link
                                href={`/admin/tournaments/${tournament.id}/arbiters`}
                                className="rounded-xl border border-white/10 px-3 py-2 text-center text-xs font-bold text-white transition hover:border-red-500"
                              >
                                Organisers
                              </Link>

                              <Link
                                href="/admin/organiser-access"
                                className="rounded-xl border border-white/10 px-3 py-2 text-center text-xs font-bold text-white transition hover:border-red-500"
                              >
                                Portal access
                              </Link>
                            </div>
                          </>
                        ) : (
                          <p className="text-sm text-gray-400">
                            Tournament not linked.
                          </p>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

function QuickAction({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:-translate-y-1 hover:border-red-500"
    >
      <p className="text-xl font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
    </Link>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "yellow" | "red" | "blue";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "red"
      ? "text-red-300"
      : tone === "blue"
      ? "text-blue-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

