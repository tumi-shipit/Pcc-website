"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../../lib/supabase";

type NewsPost = {
  id: string;
  title: string;
  excerpt: string;
  image_url: string | null;
  category: string | null;
  published_at: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getCategoryIcon(category: string | null) {
  if (category === "Platform Update") return "💻";
  if (category === "Tournament Report") return "🏆";
  if (category === "Tournament News") return "📢";
  if (category === "Achievement") return "🏅";
  if (category === "Player Spotlight") return "👤";
  return "📰";
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

      setPosts((data ?? []) as NewsPost[]);
      setLoading(false);
    }

    loadNews();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
          PCC Media Centre
        </p>

        <h1 className="mt-3 text-4xl font-black md:text-6xl">
          News & Tournament Reports
        </h1>

        <p className="mt-5 max-w-3xl text-gray-400 md:text-lg">
          Follow tournament reports, platform updates, club news and stories
          from the chess community.
        </p>

        {loading ? (
          <p className="mt-8 text-gray-400">Loading news...</p>
        ) : (
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/news/${post.id}`}
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
                    {getCategoryIcon(post.category)} {post.category ?? "News"}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                    {formatDate(post.published_at)}
                  </p>

                  <h2 className="mt-2 line-clamp-2 text-xl font-bold transition group-hover:text-red-300">
                    {post.title}
                  </h2>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                    {post.excerpt}
                  </p>

                  <p className="mt-4 text-sm font-semibold text-red-300">
                    Read article →
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
