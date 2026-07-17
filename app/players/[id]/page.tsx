"use client";

import { use, useEffect, useMemo, useState } from "react";
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
  biography: string | null;
  title: string | null;
};

type TournamentResult = {
  id: string;
  tournament_id: string;
  section_id: string | null;
  final_position: number | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    venue: string | null;
    registration_status: string | null;
  } | null;
  tournament_sections: {
    id: string;
    section_name: string;
  } | null;
};

type RatingHistory = {
  id: string;
  rating_type: string | null;
  rating: number | null;
  rating_date: string | null;
  source: string | null;
};

type Achievement = {
  id: string;
  title: string;
  achievement_type: string | null;
  description: string | null;
  achieved_at: string | null;
};

type OfficialAssignment = {
  id: string;
  role: string;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    venue: string | null;
  } | null;
};

type MemberResolvedPlayer = Omit<Player, "gender" | "biography" | "title">;

function formatDate(value: string | null) {
  if (!value) return "TBA";
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

export default function PublicPlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playerId = id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [ratings, setRatings] = useState<RatingHistory[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [officials, setOfficials] = useState<OfficialAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlayer() {
      setLoading(true);
      setMessage("");

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select(
          "id, full_name, chess_sa_id, fide_id, gender, club, province, rating, verification_status, profile_photo_url, biography, title"
        )
        .eq("id", playerId)
        .maybeSingle();

      let loadedPlayer = playerData as Player | null;

      if ((playerError || !loadedPlayer) && (await supabase.auth.getSession()).data.session) {
        const { data: memberProfileData } = await supabase
          .rpc("resolve_member_player_profile")
          .maybeSingle();
        const memberProfile = memberProfileData as MemberResolvedPlayer | null;

        if (memberProfile && memberProfile.id === playerId) {
          loadedPlayer = {
            id: memberProfile.id,
            full_name: memberProfile.full_name,
            chess_sa_id: memberProfile.chess_sa_id,
            fide_id: memberProfile.fide_id,
            gender: null,
            club: memberProfile.club,
            province: memberProfile.province,
            rating: memberProfile.rating,
            verification_status: memberProfile.verification_status,
            profile_photo_url: memberProfile.profile_photo_url,
            biography: null,
            title: null,
          } as Player;
        }
      }

      if (!loadedPlayer) {
        setMessage("Player could not be loaded.");
        setLoading(false);
        return;
      }

      const { data: relatedPlayerData } = await supabase
        .from("players")
        .select("id, full_name, chess_sa_id, verification_status")
        .neq("id", playerId)
        .limit(10000);

      const relatedPlayerIds = (relatedPlayerData ?? [])
        .filter((candidate) => {
          if (candidate.chess_sa_id) return false;
          if (candidate.verification_status === "Verified") return false;
          return tokenSimilarity(loadedPlayer.full_name, candidate.full_name) >= 50;
        })
        .map((candidate) => candidate.id);

      const profilePlayerIds = [playerId, ...relatedPlayerIds];

      const { data: resultData } = await supabase
        .from("tournament_results")
        .select(
          "id, tournament_id, section_id, final_position, points, tie_break, award_title, tournaments(id, tournament_name, start_date, venue, registration_status), tournament_sections(id, section_name)"
        )
        .in("player_id", profilePlayerIds)
        .order("created_at", { ascending: false })
        .limit(12);

      const { data: ratingData } = await supabase
        .from("player_rating_history")
        .select("id, rating_type, rating, rating_date, source")
        .eq("player_id", playerId)
        .order("rating_date", { ascending: false, nullsFirst: false })
        .limit(8);

      const { data: achievementData } = await supabase
        .from("player_achievements")
        .select("id, title, achievement_type, description, achieved_at")
        .eq("player_id", playerId)
        .order("achieved_at", { ascending: false, nullsFirst: false })
        .limit(6);

      const { data: officialData } = await supabase
        .from("tournament_officials")
        .select("id, role, tournaments(id, tournament_name, start_date, venue)")
        .in("player_id", profilePlayerIds)
        .order("created_at", { ascending: false })
        .limit(6);

      setPlayer(loadedPlayer);
      setResults((resultData ?? []) as unknown as TournamentResult[]);
      setRatings((ratingData ?? []) as unknown as RatingHistory[]);
      setAchievements((achievementData ?? []) as unknown as Achievement[]);
      setOfficials((officialData ?? []) as unknown as OfficialAssignment[]);
      setLoading(false);
    }

    loadPlayer();
  }, [playerId]);

  const stats = useMemo(() => {
    const wins = results.filter((result) => result.final_position === 1).length;
    const podiums = results.filter((result) =>
      [1, 2, 3].includes(result.final_position ?? 0)
    ).length;
    const bestFinish =
      results
        .map((result) => result.final_position)
        .filter((position): position is number => Boolean(position))
        .sort((a, b) => a - b)[0] ?? null;

    return {
      tournaments: new Set(results.map((result) => result.tournament_id)).size,
      wins,
      podiums,
      bestFinish,
      officialRoles: officials.length,
    };
  }, [results, officials]);

  const latestRating = ratings[0]?.rating ?? player?.rating ?? null;
  const peakRating =
    ratings.length > 0
      ? Math.max(...ratings.map((rating) => rating.rating ?? 0))
      : player?.rating ?? null;

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-7xl rounded-xl border border-white/10 bg-zinc-900 p-6 text-zinc-400">
          Loading player profile...
        </div>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-3xl rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          {message || "Player could not be found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <Link
            href="/players"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            Back to Player Centre
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <PlayerAvatar
                name={player.full_name}
                photoUrl={player.profile_photo_url}
                size="xl"
                priority
              />

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
                  Player Profile
                </p>
                <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                  {player.full_name}
                </h1>
                <p className="mt-3 text-zinc-300">
                  {valueOrDash(player.title)} - {valueOrDash(player.club)} -{" "}
                  {valueOrDash(player.province)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag label={`Chess SA: ${valueOrDash(player.chess_sa_id)}`} />
                  <Tag label={`FIDE: ${valueOrDash(player.fide_id)}`} />
                  <Tag label={`Rating: ${valueOrDash(player.rating)}`} />
                  {player.verification_status === "Verified" && (
                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                      Verified
                    </span>
                  )}
                </div>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-400">
                  Public profile built from PCC tournament records, player
                  updates and verified Chess SA details where available.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Events" value={stats.tournaments} />
              <StatCard label="Wins" value={stats.wins} />
              <StatCard label="Current" value={valueOrDash(latestRating)} />
              <StatCard label="Peak" value={valueOrDash(peakRating)} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 md:px-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-black">Player story</h2>
            {player.biography ? (
              <div className="mt-4 space-y-4 text-sm leading-7 text-zinc-300">
                {player.biography.split("\n").map((paragraph, index) =>
                  paragraph.trim() ? <p key={index}>{paragraph}</p> : null
                )}
              </div>
            ) : (
              <p className="mt-4 text-sm leading-7 text-zinc-400">
                A player story has not been added yet. Tournament results,
                ratings and honours will continue to build this profile as PCC
                records are updated.
              </p>
            )}
          </section>

          <section className="rounded-xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Tournament record
                </p>
                <h2 className="mt-2 text-2xl font-black">Recent results</h2>
              </div>
              <Link
                href={`/players/${playerId}/history`}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
              >
                Full history
              </Link>
            </div>

            {results.length === 0 ? (
              <p className="mt-6 rounded-lg border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-400">
                No public tournament results linked yet.
              </p>
            ) : (
              <div className="mt-6 overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full min-w-[700px] text-left text-sm">
                  <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="p-3">Tournament</th>
                      <th className="p-3">Section</th>
                      <th className="p-3">Position</th>
                      <th className="p-3">Points</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => (
                      <tr key={result.id} className="border-t border-white/10">
                        <td className="p-3">
                          <Link
                            href={`/tournaments/${result.tournament_id}`}
                            className="font-bold text-white transition hover:text-red-300"
                          >
                            {result.tournaments?.tournament_name ?? "Unknown tournament"}
                          </Link>
                        </td>
                        <td className="p-3 text-zinc-300">
                          {result.tournament_sections?.section_name ?? "Overall"}
                        </td>
                        <td className="p-3 text-zinc-300">
                          {valueOrDash(result.final_position)}
                        </td>
                        <td className="p-3 text-zinc-300">
                          {valueOrDash(result.points)}
                        </td>
                        <td className="p-3 text-zinc-400">
                          {formatDate(result.tournaments?.start_date ?? null)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-xl font-black">Summary</h2>
            <div className="mt-4 grid gap-3">
              <SummaryRow label="Best finish" value={valueOrDash(stats.bestFinish)} />
              <SummaryRow label="Podiums" value={stats.podiums} />
              <SummaryRow label="Official roles" value={stats.officialRoles} />
              <SummaryRow label="Gender" value={valueOrDash(player.gender)} />
            </div>
          </section>

          <section className="rounded-xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-xl font-black">Profile care</h2>
            <p className="mt-4 text-sm leading-7 text-zinc-400">
              If a name, club, rating or ID is incorrect, contact PCC so the
              admin team can review it against the source record.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
            >
              Request a correction
            </Link>
          </section>

          <section className="rounded-xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-xl font-black">Ratings</h2>
            <div className="mt-4 space-y-3">
              {ratings.length === 0 ? (
                <p className="text-sm text-zinc-400">No rating history added yet.</p>
              ) : (
                ratings.map((rating) => (
                  <div key={rating.id} className="rounded-lg border border-white/10 bg-zinc-950 p-3">
                    <p className="text-xl font-black text-white">
                      {valueOrDash(rating.rating)}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {rating.rating_type ?? "Rating"} - {formatDate(rating.rating_date)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          {achievements.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-xl font-black">Honours</h2>
              <div className="mt-4 space-y-3">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3">
                    <p className="font-bold text-white">{achievement.title}</p>
                    <p className="mt-1 text-xs text-yellow-100/80">
                      {achievement.achievement_type ?? "Achievement"} - {formatDate(achievement.achieved_at)}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {officials.length > 0 && (
            <section className="rounded-xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-xl font-black">Official roles</h2>
              <div className="mt-4 space-y-3">
                {officials.map((official) => (
                  <Link
                    key={official.id}
                    href={`/tournaments/${official.tournaments?.id}`}
                    className="block rounded-lg border border-white/10 bg-zinc-950 p-3 transition hover:border-red-500"
                  >
                    <p className="font-bold text-white">{official.role}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {official.tournaments?.tournament_name}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </aside>
      </section>
    </main>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-zinc-200">
      {label}
    </span>
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

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-950 px-4 py-3">
      <span className="text-sm text-zinc-400">{label}</span>
      <span className="text-sm font-bold text-white">{value}</span>
    </div>
  );
}
