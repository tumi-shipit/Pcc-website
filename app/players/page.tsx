"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PlayerAvatar from "@/components/PlayerAvatar";
import { tokenSimilarity } from "@/lib/identityResolver";
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
  tournament_id: string | null;
  player_id: string | null;
  final_position: number | null;
};

type OfficialRow = {
  tournament_id: string | null;
  player_id: string | null;
};

type PlayerSearchIdentity = {
  player_id?: string | null;
  chess_sa_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  organiser_name?: string | null;
  organiser_email?: string | null;
};

const playerSelect =
  "id, full_name, chess_sa_id, fide_id, gender, club, province, rating, verification_status, profile_photo_url, title";

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500";

const partnerRankingsUrl =
  process.env.NEXT_PUBLIC_PARTNER_RANKINGS_URL ||
  "/players/rankings";

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function searchPattern(value: string) {
  return `%${value.replaceAll(",", " ").trim()}%`;
}

function playerSearchScore(player: Player) {
  let score = 0;
  if (player.profile_photo_url) score += 40;
  if (player.verification_status === "Verified") score += 25;
  if (player.chess_sa_id) score += 20;
  if (player.rating) score += 10;
  return score;
}

function uniquePlayers(players: Player[]) {
  const playerMap = new Map<string, Player>();

  players
    .sort((left, right) => playerSearchScore(right) - playerSearchScore(left))
    .forEach((player) => {
      if (!playerMap.has(player.id)) playerMap.set(player.id, player);
    });

  return Array.from(playerMap.values()).sort((left, right) =>
    left.full_name.localeCompare(right.full_name)
  );
}

export default function PublicPlayersDirectoryPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [directSearchPlayers, setDirectSearchPlayers] = useState<Player[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [officials, setOfficials] = useState<OfficialRow[]>([]);
  const [search, setSearch] = useState("");
  const [provinceFilter, setProvinceFilter] = useState("All");
  const [clubFilter, setClubFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortBy, setSortBy] = useState("name");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlayers() {
      setLoading(true);
      setMessage("");

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select(playerSelect)
        .order("full_name", { ascending: true })
        .limit(10000);

      const { data: resultData } = await supabase
        .from("tournament_results")
        .select("tournament_id, player_id, final_position")
        .not("player_id", "is", null)
        .limit(50000);

      const { data: officialData } = await supabase
        .from("tournament_officials")
        .select("tournament_id, player_id")
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

  useEffect(() => {
    const text = search.trim();

    if (!text) {
      const timer = window.setTimeout(() => {
        setDirectSearchPlayers([]);
      }, 0);

      return () => window.clearTimeout(timer);
    }

    const timer = window.setTimeout(async () => {
      const pattern = searchPattern(text);
      const searchPlayers: Player[] = [];
      const searchIdentities: PlayerSearchIdentity[] = [];

      const { data } = await supabase
        .from("players")
        .select(playerSelect)
        .or(
          `full_name.ilike.${pattern},chess_sa_id.ilike.${pattern},fide_id.ilike.${pattern},club.ilike.${pattern},province.ilike.${pattern},title.ilike.${pattern},email.ilike.${pattern}`
        )
        .order("full_name", { ascending: true })
        .limit(50);

      searchPlayers.push(...((data ?? []) as unknown as Player[]));

      const { data: registrationMatches } = await supabase
        .from("registration_details")
        .select("full_name, chess_sa_id, email")
        .or(`full_name.ilike.${pattern},chess_sa_id.ilike.${pattern},email.ilike.${pattern}`)
        .limit(30);

      searchIdentities.push(...((registrationMatches ?? []) as unknown as PlayerSearchIdentity[]));

      const { data: accessMatches } = await supabase
        .from("tournament_organiser_access")
        .select("player_id, chess_sa_id, organiser_name, organiser_email")
        .or(
          `organiser_name.ilike.${pattern},chess_sa_id.ilike.${pattern},organiser_email.ilike.${pattern}`
        )
        .limit(30);

      searchIdentities.push(...((accessMatches ?? []) as unknown as PlayerSearchIdentity[]));

      const playerIds = Array.from(
        new Set(searchIdentities.map((identity) => identity.player_id).filter(Boolean))
      ) as string[];
      const chessSaIds = Array.from(
        new Set(searchIdentities.map((identity) => identity.chess_sa_id).filter(Boolean))
      ) as string[];
      const names = Array.from(
        new Set(
          searchIdentities
            .map((identity) => identity.full_name ?? identity.organiser_name)
            .filter(Boolean)
            .map((name) => name!.trim())
            .filter(Boolean)
        )
      );

      if (playerIds.length > 0) {
        const { data: linkedPlayers } = await supabase
          .from("players")
          .select(playerSelect)
          .in("id", playerIds)
          .limit(50);

        searchPlayers.push(...((linkedPlayers ?? []) as unknown as Player[]));
      }

      if (chessSaIds.length > 0) {
        const { data: chessSaPlayers } = await supabase
          .from("players")
          .select(playerSelect)
          .in("chess_sa_id", chessSaIds)
          .limit(50);

        searchPlayers.push(...((chessSaPlayers ?? []) as unknown as Player[]));
      }

      const nameMatches = await Promise.all(
        names.slice(0, 8).map((name) =>
          supabase
            .from("players")
            .select(playerSelect)
            .ilike("full_name", searchPattern(name))
            .limit(10)
        )
      );

      nameMatches.forEach(({ data: matchedPlayers }) => {
        searchPlayers.push(...((matchedPlayers ?? []) as unknown as Player[]));
      });

      setDirectSearchPlayers(uniquePlayers(searchPlayers));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [search]);

  const playerStats = useMemo(() => {
    const stats = new Map<
      string,
      {
        events: Set<string>;
        wins: number;
        podiums: number;
        officialRoles: Set<string>;
      }
    >();

    const ensure = (playerId: string) => {
      const current =
        stats.get(playerId) ??
        {
          events: new Set<string>(),
          wins: 0,
          podiums: 0,
          officialRoles: new Set<string>(),
        };
      stats.set(playerId, current);
      return current;
    };

    results.forEach((result) => {
      if (!result.player_id) return;
      const current = ensure(result.player_id);
      if (result.tournament_id) current.events.add(result.tournament_id);
      if (result.final_position === 1) current.wins += 1;
      if ([1, 2, 3].includes(result.final_position ?? 0)) current.podiums += 1;
    });

    officials.forEach((official) => {
      if (!official.player_id) return;
      const current = ensure(official.player_id);
      if (official.tournament_id) current.officialRoles.add(official.tournament_id);
    });

    return new Map(
      [...stats.entries()].map(([playerId, value]) => [
        playerId,
        {
          events: value.events.size,
          wins: value.wins,
          podiums: value.podiums,
          officialRoles: value.officialRoles.size,
        },
      ])
    );
  }, [results, officials]);

  const duplicateOwnerMap = useMemo(() => {
    const map = new Map<string, string>();

    players.forEach((player) => {
      if (player.verification_status === "Verified" || player.chess_sa_id) return;

      const owner = players.find((candidate) => {
        if (candidate.id === player.id) return false;
        if (candidate.verification_status !== "Verified" && !candidate.chess_sa_id) return false;
        return tokenSimilarity(player.full_name, candidate.full_name) >= 50;
      });

      if (owner) map.set(player.id, owner.id);
    });

    return map;
  }, [players]);

  const displayPlayerStats = useMemo(() => {
    const stats = new Map<string, { events: number; wins: number; podiums: number; officialRoles: number }>();

    playerStats.forEach((value, playerId) => {
      const ownerId = duplicateOwnerMap.get(playerId) ?? playerId;
      const current = stats.get(ownerId) ?? {
        events: 0,
        wins: 0,
        podiums: 0,
        officialRoles: 0,
      };

      stats.set(ownerId, {
        events: current.events + value.events,
        wins: current.wins + value.wins,
        podiums: current.podiums + value.podiums,
        officialRoles: current.officialRoles + value.officialRoles,
      });
    });

    return stats;
  }, [playerStats, duplicateOwnerMap]);

  const publicPlayers = useMemo(() => {
    return players.filter((player) => !duplicateOwnerMap.has(player.id));
  }, [players, duplicateOwnerMap]);

  const provinces = useMemo(() => {
    const values = publicPlayers
      .map((player) => player.province)
      .filter((value): value is string => Boolean(value))
      .sort();

    return ["All", ...Array.from(new Set(values))];
  }, [publicPlayers]);

  const clubs = useMemo(() => {
    const values = publicPlayers
      .map((player) => player.club)
      .filter((value): value is string => Boolean(value))
      .sort();

    return ["All", ...Array.from(new Set(values))];
  }, [publicPlayers]);

  const filteredPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();
    const directSearchIds = new Set(directSearchPlayers.map((player) => player.id));

    const searchMatches = (player: Player) =>
      !text ||
      player.full_name.toLowerCase().includes(text) ||
      (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
      (player.fide_id ?? "").toLowerCase().includes(text) ||
      (player.club ?? "").toLowerCase().includes(text) ||
      (player.province ?? "").toLowerCase().includes(text) ||
      (player.title ?? "").toLowerCase().includes(text);

    const directPlayerMap = new Map<string, Player>();

    const seedPlayers = text
      ? [...publicPlayers, ...players.filter(searchMatches), ...directSearchPlayers]
      : publicPlayers;

    seedPlayers.forEach((player) => {
      directPlayerMap.set(player.id, player);
    });

    const searchablePlayers = Array.from(directPlayerMap.values());

    return searchablePlayers
      .filter((player) => {
        const stats = displayPlayerStats.get(player.id);
        const matchesSearch = searchMatches(player) || directSearchIds.has(player.id);

        if (text) return matchesSearch;

        const matchesProvince =
          provinceFilter === "All" || player.province === provinceFilter;
        const matchesClub = clubFilter === "All" || player.club === clubFilter;
        const matchesStatus =
          statusFilter === "All" ||
          (statusFilter === "Verified" &&
            player.verification_status === "Verified") ||
          (statusFilter === "Rated" && Boolean(player.rating)) ||
          (statusFilter === "FIDE" && Boolean(player.fide_id)) ||
          (statusFilter === "Officials" && (stats?.officialRoles ?? 0) > 0);

        return matchesSearch && matchesProvince && matchesClub && matchesStatus;
      })
      .sort((a, b) => {
        const aStats = displayPlayerStats.get(a.id);
        const bStats = displayPlayerStats.get(b.id);

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
    publicPlayers,
    players,
    directSearchPlayers,
    displayPlayerStats,
    search,
    provinceFilter,
    clubFilter,
    statusFilter,
    sortBy,
  ]);

  const platformStats = useMemo(() => {
    const active = publicPlayers.filter(
      (player) => (displayPlayerStats.get(player.id)?.events ?? 0) > 0
    ).length;

    return {
      players: publicPlayers.length,
      active,
      rated: publicPlayers.filter((player) => Boolean(player.rating)).length,
      fide: publicPlayers.filter((player) => Boolean(player.fide_id)).length,
    };
  }, [publicPlayers, displayPlayerStats]);

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10 bg-zinc-950">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <Link
            href="/"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            Back home
          </Link>

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
                Player Centre
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                Find PCC players fast
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
                Search verified club profiles by name, club, Chess SA ID,
                FIDE ID, province, tournament activity and official roles.
                Rankings are handled by Limpopo Chess Academy.
              </p>
              <p className="mt-3 max-w-3xl text-xs leading-6 text-zinc-500">
                Some profiles may still be awaiting photos, biographies or
                source confirmation. PCC keeps improving these records as
                tournament and Chess SA data is verified.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Players" value={platformStats.players} />
              <StatCard label="Active" value={platformStats.active} />
              <StatCard label="Rated" value={platformStats.rated} />
              <StatCard label="FIDE linked" value={platformStats.fide} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[300px_1fr]">
        <aside className="h-fit rounded-xl border border-white/10 bg-zinc-900 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-black">Search</h2>
            <Link
              href={partnerRankingsUrl}
              target={partnerRankingsUrl.startsWith("http") ? "_blank" : undefined}
              rel={partnerRankingsUrl.startsWith("http") ? "noopener noreferrer" : undefined}
              className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700"
            >
              Partner rankings
            </Link>
          </div>

          <div className="mt-4 space-y-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, ID, club..."
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
              <option value="Verified">Verified only</option>
              <option value="Rated">Rated only</option>
              <option value="FIDE">FIDE linked</option>
              <option value="Officials">Officials</option>
            </select>

            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value)}
              className={inputClass}
            >
              <option value="name">Name A-Z</option>
              <option value="rating">Rating high-low</option>
              <option value="wins">Most wins</option>
              <option value="podiums">Most podiums</option>
              <option value="events">Most events</option>
              <option value="officials">Official roles</option>
            </select>
          </div>

          <div className="mt-5 rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-zinc-400">
            Showing{" "}
            <span className="font-black text-white">{filteredPlayers.length}</span>{" "}
            of{" "}
            <span className="font-black text-white">
              {search.trim() ? "matching" : publicPlayers.length}
            </span>{" "}
            players.
          </div>

          <div className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm leading-6 text-red-50/80">
            Official ranking information is provided by Limpopo Chess Academy.
            PCC keeps the player profiles and tournament records here.
          </div>
        </aside>

        <div>
          {message && (
            <p className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          {loading ? (
            <p className="rounded-xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
              Loading players...
            </p>
          ) : filteredPlayers.length === 0 ? (
            <p className="rounded-xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
              No players found.
            </p>
          ) : (
            <>
              <section className="hidden overflow-hidden rounded-xl border border-white/10 bg-zinc-900 lg:block">
                <table className="w-full text-left text-sm">
                  <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="p-4">Player</th>
                      <th className="p-4">Rating</th>
                      <th className="p-4">Club</th>
                      <th className="p-4">Events</th>
                      <th className="p-4">Record</th>
                      <th className="p-4">IDs</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPlayers.map((player) => {
                      const stats = playerStats.get(player.id);

                      return (
                        <tr key={player.id} className="border-t border-white/10">
                          <td className="p-4">
                            <Link
                              href={`/players/${player.id}`}
                              className="flex items-center gap-3 font-bold text-white transition hover:text-red-300"
                            >
                              <PlayerAvatar
                                name={player.full_name}
                                photoUrl={player.profile_photo_url}
                                size="sm"
                              />
                              <span>
                                {player.full_name}
                                <span className="mt-1 block text-xs font-normal text-zinc-500">
                                  {player.title ? `${player.title} - ` : ""}
                                  {player.verification_status ?? "Profile"}
                                </span>
                              </span>
                            </Link>
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
                            {stats?.events ?? 0}
                          </td>
                          <td className="p-4 text-zinc-300">
                            {stats?.wins ?? 0} wins
                            <span className="block text-xs text-zinc-500">
                              {stats?.podiums ?? 0} podiums
                            </span>
                          </td>
                          <td className="p-4 text-xs text-zinc-500">
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

              <section className="grid gap-4 lg:hidden">
                {filteredPlayers.map((player) => (
                  <PlayerMobileCard
                    key={player.id}
                    player={player}
                    stats={playerStats.get(player.id)}
                  />
                ))}
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function PlayerMobileCard({
  player,
  stats,
}: {
  player: Player;
  stats?: { events: number; wins: number; podiums: number; officialRoles: number };
}) {
  return (
    <Link
      href={`/players/${player.id}`}
      className="rounded-xl border border-white/10 bg-zinc-900 p-4 transition hover:border-red-500"
    >
      <div className="flex items-center gap-3">
        <PlayerAvatar
          name={player.full_name}
          photoUrl={player.profile_photo_url}
          size="md"
        />
        <div className="min-w-0">
          <p className="truncate font-black text-white">{player.full_name}</p>
          <p className="mt-1 truncate text-sm text-zinc-400">
            {valueOrDash(player.club)} - {valueOrDash(player.province)}
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <MiniStat label="Rating" value={valueOrDash(player.rating)} />
        <MiniStat label="Events" value={stats?.events ?? 0} />
        <MiniStat label="Wins" value={stats?.wins ?? 0} />
        <MiniStat label="Podiums" value={stats?.podiums ?? 0} />
      </div>
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-zinc-950 px-2 py-2">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-sm font-black text-white">{value}</p>
    </div>
  );
}
