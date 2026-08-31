"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import { supabase } from "../../lib/supabase";
import { formatCalendarDate } from "@/lib/dateHelpers";
import {
  buildVerifiedRecordNewsItems,
  type VerifiedRecordOverride,
} from "@/lib/verifiedRecords";

type NewsPost = {
  id: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  category: string | null;
  published_at: string | null;
  display_date?: string | null;
  href?: string;
  protected?: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "";

  return formatCalendarDate(value, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCategoryLabel(category: string | null) {
  if (category === "PCC Archive") return "PCC Archive";
  if (category === "Platform Update") return "Platform";
  if (category === "Tournament Report") return "Results";
  if (category === "Tournament News") return "Tournament";
  if (category === "Achievement") return "Honours";
  if (category === "Player Spotlight") return "Player";
  return `News ${category ?? "Update"}`;
}

export default function NewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      setLoading(true);

      const { data } = await supabase
        .from("news_posts")
        .select("id, title, excerpt, image_url, category, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false });
      const { data: overrideData } = await supabase
        .from("verified_record_overrides")
        .select(
          "slug, title, summary, content, image_url, album_url, album_label, date_label, organisations, facilitators"
        );
      const protectedItems = buildVerifiedRecordNewsItems(
        (overrideData ?? []) as Array<VerifiedRecordOverride & { slug?: string | null }>
      );

      setPosts([
        ...protectedItems,
        ...((data ?? []) as unknown as NewsPost[]),
      ]);
      setLoading(false);
    }

    loadNews();
  }, []);

  return (
    <PublicPageShell>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
          PCC Media Centre
        </p>

        <h1 className="mt-3 text-4xl font-black md:text-6xl">
          News & Tournament Reports
        </h1>

        <p className="mt-5 max-w-3xl text-gray-400 md:text-lg">
          Read tournament reports, club notices and stories from the chess
          community.
        </p>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <NewsLane title="Reports" text="Tournament results and event stories." />
          <NewsLane title="Players" text="Spotlights, honours and profile features." />
          <NewsLane title="Club" text="Notices, leadership updates and announcements." />
          <NewsLane title="Live" text="Time-sensitive registration and event updates." />
        </div>

        {loading ? (
          <p className="mt-8 text-gray-400">Loading news...</p>
        ) : posts.length === 0 ? (
          <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
            No published news yet.
          </p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={post.href ?? `/news/${post.id}`}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition hover:-translate-y-1 hover:border-red-500/60"
              >
                <div className="relative aspect-[16/10] bg-zinc-950">
                  {post.image_url ? (
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      News image coming soon
                    </div>
                  )}

                  <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    {getCategoryLabel(post.category)}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                    {post.display_date || formatDate(post.published_at)}
                    {post.protected ? " - PCC retained record" : ""}
                  </p>

                  <h2 className="mt-2 line-clamp-2 text-xl font-bold transition group-hover:text-red-300">
                    {post.title}
                  </h2>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                    {post.excerpt}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-red-300">
                    {post.protected ? "Open record" : "Read article"} 
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      </main>
    </PublicPageShell>
  );
}

function NewsLane({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-xs leading-5 text-gray-400">{text}</p>
    </div>
  );
}

