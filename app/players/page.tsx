"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  gender: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  verification_status: string | null;
  profile_photo_url: string | null;
  title: string | null;
};

type ResultRow = {
  player_id: string | null;
  final_position: number | null;
};

type OfficialRow = {
  player_id: string | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function PublicPlayersDirectoryPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [officials, setOfficials] = useState<OfficialRow[]>([]);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [clubFilter, setClubFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("rating");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlayers() {
      setLoading(true);
      setMessage("");

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select(
          "id, full_name, chess_sa_id, fide_id, gender, club, province, rating, verification_status, profile_photo_url, title"
        )
        .order("full_name", { ascending: true })
        .limit(10000);

      const { data: resultData } = await supabase
        .from("tournament_results")
        .select("player_id, final_position")
        .not("player_id", "is", null)
        .limit(50000);

      const { data: officialData } = await supabase
        .from("tournament_officials")
        .select("player_id")
        .not("player_id", "is", null)
        .limit(50000);

      if (playerError) {
        setMessage(`Could not load players: ${playerError.message}`);
      } else {
        setPlayers((playerData ?? []) as unknown as Player[]);
        setResults((resultData ?? []) as unknown as ResultRow[]);
        setOfficials((officialData ?? []) as unknown as OfficialRow[]);
      }

      setLoading(false);
    }

    loadPlayers();
  }, []);

  const playerStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        events: number;
        wins: number;
        podiums: number;
        officialRoles: number;
      }
    >();

    results.forEach((result) => {
      if (!result.player_id) return;

      const current = stats.get(result.player_id) ?? {
        events: 0,
        wins: 0,
        podiums: 0,
        officialRoles: 0,
      };

      current.events += 1;

      if (result.final_position === 1) current.wins += 1;
      if ([1, 2, 3].includes(result.final_position ?? 0)) current.podiums += 1;

      stats.set(result.player_id, current);
    });

    officials.forEach((official) => {
      if (!official.player_id) return;

      const current = stats.get(official.player_id) ?? {
        events: 0,
        wins: 0,
        podiums: 0,
        officialRoles: 0,
      };

      current.officialRoles += 1;
      stats.set(official.player_id, current);
    });

    return stats;
  }, [results, officials]);

  const provinces = useMemo(() => {
    const values = players
      .map((player) => player.province)
      .filter((value): value is string => Boolean(value))
      .sort();

    return ["All", ...Array.from(new Set(values))];
  }, [players]);

  const clubs = useMemo(() => {
    const values = players
      .map((player) => player.club)
      .filter((value): value is string => Boolean(value))
      .sort();

    return ["All", ...Array.from(new Set(values))];
  }, [players]);

  const filteredPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return players
      .filter((player) => {
        const matchesSearch =
          !text ||
          player.full_name.toLowerCase().includes(text) ||
          (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
          (player.fide_id ?? "").toLowerCase().includes(text) ||
          (player.club ?? "").toLowerCase().includes(text) ||
          (player.province ?? "").toLowerCase().includes(text) ||
          (player.title ?? "").toLowerCase().includes(text);

        const matchesProvince =
          provinceFilter === "All" || player.province === provinceFilter;

        const matchesClub = clubFilter === "All" || player.club === clubFilter;

        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Verified" &&
            player.verification_status === "Verified") ||
          (statusFilter === "Has Rating" && Boolean(player.rating)) ||
          (statusFilter === "Has FIDE ID" && Boolean(player.fide_id)) ||
          (statusFilter === "Officials" &&
            (playerStats.get(player.id)?.officialRoles ?? 0) > 0);

        return matchesSearch && matchesProvince && matchesClub && matchesStatus;
      })
      .sort((a, b) => {
        const aStats = playerStats.get(a.id);
        const bStats = playerStats.get(b.id);

        if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
        if (sortBy === "wins") return (bStats?.wins ?? 0) - (aStats?.wins ?? 0);
        if (sortBy === "podiums") {
          return (bStats?.podiums ?? 0) - (aStats?.podiums ?? 0);
        }
        if (sortBy === "events") {
          return (bStats?.events ?? 0) - (aStats?.events ?? 0);
        }
        if (sortBy === "officials") {
          return (bStats?.officialRoles ?? 0) - (aStats?.officialRoles ?? 0);
        }

        return a.full_name.localeCompare(b.full_name);
      });
  }, [
    players,
    search,
    provinceFilter,
    clubFilter,
    statusFilter,
    sortBy,
    playerStats,
  ]);

  const platformStats = useMemo(() => {
    return {
      players: players.length,
      verified: players.filter((player) => player.verification_status === "Verified")
        .length,
      rated: players.filter((player) => Boolean(player.rating)).length,
      fide: players.filter((player) => Boolean(player.fide_id)).length,
    };
  }, [players]);

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%)]">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16">
          <Link
            href="/"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back Home
          </Link>

          <div className="mt-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
                Player Centre
              </p>

              <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                PCC Player Directory
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                Search player profiles, ratings, clubs, Chess SA IDs, FIDE IDs,
                tournament history and official roles connected to the PCC
                tournament archive.
              </p>
            </div>

            <Link
              href="/players/rankings"
              className="rounded-xl bg-red-600 px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
            >
              View Rankings
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Players" value={platformStats.players} />
          <StatCard label="Verified" value={platformStats.verified} tone="green" />
          <StatCard label="Rated" value={platformStats.rated} tone="yellow" />
          <StatCard label="FIDE Linked" value={platformStats.fide} tone="red" />
        </div>

        {message && (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {message}
          </p>
        )}

        <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_220px_220px_220px_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, Chess SA ID, FIDE ID, club..."
              className={inputClass}
            />

            <select
              value={provinceFilter}
              onChange={(event) => setProvinceFilter(event.target.value)}
              className={inputClass}
            >
              {provinces.map((province) => (
                <option key={province} value={province}>
                  {province === "All" ? "All provinces" : province}
                </option>
              ))}
            </select>

            <select
              value={clubFilter}
              onChange={(event) => setClubFilter(event.target.value)}
              className={inputClass}
            >
              {clubs.map((club) => (
                <option key={club} value={club}>
                  {club === "All" ? "All clubs" : club}
                </option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className={inputClass}
            >
              <option value="All">All players</option>
              <option value="Verified">Verified</option>
              <option value="Has Rating">Has rating</option>
              <option value="Has FIDE ID">Has FIDE ID</option>
              <option value="Officials">Officials</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className={inputClass}
            >
              <option value="rating">Sort by rating</option>
              <option value="name">Sort by name</option>
              <option value="wins">Sort by wins</option>
              <option value="podiums">Sort by podiums</option>
              <option value="events">Sort by events</option>
              <option value="officials">Sort by official roles</option>
            </select>
          </div>
        </section>

        {loading ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
            Loading players...
          </p>
        ) : filteredPlayers.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
            No players found.
          </p>
        ) : (
          <section className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {filteredPlayers.map((player) => {
              const stats = playerStats.get(player.id) ?? {
                events: 0,
                wins: 0,
                podiums: 0,
                officialRoles: 0,
              };

              return (
                <Link
                  key={player.id}
                  href={`/players/${player.id}`}
                  className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 p-5 transition hover:-translate-y-1 hover:border-red-500/60"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-500/30 bg-red-600/10 text-xl font-black text-red-200">
                      {player.profile_photo_url ? (
                        <Image
                          src={player.profile_photo_url}
                          alt={player.full_name}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      ) : (
                        initials(player.full_name)
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        {player.verification_status === "Verified" && (
                          <span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-300">
                            Verified
                          </span>
                        )}

                        {player.title && (
                          <span className="rounded-full bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-200">
                            {player.title}
                          </span>
                        )}
                      </div>

                      <h2 className="mt-2 truncate text-xl font-black text-white transition group-hover:text-red-300">
                        {player.full_name}
                      </h2>

                      <p className="mt-1 truncate text-sm text-gray-400">
                        {valueOrDash(player.club)} • {valueOrDash(player.province)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-3 gap-3">
                    <MiniStat label="Rating" value={valueOrDash(player.rating)} />
                    <MiniStat label="Wins" value={stats.wins} />
                    <MiniStat label="Podiums" value={stats.podiums} />
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-gray-500">
                    <p>Chess SA: {valueOrDash(player.chess_sa_id)}</p>
                    <p>FIDE: {valueOrDash(player.fide_id)}</p>
                    <p>Events: {stats.events}</p>
                    <p>Official roles: {stats.officialRoles}</p>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </section>
    </main>
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
      <p className="text-[10px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
