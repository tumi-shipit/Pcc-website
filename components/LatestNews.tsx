"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { supabase } from "../lib/supabase";

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

export default function LatestNews() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      setLoading(true);

      const { data } = await supabase
        .from("news_posts")
        .select("id, title, excerpt, image_url, category, published_at")
        .eq("published", true)
        .order("published_at", { ascending: false })
        .limit(3);

      setPosts((data ?? []) as NewsPost[]);
      setLoading(false);
    }

    loadNews();
  }, []);

  return (
    <section id="news" className="bg-black py-16 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-3 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-500 md:text-sm">
              Latest News
            </p>

            <h2 className="text-3xl font-bold md:text-5xl">
              Club & Tournament Updates
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400 md:text-lg md:leading-8">
              Follow announcements, tournament updates, results and platform
              improvements.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading news...</p>
        ) : posts.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-zinc-900 p-5 text-sm text-gray-400">
            No news has been published yet.
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition hover:-translate-y-1 hover:border-red-500/60"
              >
                <div className="relative aspect-[16/9] bg-zinc-950">
                  {post.image_url ? (
                    <Image
                      src={post.image_url}
                      alt={post.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-gray-500">
                      News image coming soon
                    </div>
                  )}

                  <span className="absolute left-3 top-3 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                    {post.category ?? "News"}
                  </span>
                </div>

                <div className="p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                    {formatDate(post.published_at)}
                  </p>

                  <h3 className="mt-2 line-clamp-2 text-lg font-bold">
                    {post.title}
                  </h3>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-400">
                    {post.excerpt}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
