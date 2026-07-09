"use client";

import { use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  date_of_birth: string | null;
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

type Achievement = {
  id: string;
  title: string;
  achievement_type: string | null;
  description: string | null;
  achieved_at: string | null;
  tournaments: {
    id: string;
    tournament_name: string;
  } | null;
};

type RatingHistory = {
  id: string;
  rating_type: string | null;
  rating: number | null;
  rating_date: string | null;
  source: string | null;
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

type PlayerNewsTag = {
  id: string;
  news_posts: {
    id: string;
    title: string;
    excerpt: string;
    image_url: string | null;
    category: string | null;
    published: boolean;
    published_at: string | null;
  } | null;
};

type PlayerGalleryTag = {
  id: string;
  tournament_gallery: {
    id: string;
    image_url: string;
    caption: string | null;
    tournament_id: string;
  } | null;
};

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

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function medal(position: number | null) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "♟";
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
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [ratings, setRatings] = useState<RatingHistory[]>([]);
  const [officials, setOfficials] = useState<OfficialAssignment[]>([]);
  const [newsTags, setNewsTags] = useState<PlayerNewsTag[]>([]);
  const [galleryTags, setGalleryTags] = useState<PlayerGalleryTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadPlayer() {
      setLoading(true);
      setMessage("");

      const { data: playerData, error: playerError } = await supabase
        .from("players")
        .select(
          "id, full_name, chess_sa_id, fide_id, date_of_birth, gender, club, province, rating, verification_status, profile_photo_url, biography, title"
        )
        .eq("id", playerId)
        .single();

      if (playerError || !playerData) {
        setMessage("Player could not be loaded.");
        setLoading(false);
        return;
      }

      const { data: resultData } = await supabase
        .from("tournament_results")
        .select(
          "id, tournament_id, section_id, final_position, points, tie_break, award_title, tournaments(id, tournament_name, start_date, venue, registration_status), tournament_sections(id, section_name)"
        )
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(10);

      const { data: achievementData } = await supabase
        .from("player_achievements")
        .select(
          "id, title, achievement_type, description, achieved_at, tournaments(id, tournament_name)"
        )
        .eq("player_id", playerId)
        .order("achieved_at", { ascending: false, nullsFirst: false })
        .limit(8);

      const { data: ratingData } = await supabase
        .from("player_rating_history")
        .select("id, rating_type, rating, rating_date, source")
        .eq("player_id", playerId)
        .order("rating_date", { ascending: false, nullsFirst: false })
        .limit(8);

      const { data: officialData } = await supabase
        .from("tournament_officials")
        .select("id, role, tournaments(id, tournament_name, start_date, venue)")
        .eq("player_id", playerId)
        .order("created_at", { ascending: false })
        .limit(8);

      const { data: newsData } = await supabase
        .from("player_news_tags")
        .select(
          "id, news_posts(id, title, excerpt, image_url, category, published, published_at)"
        )
        .eq("player_id", playerId)
        .limit(6);

      const { data: galleryData } = await supabase
        .from("player_gallery_tags")
        .select("id, tournament_gallery(id, image_url, caption, tournament_id)")
        .eq("player_id", playerId)
        .limit(8);

      setPlayer(playerData as Player);
      setResults((resultData ?? []) as unknown as TournamentResult[]);
      setAchievements((achievementData ?? []) as unknown as Achievement[]);
      setRatings((ratingData ?? []) as unknown as RatingHistory[]);
      setOfficials((officialData ?? []) as unknown as OfficialAssignment[]);
      setNewsTags((newsData ?? []) as unknown as PlayerNewsTag[]);
      setGalleryTags((galleryData ?? []) as unknown as PlayerGalleryTag[]);
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
        <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
          Loading player profile...
        </div>
      </main>
    );
  }

  if (!player) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          {message || "Player could not be found."}
        </div>
      </main>
    );
  }

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

          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="relative flex h-36 w-36 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-500/30 bg-red-600/10 text-4xl font-black text-red-200">
                {player.profile_photo_url ? (
                  <Image
                    src={player.profile_photo_url}
                    alt={player.full_name}
                    fill
                    priority
                    sizes="144px"
                    className="object-cover"
                  />
                ) : (
                  initials(player.full_name)
                )}
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
                  Player Profile
                </p>

                <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                  {player.full_name}
                </h1>

                <p className="mt-4 text-lg text-gray-300">
                  {valueOrDash(player.title)} • {valueOrDash(player.club)} •{" "}
                  {valueOrDash(player.province)}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-gray-200">
                    Chess SA: {valueOrDash(player.chess_sa_id)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-gray-200">
                    FIDE: {valueOrDash(player.fide_id)}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-gray-200">
                    Rating: {valueOrDash(player.rating)}
                  </span>
                  {player.verification_status === "Verified" && (
                    <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                      Verified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <Link
              href={`/players/${playerId}/history`}
              className="rounded-xl bg-red-600 px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
            >
              View Full History
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Events" value={stats.tournaments} />
          <StatCard label="Wins" value={stats.wins} tone="yellow" />
          <StatCard label="Podiums" value={stats.podiums} tone="green" />
          <StatCard label="Best Finish" value={stats.bestFinish ?? "-"} />
          <StatCard label="Current" value={valueOrDash(latestRating)} />
          <StatCard label="Peak" value={valueOrDash(peakRating)} tone="red" />
        </div>

        {player.biography && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Biography
            </p>
            <div className="mt-5 space-y-4 text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              {player.biography.split("\n").map((paragraph, index) =>
                paragraph.trim() ? <p key={index}>{paragraph}</p> : null
              )}
            </div>
          </section>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
          <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Tournament History
                </p>
                <h2 className="mt-3 text-2xl font-black md:text-4xl">
                  Recent Results
                </h2>
              </div>

              <Link
                href={`/players/${playerId}/history`}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
              >
                View All
              </Link>
            </div>

            {results.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                No public tournament results linked yet.
              </p>
            ) : (
              <div className="mt-6 space-y-3">
                {results.map((result) => (
                  <Link
                    key={result.id}
                    href={`/tournaments/${result.tournament_id}`}
                    className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-black text-white">
                          {result.tournaments?.tournament_name ??
                            "Unknown tournament"}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {formatDate(result.tournaments?.start_date ?? null)} •{" "}
                          {result.tournament_sections?.section_name ?? "Overall"}
                        </p>
                      </div>

                      <div className="text-sm text-gray-300">
                        {medal(result.final_position)} Position{" "}
                        {valueOrDash(result.final_position)} •{" "}
                        {valueOrDash(result.points)} pts
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-8">
            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Achievements
              </p>
              <h2 className="mt-3 text-2xl font-black">Honours</h2>

              <div className="mt-6 space-y-3">
                {achievements.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                    No achievements added yet.
                  </p>
                ) : (
                  achievements.map((achievement) => (
                    <div
                      key={achievement.id}
                      className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4"
                    >
                      <p className="font-black text-white">
                        {achievement.title}
                      </p>
                      <p className="mt-1 text-xs font-bold uppercase tracking-wide text-yellow-200">
                        {achievement.achievement_type ?? "Achievement"} •{" "}
                        {formatDate(achievement.achieved_at)}
                      </p>
                      {achievement.description && (
                        <p className="mt-2 text-sm leading-6 text-yellow-50/80">
                          {achievement.description}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Ratings
              </p>
              <h2 className="mt-3 text-2xl font-black">Rating Timeline</h2>

              <div className="mt-6 space-y-3">
                {ratings.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                    No rating history added yet.
                  </p>
                ) : (
                  ratings.map((rating) => (
                    <div
                      key={rating.id}
                      className="rounded-2xl border border-white/10 bg-zinc-950 p-4"
                    >
                      <p className="text-xl font-black text-white">
                        {valueOrDash(rating.rating)}
                      </p>
                      <p className="mt-1 text-sm text-gray-400">
                        {rating.rating_type ?? "Rating"} •{" "}
                        {formatDate(rating.rating_date)}
                      </p>
                      {rating.source && (
                        <p className="mt-1 text-xs text-gray-500">
                          {rating.source}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </section>
          </aside>
        </div>

        {officials.length > 0 && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Official Roles
            </p>
            <h2 className="mt-3 text-2xl font-black md:text-4xl">
              Arbiter & Organiser History
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {officials.map((official) => (
                <Link
                  key={official.id}
                  href={`/tournaments/${official.tournaments?.id}`}
                  className="rounded-2xl border border-white/10 bg-zinc-950 p-5 transition hover:border-red-500"
                >
                  <p className="font-black text-white">{official.role}</p>
                  <p className="mt-2 text-sm text-gray-400">
                    {official.tournaments?.tournament_name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDate(official.tournaments?.start_date ?? null)} •{" "}
                    {official.tournaments?.venue ?? "Venue TBA"}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {newsTags.length > 0 && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Media
            </p>
            <h2 className="mt-3 text-2xl font-black md:text-4xl">
              News & Features
            </h2>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {newsTags
                .filter((tag) => tag.news_posts?.published)
                .map((tag) => {
                  const post = tag.news_posts;
                  if (!post) return null;

                  return (
                    <Link
                      key={tag.id}
                      href={`/news/${post.id}`}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition hover:border-red-500"
                    >
                      <div className="relative aspect-video bg-zinc-900">
                        {post.image_url ? (
                          <Image
                            src={post.image_url}
                            alt={post.title}
                            fill
                            sizes="33vw"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-sm text-gray-600">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-5">
                        <p className="text-xs font-bold uppercase tracking-wide text-red-300">
                          {post.category ?? "News"}
                        </p>
                        <h3 className="mt-2 font-black text-white">
                          {post.title}
                        </h3>
                        <p className="mt-2 line-clamp-2 text-sm text-gray-400">
                          {post.excerpt}
                        </p>
                      </div>
                    </Link>
                  );
                })}
            </div>
          </section>
        )}

        {galleryTags.length > 0 && (
          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Gallery
            </p>
            <h2 className="mt-3 text-2xl font-black md:text-4xl">
              Tagged Photos
            </h2>

            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {galleryTags.map((tag) => {
                const image = tag.tournament_gallery;
                if (!image) return null;

                return (
                  <Link
                    key={tag.id}
                    href={`/tournaments/${image.tournament_id}`}
                    className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 transition hover:border-red-500"
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={image.image_url}
                        alt={image.caption ?? "Player gallery photo"}
                        fill
                        sizes="25vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    {image.caption && (
                      <p className="line-clamp-2 p-3 text-xs text-gray-400">
                        {image.caption}
                      </p>
                    )}
                  </Link>
                );
              })}
            </div>
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
