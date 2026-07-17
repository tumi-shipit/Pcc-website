"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import PlayerAvatar from "@/components/PlayerAvatar";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
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
};

type PlayerWithStats = Player & {
  tournaments_entered: number;
  approved_entries: number;
  paid_entries: number;
  latest_registration: string | null;
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
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [healthFilter, setHealthFilter] = useState("All");
  const [verificationView, setVerificationView] = useState("Unverified");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPlayers() {
    setLoading(true);
    setMessage("");

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, fide_id, chess_sa_id, date_of_birth, gender, club, province, rating, email, phone, verification_status, profile_photo_url, created_at, updated_at"
      )
      .order("full_name", { ascending: true })
      .limit(5000);

    const { data: registrationData, error: registrationError } = await supabase
      .from("registrations")
      .select(
        "player_id, tournament_id, section_id, payment_status, proof_of_payment_url, registration_status, created_at, updated_at"
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

    setLoading(false);
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  const playerRows = useMemo<PlayerWithStats[]>(() => {
    const registrationMap = new Map<string, Registration[]>();

    registrations.forEach((registration) => {
      if (!registration.player_id) return;
      const current = registrationMap.get(registration.player_id) ?? [];
      current.push(registration);
      registrationMap.set(registration.player_id, current);
    });

    return players.map((player) => {
      const playerRegistrations = registrationMap.get(player.id) ?? [];
      const enteredTournaments = new Set(
        playerRegistrations
          .map((item) => item.tournament_id)
          .filter((value): value is string => Boolean(value))
      );

      const latestRegistration =
        playerRegistrations
          .map((item) => item.created_at)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;

      return {
        ...player,
        tournaments_entered: enteredTournaments.size,
        approved_entries: playerRegistrations.filter(
          (item) => item.registration_status === "Approved"
        ).length,
        paid_entries: playerRegistrations.filter(
          (item) => item.payment_status === "Paid"
        ).length,
        latest_registration: latestRegistration,
        profile_health: profileHealth(player),
      };
    });
  }, [players, registrations]);

  const stats = useMemo(() => {
    const ratedPlayers = playerRows.filter((player) => player.rating !== null).length;
    const activePlayers = playerRows.filter(
      (player) => player.tournaments_entered > 0
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
        (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (player.fide_id ?? "").toLowerCase().includes(text) ||
        (player.club ?? "").toLowerCase().includes(text) ||
        (player.province ?? "").toLowerCase().includes(text) ||
        (player.email ?? "").toLowerCase().includes(text) ||
        (player.phone ?? "").toLowerCase().includes(text);

      const genderMatch =
        genderFilter === "All" || (player.gender ?? "") === genderFilter;

      const ratingMatch =
        ratingFilter === "All" ||
        (ratingFilter === "Rated" && player.rating !== null) ||
        (ratingFilter === "Unrated" && player.rating === null) ||
        (ratingFilter === "Active" && player.tournaments_entered > 0);

      const healthMatch =
        healthFilter === "All" || player.profile_health === healthFilter;
      const verificationMatch =
        verificationView === "All" ||
        (verificationView === "Verified" &&
          player.verification_status === "Verified") ||
        (verificationView === "Unverified" &&
          player.verification_status !== "Verified");

      return searchMatch && genderMatch && ratingMatch && healthMatch && verificationMatch;
    });
  }, [genderFilter, healthFilter, playerRows, ratingFilter, search, verificationView]);

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

          <section className="mt-6 grid gap-3 md:grid-cols-3">
            <ActionLink
              href="/admin/players/sync"
              title="Chess SA Sync"
              description="Import ratings, IDs, missing details and safe identity matches."
              primary
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

            <div className="grid gap-3 lg:grid-cols-[1fr_150px_160px_160px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, ID, club, province, email or phone..."
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
                      <p className="break-all">{valueOrDash(player.email)}</p>
                    </div>

                    <Link
                      href={`/admin/players/${player.id}`}
                      className="mt-4 block rounded-lg border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                    >
                      Open Player
                    </Link>
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
                          {player.tournaments_entered} events
                          <span className="block text-xs text-zinc-500">
                            {player.paid_entries} paid, latest{" "}
                            {formatDate(player.latest_registration)}
                          </span>
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
                          <Link
                            href={`/admin/players/${player.id}`}
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
