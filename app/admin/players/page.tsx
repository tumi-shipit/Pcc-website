"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import PlayerAvatar from "@/components/PlayerAvatar";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  pcc_id: string | null;
  full_name: string;
  fide_id: string | null;
  chess_sa_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  email: string | null;
  phone: string | null;
  verification_status: string | null;
  profile_photo_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Registration = {
  player_id: string | null;
  tournament_id: string | null;
  section_id: string | null;
  payment_status: string | null;
  proof_of_payment_url: string | null;
  registration_status: string | null;
  created_at: string | null;
  updated_at: string | null;
  tournaments?: TournamentSummary | TournamentSummary[] | null;
  tournament_sections?: SectionSummary | SectionSummary[] | null;
};

type TournamentResult = {
  player_id: string | null;
  imported_name: string | null;
  tournament_id: string | null;
  section_id: string | null;
  final_position: number | null;
  points: number | null;
  created_at: string | null;
  tournaments?: TournamentSummary | TournamentSummary[] | null;
  tournament_sections?: SectionSummary | SectionSummary[] | null;
};

type TournamentSummary = {
  id: string;
  tournament_name: string | null;
  start_date: string | null;
  registration_status: string | null;
};

type SectionSummary = {
  id: string;
  section_name: string | null;
};

type ActivityItem = {
  tournament_id: string;
  tournament_name: string;
  section_name: string | null;
  start_date: string | null;
  status: string | null;
  detail: string | null;
};

type ActivityFilter =
  | "All"
  | "Has registrations"
  | "Has final rankings"
  | "Registered only"
  | "Final ranking only"
  | "Different activity"
  | "No activity";

type PlayerWithStats = Player & {
  tournaments_entered: number;
  final_ranking_events: number;
  approved_entries: number;
  paid_entries: number;
  latest_registration: string | null;
  registered_tournaments: ActivityItem[];
  final_ranking_tournaments: ActivityItem[];
  profile_health: "Ready" | "Review" | "Missing IDs";
};

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500";

function calculateAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function formatDate(value: string | null) {
  if (!value) return "No activity";

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

function singleRelation<T>(value: T | T[] | null | undefined) {
  if (Array.isArray(value)) return value[0] ?? null;
  return value ?? null;
}

function uniqueActivityItems(items: ActivityItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.tournament_id}:${item.section_name ?? ""}:${item.detail ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function activityNameKey(name: string | null | undefined) {
  return (name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .sort()
    .join(" ");
}

function activityTournamentIds(items: ActivityItem[]) {
  return new Set(items.map((item) => item.tournament_id));
}

function hasDifferentActivity(player: PlayerWithStats) {
  const registeredIds = activityTournamentIds(player.registered_tournaments);
  const rankingIds = activityTournamentIds(player.final_ranking_tournaments);

  if (registeredIds.size !== rankingIds.size) return true;

  for (const tournamentId of registeredIds) {
    if (!rankingIds.has(tournamentId)) return true;
  }

  return false;
}

function profileHealth(player: Player): PlayerWithStats["profile_health"] {
  if (!player.chess_sa_id && !player.fide_id) return "Missing IDs";
  if (
    player.verification_status !== "Verified" ||
    !player.gender ||
    !player.date_of_birth ||
    !player.club ||
    !player.province
  ) {
    return "Review";
  }
  return "Ready";
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("All");
  const [healthFilter, setHealthFilter] = useState("All");
  const [verificationView, setVerificationView] = useState("Unverified");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [deletingPlayerId, setDeletingPlayerId] = useState<string | null>(null);

  async function loadPlayers() {
    setLoading(true);
    setMessage("");

    const { data: roleData } = await supabase.rpc("current_admin_role");
    setCurrentRole(typeof roleData === "string" ? roleData : null);

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, pcc_id, full_name, fide_id, chess_sa_id, date_of_birth, gender, club, province, rating, email, phone, verification_status, profile_photo_url, created_at, updated_at"
      )
      .order("full_name", { ascending: true })
      .limit(5000);

    const { data: registrationData, error: registrationError } = await supabase
      .from("registrations")
      .select(
        "player_id, tournament_id, section_id, payment_status, proof_of_payment_url, registration_status, created_at, updated_at, tournaments(id, tournament_name, start_date, registration_status), tournament_sections(id, section_name)"
      );

    const { data: resultData, error: resultError } = await supabase
      .from("tournament_results")
      .select(
        "player_id, imported_name, tournament_id, section_id, final_position, points, created_at, tournaments(id, tournament_name, start_date, registration_status), tournament_sections(id, section_name)"
      );

    if (playerError) {
      setMessage(`Could not load players: ${playerError.message}`);
    } else {
      setPlayers((playerData ?? []) as unknown as Player[]);
    }

    if (registrationError) {
      setMessage((current) =>
        current || `Could not load player activity: ${registrationError.message}`
      );
    } else {
      setRegistrations((registrationData ?? []) as unknown as Registration[]);
    }

    if (resultError) {
      setMessage((current) =>
        current || `Could not load final ranking activity: ${resultError.message}`
      );
    } else {
      setResults((resultData ?? []) as unknown as TournamentResult[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadPlayers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function deleteInactivePlayer(player: PlayerWithStats) {
    const hasActivity =
      player.registered_tournaments.length > 0 ||
      player.final_ranking_tournaments.length > 0;

    if (currentRole !== "super_admin") {
      setMessage("Only the super admin can delete Player Centre records.");
      return;
    }

    if (hasActivity) {
      setMessage(
        `${player.full_name} is protected because tournament activity is linked to this record.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Delete ${player.full_name} from the Player Centre? This is only for records with no registrations and no final rankings.`
    );

    if (!confirmed) return;

    setDeletingPlayerId(player.id);
    setMessage("");

    const { count: registrationCount, error: registrationCheckError } = await supabase
      .from("registrations")
      .select("id", { count: "exact", head: true })
      .eq("player_id", player.id);

    const { count: resultCount, error: resultCheckError } = await supabase
      .from("tournament_results")
      .select("id", { count: "exact", head: true })
      .eq("player_id", player.id);

    if (registrationCheckError || resultCheckError) {
      setMessage(
        registrationCheckError?.message ||
          resultCheckError?.message ||
          "Could not verify this player before deletion."
      );
      setDeletingPlayerId(null);
      return;
    }

    if ((registrationCount ?? 0) > 0 || (resultCount ?? 0) > 0) {
      setMessage(
        `${player.full_name} now has linked tournament activity, so the record was not deleted.`
      );
      setDeletingPlayerId(null);
      await loadPlayers();
      return;
    }

    await supabase.from("player_rating_history").delete().eq("player_id", player.id);
    await supabase
      .from("player_duplicate_ignores")
      .delete()
      .or(`player_a.eq.${player.id},player_b.eq.${player.id}`);
    await supabase
      .from("player_merge_history")
      .delete()
      .or(`primary_player_id.eq.${player.id},duplicate_player_id.eq.${player.id}`);

    const { error } = await supabase.from("players").delete().eq("id", player.id);

    if (error) {
      setMessage(`Could not delete ${player.full_name}: ${error.message}`);
    } else {
      setPlayers((current) => current.filter((item) => item.id !== player.id));
      setMessage(`${player.full_name} was deleted from the Player Centre.`);
    }

    setDeletingPlayerId(null);
  }

  const playerRows = useMemo<PlayerWithStats[]>(() => {
    const registrationMap = new Map<string, Registration[]>();
    const resultMap = new Map<string, TournamentResult[]>();
    const resultNameMap = new Map<string, TournamentResult[]>();

    registrations.forEach((registration) => {
      if (!registration.player_id) return;
      const current = registrationMap.get(registration.player_id) ?? [];
      current.push(registration);
      registrationMap.set(registration.player_id, current);
    });

    results.forEach((result) => {
      if (result.player_id) {
        const current = resultMap.get(result.player_id) ?? [];
        current.push(result);
        resultMap.set(result.player_id, current);
        return;
      }

      const nameKey = activityNameKey(result.imported_name);
      if (!nameKey) return;
      const current = resultNameMap.get(nameKey) ?? [];
      current.push(result);
      resultNameMap.set(nameKey, current);
    });

    return players.map((player) => {
      const playerRegistrations = registrationMap.get(player.id) ?? [];
      const playerResults = [
        ...(resultMap.get(player.id) ?? []),
        ...(resultNameMap.get(activityNameKey(player.full_name)) ?? []),
      ];
      const enteredTournaments = new Set(
        playerRegistrations
          .map((item) => item.tournament_id)
          .filter((value): value is string => Boolean(value))
      );
      const finalRankingTournaments = new Set(
        playerResults
          .map((item) => item.tournament_id)
          .filter((value): value is string => Boolean(value))
      );

      const latestRegistration =
        [...playerRegistrations, ...playerResults]
          .map((item) => item.created_at)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;

      const registeredTournaments = uniqueActivityItems(
        playerRegistrations
          .filter((item) => item.tournament_id)
          .map((item) => {
            const tournament = singleRelation(item.tournaments);
            const section = singleRelation(item.tournament_sections);

            return {
              tournament_id: item.tournament_id as string,
              tournament_name: tournament?.tournament_name ?? "Unknown tournament",
              section_name: section?.section_name ?? null,
              start_date: tournament?.start_date ?? null,
              status: item.registration_status,
              detail: item.payment_status,
            };
          })
      );

      const finalRankingItems = uniqueActivityItems(
        playerResults
          .filter((item) => item.tournament_id)
          .map((item) => {
            const tournament = singleRelation(item.tournaments);
            const section = singleRelation(item.tournament_sections);
            const position = item.final_position ? `Pos ${item.final_position}` : null;
            const matchNote = item.player_id ? null : "name match";

            return {
              tournament_id: item.tournament_id as string,
              tournament_name: tournament?.tournament_name ?? "Unknown tournament",
              section_name: section?.section_name ?? null,
              start_date: tournament?.start_date ?? null,
              status: tournament?.registration_status ?? null,
              detail: [
                position,
                item.points !== null ? `${item.points} pts` : null,
                matchNote,
              ]
                .filter(Boolean)
                .join(", "),
            };
          })
      );

      return {
        ...player,
        tournaments_entered: enteredTournaments.size,
        final_ranking_events: finalRankingTournaments.size,
        approved_entries: playerRegistrations.filter(
          (item) => item.registration_status === "Approved"
        ).length,
        paid_entries: playerRegistrations.filter(
          (item) => item.payment_status === "Paid"
        ).length,
        latest_registration: latestRegistration,
        registered_tournaments: registeredTournaments,
        final_ranking_tournaments: finalRankingItems,
        profile_health: profileHealth(player),
      };
    });
  }, [players, registrations, results]);

  const stats = useMemo(() => {
    const ratedPlayers = playerRows.filter((player) => player.rating !== null).length;
    const activePlayers = playerRows.filter(
      (player) =>
        player.tournaments_entered > 0 || player.final_ranking_events > 0
    ).length;
    const juniors = playerRows.filter((player) => {
      const age = calculateAge(player.date_of_birth);
      return age !== null && age < 20;
    }).length;
    const needsReview = playerRows.filter(
      (player) => player.profile_health !== "Ready"
    ).length;
    const verified = playerRows.filter(
      (player) => player.verification_status === "Verified"
    ).length;

    return {
      total: playerRows.length,
      verified,
      ratedPlayers,
      activePlayers,
      juniors,
      needsReview,
    };
  }, [playerRows]);

  const filteredPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return playerRows.filter((player) => {
      const searchMatch =
        !text ||
        player.full_name.toLowerCase().includes(text) ||
        (player.pcc_id ?? "").toLowerCase().includes(text) ||
        (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (player.fide_id ?? "").toLowerCase().includes(text) ||
        (player.club ?? "").toLowerCase().includes(text) ||
        (player.province ?? "").toLowerCase().includes(text) ||
        (player.email ?? "").toLowerCase().includes(text) ||
        (player.phone ?? "").toLowerCase().includes(text);
      const activityMatch =
        !text ||
        [...player.registered_tournaments, ...player.final_ranking_tournaments].some(
          (activity) =>
            activity.tournament_name.toLowerCase().includes(text) ||
            (activity.section_name ?? "").toLowerCase().includes(text)
        );

      const genderMatch =
        genderFilter === "All" || (player.gender ?? "") === genderFilter;

      const ratingMatch =
        ratingFilter === "All" ||
        (ratingFilter === "Rated" && player.rating !== null) ||
        (ratingFilter === "Unrated" && player.rating === null) ||
        (ratingFilter === "Active" &&
          (player.tournaments_entered > 0 || player.final_ranking_events > 0));

      const hasRegistrations = player.registered_tournaments.length > 0;
      const hasFinalRankings = player.final_ranking_tournaments.length > 0;
      const activityFilterMatch =
        activityFilter === "All" ||
        (activityFilter === "Has registrations" && hasRegistrations) ||
        (activityFilter === "Has final rankings" && hasFinalRankings) ||
        (activityFilter === "Registered only" &&
          hasRegistrations &&
          !hasFinalRankings) ||
        (activityFilter === "Final ranking only" &&
          hasFinalRankings &&
          !hasRegistrations) ||
        (activityFilter === "Different activity" &&
          (hasRegistrations || hasFinalRankings) &&
          hasDifferentActivity(player)) ||
        (activityFilter === "No activity" &&
          !hasRegistrations &&
          !hasFinalRankings);

      const healthMatch =
        healthFilter === "All" || player.profile_health === healthFilter;
      const verificationMatch =
        verificationView === "All" ||
        (verificationView === "Verified" &&
          player.verification_status === "Verified") ||
        (verificationView === "Unverified" &&
          player.verification_status !== "Verified");

      return (
        (searchMatch || activityMatch) &&
        genderMatch &&
        ratingMatch &&
        activityFilterMatch &&
        healthMatch &&
        verificationMatch
      );
    });
  }, [
    activityFilter,
    genderFilter,
    healthFilter,
    playerRows,
    ratingFilter,
    search,
    verificationView,
  ]);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            Back to Command Centre
          </Link>

          <section className="mt-6 border-b border-white/10 pb-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_520px] lg:items-end">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
                  Player Centre
                </p>
                <h1 className="mt-3 text-3xl font-black md:text-6xl">
                  Player operations
                </h1>
                <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
                  Manage player identity, verification, ratings, contact
                  details and event activity from one searchable workspace.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                <CommandStat label="Players" value={stats.total} />
                <CommandStat label="Verified" value={stats.verified} />
                <CommandStat label="Active" value={stats.activePlayers} />
                <CommandStat label="Rated" value={stats.ratedPlayers} />
                <CommandStat label="Requires review" value={stats.needsReview} tone="warn" />
              </div>
            </div>
          </section>

          <section className="mt-6 grid gap-3 md:grid-cols-4">
            <ActionLink
              href="/admin/import-ratings"
              title="Rating Files"
              description="Upload Classical, Rapid and Blitz rating lists."
              primary
            />
            <ActionLink
              href="/admin/players/sync"
              title="Chess SA Sync"
              description="Import IDs, missing details and safe identity matches."
            />
            <ActionLink
              href="/admin/players/duplicates"
              title="Duplicate Centre"
              description="Find and merge likely duplicate players."
            />
            <ActionLink
              href="/admin/members"
              title="Membership Register"
              description="Manage paying members linked to Player Centre profiles."
            />
          </section>

          <section className="mt-6 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
            <p className="text-sm font-black text-yellow-100">
              Player Centre rule
            </p>
            <p className="mt-2 text-sm leading-6 text-yellow-50/80">
              Verify only records that match safely by Chess SA ID or confirmed
              identity. Rows from national files that are not already in the
              Player Centre should not create review noise.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-4">
            <div className="mb-4 grid gap-2 sm:grid-cols-3">
              {["Unverified", "Verified", "All"].map((view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => setVerificationView(view)}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    verificationView === view
                      ? "bg-red-600 text-white"
                      : "border border-white/10 bg-zinc-950 text-zinc-300 hover:border-red-500"
                  }`}
                >
                  {view}
                </button>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_150px_160px_210px_160px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, ID, tournament, section, club, province, email or phone..."
                className={inputClass}
              />

              <select
                value={genderFilter}
                onChange={(event) => setGenderFilter(event.target.value)}
                className={inputClass}
              >
                <option value="All">All genders</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="M">M</option>
                <option value="F">F</option>
              </select>

              <select
                value={ratingFilter}
                onChange={(event) => setRatingFilter(event.target.value)}
                className={inputClass}
              >
                <option value="All">All players</option>
                <option value="Rated">Rated</option>
                <option value="Unrated">Unrated</option>
                <option value="Active">Active in events</option>
              </select>

              <select
                value={activityFilter}
                onChange={(event) =>
                  setActivityFilter(event.target.value as ActivityFilter)
                }
                className={inputClass}
              >
                <option value="All">All activity</option>
                <option value="Has registrations">Has registrations</option>
                <option value="Has final rankings">Has final rankings</option>
                <option value="Registered only">Registered only</option>
                <option value="Final ranking only">Final ranking only</option>
                <option value="Different activity">Different activity</option>
                <option value="No activity">No activity</option>
              </select>

              <select
                value={healthFilter}
                onChange={(event) => setHealthFilter(event.target.value)}
                className={inputClass}
              >
                <option value="All">All statuses</option>
                <option value="Ready">Ready</option>
                <option value="Review">Needs review</option>
                <option value="Missing IDs">Missing IDs</option>
              </select>
            </div>

            <p className="mt-3 text-xs text-zinc-500">
              Showing {filteredPlayers.length} of {playerRows.length} player
              records.
              {currentRole === "super_admin"
                ? " Super admin delete is available only for records with no tournament footprint."
                : ""}
            </p>
          </section>

          {loading ? (
            <p className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
              Loading players...
            </p>
          ) : filteredPlayers.length === 0 ? (
            <p className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
              No players found.
            </p>
          ) : (
            <>
            <section className="mt-8 space-y-3 lg:hidden">
              {filteredPlayers.slice(0, 500).map((player) => {
                const age = calculateAge(player.date_of_birth);

                return (
                  <article
                    key={player.id}
                    className="rounded-xl border border-white/10 bg-zinc-900 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <PlayerAvatar
                          name={player.full_name}
                          photoUrl={player.profile_photo_url}
                          size="sm"
                        />
                        <div className="min-w-0">
                        <p className="text-lg font-black text-white">
                          {player.full_name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {player.gender ?? "Gender not recorded"}
                          {age !== null ? ` | ${age} yrs` : ""}
                        </p>
                        </div>
                      </div>
                      <HealthBadge health={player.profile_health} />
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-zinc-400">
                      <p>PCC ID: {valueOrDash(player.pcc_id)}</p>
                      <p>Chess SA: {valueOrDash(player.chess_sa_id)}</p>
                      <p>Rating: {valueOrDash(player.rating)}</p>
                      <p>
                        Club: {valueOrDash(player.club)} | Province:{" "}
                        {valueOrDash(player.province)}
                      </p>
                      <p>
                        Events: {player.tournaments_entered} | Paid entries:{" "}
                        {player.paid_entries}
                      </p>
                      <ActivityFootprint player={player} compact />
                      <p className="break-all">{valueOrDash(player.email)}</p>
                    </div>

                    <Link
                      href={`/admin/players/${player.id}`}
                      className="mt-4 block rounded-lg border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                    >
                      Open Player
                    </Link>

                    {currentRole === "super_admin" &&
                      player.registered_tournaments.length === 0 &&
                      player.final_ranking_tournaments.length === 0 && (
                        <button
                          type="button"
                          onClick={() => void deleteInactivePlayer(player)}
                          disabled={deletingPlayerId === player.id}
                          className="mt-2 block w-full rounded-lg border border-red-500/40 px-4 py-3 text-center text-sm font-bold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {deletingPlayerId === player.id ? "Deleting..." : "Delete inactive record"}
                        </button>
                      )}
                  </article>
                );
              })}
            </section>

            <section className="mt-8 hidden overflow-hidden rounded-xl border border-white/10 bg-zinc-900 lg:block">
              <table className="w-full min-w-[1100px] text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="p-4">Player</th>
                    <th className="p-4">Identity</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Club / Province</th>
                    <th className="p-4">Activity</th>
                    <th className="p-4">Contact</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPlayers.slice(0, 500).map((player) => {
                    const age = calculateAge(player.date_of_birth);

                    return (
                      <tr key={player.id} className="border-t border-white/10">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <PlayerAvatar
                              name={player.full_name}
                              photoUrl={player.profile_photo_url}
                              size="sm"
                            />
                            <div>
                              <p className="font-black text-white">{player.full_name}</p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {player.gender ?? "Gender not set"}
                                {age !== null ? ` - ${age} yrs` : ""}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-xs text-zinc-400">
                          PCC: {valueOrDash(player.pcc_id)}
                          <br />
                          Chess SA: {valueOrDash(player.chess_sa_id)}
                          <br />
                          FIDE: {valueOrDash(player.fide_id)}
                        </td>
                        <td className="p-4 font-black text-white">
                          {valueOrDash(player.rating)}
                        </td>
                        <td className="p-4 text-zinc-300">
                          {valueOrDash(player.club)}
                          <span className="block text-xs text-zinc-500">
                            {valueOrDash(player.province)}
                          </span>
                        </td>
                        <td className="p-4 text-zinc-300">
                          {player.tournaments_entered} registrations
                          <span className="block text-xs text-zinc-500">
                            {player.paid_entries} paid, latest{" "}
                            {formatDate(player.latest_registration)}
                          </span>
                          <ActivityFootprint player={player} />
                        </td>
                        <td className="p-4 text-xs text-zinc-400">
                          {valueOrDash(player.email)}
                          <br />
                          {valueOrDash(player.phone)}
                        </td>
                        <td className="p-4">
                          <HealthBadge health={player.profile_health} />
                          <p className="mt-2 text-xs text-zinc-500">
                            {player.verification_status ?? "Not set"}
                          </p>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/admin/players/${player.id}`}
                              className="rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-bold text-white transition hover:border-red-500"
                            >
                              Open
                            </Link>
                            {currentRole === "super_admin" &&
                              player.registered_tournaments.length === 0 &&
                              player.final_ranking_tournaments.length === 0 && (
                                <button
                                  type="button"
                                  onClick={() => void deleteInactivePlayer(player)}
                                  disabled={deletingPlayerId === player.id}
                                  className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                  {deletingPlayerId === player.id ? "Deleting..." : "Delete"}
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
            </>
          )}

          {!loading && filteredPlayers.length > 500 && (
            <p className="mt-6 rounded-lg border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-400">
              Showing first 500 matching players. Use search or filters to narrow
              the list.
            </p>
          )}
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
      <p
        className={`text-2xl font-black ${
          tone === "warn" ? "text-yellow-300" : "text-white"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

function ActionLink({
  href,
  title,
  description,
  primary = false,
}: {
  href: string;
  title: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl border p-4 transition ${
        primary
          ? "border-red-500/60 bg-red-600 text-white hover:bg-red-700"
          : "border-white/10 bg-zinc-900 text-white hover:border-red-500"
      }`}
    >
      <p className="font-black">{title}</p>
      <p
        className={`mt-2 text-xs leading-5 ${
          primary ? "text-red-50/80" : "text-zinc-400"
        }`}
      >
        {description}
      </p>
    </Link>
  );
}

function ActivityFootprint({
  player,
  compact = false,
}: {
  player: PlayerWithStats;
  compact?: boolean;
}) {
  const hasActivity =
    player.registered_tournaments.length > 0 ||
    player.final_ranking_tournaments.length > 0;

  if (!hasActivity) {
    return (
      <p className={compact ? "text-xs text-red-300" : "mt-2 text-xs text-red-300"}>
        No linked registrations or final rankings.
      </p>
    );
  }

  return (
    <div className={compact ? "space-y-1 text-xs" : "mt-2 space-y-1 text-xs"}>
      <ActivityLine
        label="Registered"
        items={player.registered_tournaments}
        empty="No registrations"
      />
      <ActivityLine
        label="Final ranking"
        items={player.final_ranking_tournaments}
        empty="No final ranking"
      />
    </div>
  );
}

function ActivityLine({
  label,
  items,
  empty,
}: {
  label: string;
  items: ActivityItem[];
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-zinc-600">
        <span className="font-bold text-zinc-500">{label}:</span> {empty}
      </p>
    );
  }

  const visible = items.slice(0, 3);
  const remaining = items.length - visible.length;

  return (
    <p className="leading-5 text-zinc-400">
      <span className="font-bold text-zinc-200">{label}:</span>{" "}
      {visible.map((item, index) => (
        <span key={`${label}-${item.tournament_id}-${item.section_name ?? index}`}>
          {index > 0 ? "; " : ""}
          <span className="text-zinc-300">{item.tournament_name}</span>
          {item.section_name ? ` (${item.section_name})` : ""}
          {item.detail ? ` - ${item.detail}` : ""}
        </span>
      ))}
      {remaining > 0 ? ` +${remaining} more` : ""}
    </p>
  );
}

function HealthBadge({ health }: { health: PlayerWithStats["profile_health"] }) {
  const className =
    health === "Ready"
      ? "bg-green-500/15 text-green-300"
      : health === "Review"
      ? "bg-yellow-500/15 text-yellow-300"
      : "bg-red-500/15 text-red-300";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>
      {health}
    </span>
  );
}
