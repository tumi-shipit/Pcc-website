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
  club: string | null;
  province: string | null;
  rating: number | null;
  profile_photo_url: string | null;
  title: string | null;
  verification_status: string | null;
};

type ResultRow = {
  player_id: string | null;
  final_position: number | null;
  points: number | null;
};

type RatingHistory = {
  player_id: string | null;
  rating_type: string | null;
  rating: number | null;
  rating_date: string | null;
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

export default function PublicPlayerRankingsPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [ratings, setRatings] = useState<RatingHistory[]>([]);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [rankingType, setRankingType] = useState("rating");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadRankings() {
      setLoading(true);
      setMessage("");

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select(
          "id, full_name, chess_sa_id, fide_id, club, province, rating, profile_photo_url, title, verification_status"
        )
        .order("rating", { ascending: false, nullsFirst: false })
        .limit(10000);

      const { data: resultData } = await supabase
        .from("tournament_results")
        .select("player_id, final_position, points")
        .not("player_id", "is", null)
        .limit(50000);

      const { data: ratingData } = await supabase
        .from("player_rating_history")
        .select("player_id, rating_type, rating, rating_date")
        .not("player_id", "is", null)
        .order("rating_date", { ascending: false, nullsFirst: false })
        .limit(50000);

      if (playerError) {
        setMessage(`Could not load rankings: ${playerError.message}`);
      } else {
        setPlayers((playerData ?? []) as unknown as Player[]);
        setResults((resultData ?? []) as unknown as ResultRow[]);
        setRatings((ratingData ?? []) as unknown as RatingHistory[]);
      }

      setLoading(false);
    }

    loadRankings();
  }, []);

  const playerStats = useMemo(() => {
    const map = new Map<
      string,
      {
        events: number;
        wins: number;
        podiums: number;
        totalPoints: number;
        latestRating: number | null;
        peakRating: number | null;
      }
    >();

    players.forEach((player) => {
      map.set(player.id, {
        events: 0,
        wins: 0,
        podiums: 0,
        totalPoints: 0,
        latestRating: player.rating ?? null,
        peakRating: player.rating ?? null,
      });
    });

    results.forEach((result) => {
      if (!result.player_id) return;

      const current =
        map.get(result.player_id) ??
        {
          events: 0,
          wins: 0,
          podiums: 0,
          totalPoints: 0,
          latestRating: null,
          peakRating: null,
        };

      current.events += 1;
      current.totalPoints += Number(result.points ?? 0);
      if (result.final_position === 1) current.wins += 1;
      if ([1, 2, 3].includes(result.final_position ?? 0)) current.podiums += 1;

      map.set(result.player_id, current);
    });

    ratings.forEach((rating) => {
      if (!rating.player_id || !rating.rating) return;

      const current =
        map.get(rating.player_id) ??
        {
          events: 0,
          wins: 0,
          podiums: 0,
          totalPoints: 0,
          latestRating: null,
          peakRating: null,
        };

      if (current.latestRating === null) current.latestRating = rating.rating;
      current.peakRating = Math.max(current.peakRating ?? 0, rating.rating);

      map.set(rating.player_id, current);
    });

    return map;
  }, [players, results, ratings]);

  const provinces = useMemo(() => {
    const values = players
      .map((player) => player.province)
      .filter((value): value is string => Boolean(value))
      .sort();

    return ["All", ...Array.from(new Set(values))];
  }, [players]);

  const rankedPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return players
      .filter((player) => {
        const stats = playerStats.get(player.id);

        const matchesSearch =
          !text ||
          player.full_name.toLowerCase().includes(text) ||
          (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
          (player.fide_id ?? "").toLowerCase().includes(text) ||
          (player.club ?? "").toLowerCase().includes(text) ||
          (player.province ?? "").toLowerCase().includes(text);

        const matchesProvince =
          provinceFilter === "All" || player.province === provinceFilter;

        const hasRankingData =
          rankingType === "rating"
            ? Boolean(player.rating || stats?.latestRating)
            : Boolean(stats && stats.events > 0);

        return matchesSearch && matchesProvince && hasRankingData;
      })
      .sort((a, b) => {
        const aStats = playerStats.get(a.id);
        const bStats = playerStats.get(b.id);

        if (rankingType === "rating") {
          return (
            (bStats?.latestRating ?? b.rating ?? 0) -
            (aStats?.latestRating ?? a.rating ?? 0)
          );
        }

        if (rankingType === "peak") {
          return (bStats?.peakRating ?? 0) - (aStats?.peakRating ?? 0);
        }

        if (rankingType === "wins") {
          return (bStats?.wins ?? 0) - (aStats?.wins ?? 0);
        }

        if (rankingType === "podiums") {
          return (bStats?.podiums ?? 0) - (aStats?.podiums ?? 0);
        }

        if (rankingType === "points") {
          return (bStats?.totalPoints ?? 0) - (aStats?.totalPoints ?? 0);
        }

        if (rankingType === "events") {
          return (bStats?.events ?? 0) - (aStats?.events ?? 0);
        }

        return a.full_name.localeCompare(b.full_name);
      });
  }, [players, playerStats, search, provinceFilter, rankingType]);

  const topThree = rankedPlayers.slice(0, 3);

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%)]">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16">
          <Link
            href="/players"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Player Centre
          </Link>

          <div className="mt-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
              Player Rankings
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
              PCC Rankings
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Rankings are calculated from linked player profiles, rating
              records and tournament archive results.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        {message && (
          <p className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {message}
          </p>
        )}

        <section className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
          <div className="grid gap-4 lg:grid-cols-[1fr_240px_240px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search player, club, Chess SA ID, FIDE ID..."
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
              value={rankingType}
              onChange={(event) => setRankingType(event.target.value)}
              className={inputClass}
            >
              <option value="rating">Current rating</option>
              <option value="peak">Peak rating</option>
              <option value="wins">Tournament wins</option>
              <option value="podiums">Podiums</option>
              <option value="points">Total points</option>
              <option value="events">Events played</option>
            </select>
          </div>
        </section>

        {loading ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
            Loading rankings...
          </p>
        ) : rankedPlayers.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
            No ranking data found.
          </p>
        ) : (
          <>
            <section className="mt-8 grid gap-4 md:grid-cols-3">
              {topThree.map((player, index) => {
                const stats = playerStats.get(player.id);
                const rank = index + 1;

                return (
                  <Link
                    key={player.id}
                    href={`/players/${player.id}`}
                    className="rounded-3xl border border-yellow-500/20 bg-yellow-500/10 p-6 transition hover:border-yellow-400"
                  >
                    <p className="text-4xl">
                      {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
                    </p>

                    <div className="mt-5 flex items-center gap-4">
                      <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-yellow-500/30 bg-yellow-500/10 text-lg font-black text-yellow-100">
                        {player.profile_photo_url ? (
                          <Image
                            src={player.profile_photo_url}
                            alt={player.full_name}
                            fill
                            sizes="64px"
                            className="object-cover"
                          />
                        ) : (
                          initials(player.full_name)
                        )}
                      </div>

                      <div>
                        <p className="font-black text-white">{player.full_name}</p>
                        <p className="mt-1 text-xs text-yellow-50/70">
                          {valueOrDash(player.club)} • {valueOrDash(player.province)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                      <MiniStat
                        label="Rating"
                        value={valueOrDash(stats?.latestRating ?? player.rating)}
                      />
                      <MiniStat label="Wins" value={stats?.wins ?? 0} />
                      <MiniStat label="Events" value={stats?.events ?? 0} />
                    </div>
                  </Link>
                );
              })}
            </section>

            <section className="mt-8 overflow-auto rounded-3xl border border-white/10 bg-zinc-900">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Player</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Peak</th>
                    <th className="p-4">Wins</th>
                    <th className="p-4">Podiums</th>
                    <th className="p-4">Events</th>
                    <th className="p-4">Points</th>
                    <th className="p-4">IDs</th>
                  </tr>
                </thead>

                <tbody>
                  {rankedPlayers.map((player, index) => {
                    const stats = playerStats.get(player.id);

                    return (
                      <tr key={player.id} className="border-t border-white/10">
                        <td className="p-4 text-xl font-black text-white">
                          #{index + 1}
                        </td>

                        <td className="p-4">
                          <Link
                            href={`/players/${player.id}`}
                            className="flex items-center gap-3 font-bold text-white transition hover:text-red-300"
                          >
                            <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-800 text-xs font-black text-red-200">
                              {player.profile_photo_url ? (
                                <Image
                                  src={player.profile_photo_url}
                                  alt={player.full_name}
                                  fill
                                  sizes="40px"
                                  className="object-cover"
                                />
                              ) : (
                                initials(player.full_name)
                              )}
                            </div>

                            <span>
                              {player.full_name}
                              <span className="mt-1 block text-xs font-normal text-gray-500">
                                {valueOrDash(player.club)} •{" "}
                                {valueOrDash(player.province)}
                              </span>
                            </span>
                          </Link>
                        </td>

                        <td className="p-4 font-black text-white">
                          {valueOrDash(stats?.latestRating ?? player.rating)}
                        </td>

                        <td className="p-4 text-gray-300">
                          {valueOrDash(stats?.peakRating)}
                        </td>

                        <td className="p-4 text-gray-300">
                          {stats?.wins ?? 0}
                        </td>

                        <td className="p-4 text-gray-300">
                          {stats?.podiums ?? 0}
                        </td>

                        <td className="p-4 text-gray-300">
                          {stats?.events ?? 0}
                        </td>

                        <td className="p-4 text-gray-300">
                          {stats?.totalPoints ?? 0}
                        </td>

                        <td className="p-4 text-xs text-gray-500">
                          Chess SA: {valueOrDash(player.chess_sa_id)}
                          <br />
                          FIDE: {valueOrDash(player.fide_id)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </section>
          </>
        )}
      </section>
    </main>
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
    <div className="rounded-xl border border-yellow-500/20 bg-black/20 p-3">
      <p className="text-[10px] uppercase tracking-wide text-yellow-100/60">
        {label}
      </p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
