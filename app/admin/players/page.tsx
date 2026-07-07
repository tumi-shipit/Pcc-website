"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
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
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

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
  if (!value) return "No activity yet";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState("");
  const [genderFilter, setGenderFilter] = useState("All");
  const [ratingFilter, setRatingFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPlayers() {
    setLoading(true);
    setMessage("");

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, fide_id, chess_sa_id, date_of_birth, gender, club, province, rating, email, phone, verification_status, created_at, updated_at"
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
      setPlayers((playerData ?? []) as Player[]);
    }

    if (registrationError) {
      setMessage((current) =>
        current || `Could not load player activity: ${registrationError.message}`
      );
    } else {
      setRegistrations((registrationData ?? []) as Registration[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  const playerRows = useMemo(() => {
    const registrationMap = new Map<string, Registration[]>();

    registrations.forEach((registration) => {
      if (!registration.player_id) return;

      const current = registrationMap.get(registration.player_id) ?? [];
      current.push(registration);
      registrationMap.set(registration.player_id, current);
    });

    return players.map((player) => {
      const playerRegistrations = registrationMap.get(player.id) ?? [];

      const latestRegistration =
        playerRegistrations
          .map((item) => item.created_at)
          .filter(Boolean)
          .sort()
          .at(-1) ?? null;

      return {
        ...player,
        tournaments_entered: playerRegistrations.length,
        approved_entries: playerRegistrations.filter(
          (item) => item.registration_status === "Approved"
        ).length,
        paid_entries: playerRegistrations.filter(
          (item) => item.payment_status === "Paid"
        ).length,
        latest_registration: latestRegistration,
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

    return {
      total: playerRows.length,
      ratedPlayers,
      activePlayers,
      juniors,
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

      return searchMatch && genderMatch && ratingMatch;
    });
  }, [genderFilter, playerRows, ratingFilter, search]);

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

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Player Centre
            </p>

            <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl font-black md:text-6xl">
                  Player Management
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                  Search and manage the player database, ratings, clubs,
                  provinces, contact details and event activity from one place.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CommandStat label="Players" value={stats.total} />
                <CommandStat label="Rated" value={stats.ratedPlayers} />
                <CommandStat label="Active" value={stats.activePlayers} />
                <CommandStat label="Juniors" value={stats.juniors} />
              </div>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
            <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, Chess SA ID, FIDE ID, club, province, email or phone..."
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
            </div>
          </section>

          {loading ? (
            <p className="mt-8 text-gray-400">Loading players...</p>
          ) : filteredPlayers.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
              No players found.
            </p>
          ) : (
            <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {filteredPlayers.slice(0, 300).map((player) => {
                const age = calculateAge(player.date_of_birth);

                return (
                  <article
                    key={player.id}
                    className="rounded-3xl border border-white/10 bg-zinc-900 p-5 transition hover:-translate-y-1 hover:border-red-500/60"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                          Chess SA ID: {player.chess_sa_id ?? "Not set"}
                        </p>

                        <h2 className="mt-2 text-xl font-black leading-7 text-white">
                          {player.full_name}
                        </h2>

                        <p className="mt-1 text-sm text-gray-500">
                          FIDE ID: {player.fide_id ?? "Not set"}
                        </p>
                      </div>

                      <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-gray-300">
                        {player.rating ?? "Unrated"}
                      </span>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                      <MiniStat label="Rating" value={player.rating ?? "-"} />
                      <MiniStat label="Events" value={player.tournaments_entered} />
                      <MiniStat
                        label="Paid"
                        value={player.paid_entries}
                        valueClass="text-blue-300"
                      />
                    </div>

                    <div className="mt-5 grid gap-2 text-sm text-gray-400">
                      <p>
                        <span className="font-semibold text-white">Age:</span>{" "}
                        {age ?? "Unknown"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">Gender:</span>{" "}
                        {player.gender ?? "Not set"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">Club:</span>{" "}
                        {player.club ?? "Not linked yet"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">
                          Province:
                        </span>{" "}
                        {player.province ?? "Not linked yet"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">
                          Verification:
                        </span>{" "}
                        {player.verification_status ?? "Not set"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">
                          Latest activity:
                        </span>{" "}
                        {formatDate(player.latest_registration)}
                      </p>
                    </div>

                    <Link
                      href={`/admin/players/${player.id}`}
                      className="mt-5 block w-full rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                    >
                      View player profile →
                    </Link>
                  </article>
                );
              })}
            </section>
          )}

          {!loading && filteredPlayers.length > 300 && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-400">
              Showing first 300 matching players. Use search to narrow results.
            </p>
          )}
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
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}
