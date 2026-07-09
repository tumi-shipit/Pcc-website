"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  club: string | null;
  province: string | null;
};

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
};

type NewsPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string | null;
  published: boolean;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

export default function AdminGlobalSearchPage() {
  return (
    <Suspense
      fallback={
        <AdminGuard>
          <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
            <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
              Loading search...
            </div>
          </main>
        </AdminGuard>
      }
    >
      <AdminGlobalSearchContent />
    </Suspense>
  );
}

function AdminGlobalSearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(initialQuery);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function runSearch(searchText = query) {
    const text = searchText.trim();

    if (!text) {
      setPlayers([]);
      setTournaments([]);
      setNews([]);
      return;
    }

    setLoading(true);
    setMessage("");

    const searchPattern = `%${text}%`;

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("id, full_name, chess_sa_id, fide_id, club, province")
      .or(
        `full_name.ilike.${searchPattern},chess_sa_id.ilike.${searchPattern},fide_id.ilike.${searchPattern},club.ilike.${searchPattern},province.ilike.${searchPattern}`
      )
      .limit(20);

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status")
      .or(
        `tournament_name.ilike.${searchPattern},venue.ilike.${searchPattern},province.ilike.${searchPattern}`
      )
      .limit(20);

    const { data: newsData, error: newsError } = await supabase
      .from("news_posts")
      .select("id, title, excerpt, category, published")
      .or(
        `title.ilike.${searchPattern},excerpt.ilike.${searchPattern},category.ilike.${searchPattern}`
      )
      .limit(20);

    if (playerError || tournamentError || newsError) {
      setMessage(
        playerError?.message ||
          tournamentError?.message ||
          newsError?.message ||
          "Search failed."
      );
    }

    setPlayers((playerData ?? []) as Player[]);
    setTournaments((tournamentData ?? []) as Tournament[]);
    setNews((newsData ?? []) as NewsPost[]);
    setLoading(false);
  }

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      runSearch(initialQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const totalResults = useMemo(() => {
    return players.length + tournaments.length + news.length;
  }, [players, tournaments, news]);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin/home" className="text-sm font-semibold text-red-300 transition hover:text-red-200">
            ← Back to Admin Home
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Global Search
            </p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">Search PCC</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Search players, tournaments and media from one admin screen.
            </p>
          </section>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              runSearch();
            }}
            className="mt-8 grid gap-4 md:grid-cols-[1fr_160px]"
          >
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search player, Chess SA ID, tournament, venue, article..."
              className={inputClass}
            />

            <button type="submit" className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700">
              Search
            </button>
          </form>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <p className="mt-6 text-sm text-gray-400">
            {loading ? "Searching..." : `${totalResults} result(s) found`}
          </p>

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <ResultPanel title="Players" count={players.length}>
              {players.map((player) => (
                <Link key={player.id} href={`/admin/players/${player.id}`} className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500">
                  <p className="font-black text-white">{player.full_name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Chess SA: {player.chess_sa_id ?? "-"} • FIDE: {player.fide_id ?? "-"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {player.club ?? "-"} • {player.province ?? "-"}
                  </p>
                </Link>
              ))}
            </ResultPanel>

            <ResultPanel title="Tournaments" count={tournaments.length}>
              {tournaments.map((tournament) => (
                <Link key={tournament.id} href={`/admin/tournaments/${tournament.id}`} className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500">
                  <p className="font-black text-white">{tournament.tournament_name}</p>
                  <p className="mt-1 text-xs text-gray-500">
                    {tournament.start_date} • {tournament.venue ?? "-"}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {tournament.registration_status ?? "Status TBA"}
                  </p>
                </Link>
              ))}
            </ResultPanel>

            <ResultPanel title="News" count={news.length}>
              {news.map((post) => (
                <Link key={post.id} href={`/news/${post.id}`} className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500">
                  <p className="font-black text-white">{post.title}</p>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-500">{post.excerpt}</p>
                  <p className="mt-2 text-xs text-gray-500">
                    {post.category ?? "News"} • {post.published ? "Published" : "Draft"}
                  </p>
                </Link>
              ))}
            </ResultPanel>
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}

function ResultPanel({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex items-end justify-between">
        <h2 className="text-2xl font-black">{title}</h2>
        <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs text-gray-400">{count}</span>
      </div>

      <div className="mt-6 space-y-3">
        {count === 0 ? (
          <p className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-sm text-gray-400">
            No results.
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
