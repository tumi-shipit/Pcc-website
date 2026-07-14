"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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

function getCategoryIcon(category: string | null) {
  if (category === "Platform Update") return "Platform";
  if (category === "Tournament News") return "Tournament";
  if (category === "Registration") return "Registration";
  if (category === "Live Update") return "Live";
  if (category === "Achievement") return "Honours";
  if (category === "Player Spotlight") return "Player";
  return "News";
}

export default function LatestNews() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNews() {
      setLoading(true);

      const { data, error } = await supabase
        .from("news_posts")
        .select("id, title, excerpt, image_url, category, published_at")
        .eq("published", true)
        .neq("category", "Tournament Report")
        .order("published_at", { ascending: false })
        .limit(8);

      if (error) {
        console.error("Latest news error:", error);
        setPosts([]);
      } else {
        setPosts((data ?? []) as NewsPost[]);
      }

      setLoading(false);
    }

    loadNews();
  }, []);

  useEffect(() => {
    if (posts.length <= 1) return;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % posts.length);
    }, 6000);

    return () => window.clearInterval(timer);
  }, [posts.length]);

  const activePost = useMemo(() => {
    return posts[activeIndex] ?? null;
  }, [posts, activeIndex]);

  function goPrevious() {
    if (posts.length === 0) return;

    setActiveIndex((current) =>
      current === 0 ? posts.length - 1 : current - 1
    );
  }

  function goNext() {
    if (posts.length === 0) return;

    setActiveIndex((current) => (current + 1) % posts.length);
  }

  return (
    <section id="news" className="bg-black py-16 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 flex flex-col gap-3 md:mb-12 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-500 md:text-sm">
              PCC Newsroom
            </p>

            <h2 className="text-3xl font-bold md:text-5xl">
              Reports, updates and player stories
            </h2>

            <p className="mt-4 max-w-2xl text-sm leading-6 text-gray-400 md:text-lg md:leading-8">
              Tournament reports, player spotlights, registration notices and
              club announcements, curated for players, parents and supporters.
            </p>
          </div>

          <Link
            href="/news"
            className="inline-flex rounded-lg border border-white/10 px-5 py-3 text-sm font-semibold text-white transition hover:border-red-500"
          >
            View All News 
          </Link>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading news...</p>
        ) : !activePost ? (
          <p className="rounded-xl border border-white/10 bg-zinc-900 p-5 text-sm text-gray-400">
            No current news has been published yet.
          </p>
        ) : (
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <Link
                href={`/news/${activePost.id}`}
                className="group relative block min-h-[280px] overflow-hidden bg-zinc-950 md:min-h-[420px]"
              >
                {activePost.image_url ? (
                  <Image
                    src={activePost.image_url}
                    alt={activePost.title}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover transition duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-gray-500 md:min-h-[420px]">
                    News image coming soon
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />

                <span className="absolute left-4 top-4 rounded-full bg-red-600 px-4 py-2 text-xs font-bold uppercase tracking-wide text-white">
                  {getCategoryIcon(activePost.category)}{" "}
                  {activePost.category ?? "News"}
                </span>
              </Link>

              <div className="flex flex-col justify-center p-6 md:p-10">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  {formatDate(activePost.published_at)}
                </p>

                <Link href={`/news/${activePost.id}`}>
                  <h3 className="mt-4 text-3xl font-black leading-tight transition hover:text-red-300 md:text-5xl">
                    {activePost.title}
                  </h3>
                </Link>

                <p className="mt-5 text-sm leading-7 text-gray-400 md:text-base md:leading-8">
                  {activePost.excerpt}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    href={`/news/${activePost.id}`}
                    className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    Read Update 
                  </Link>

                  {posts.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={goPrevious}
                        className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-red-500"
                        aria-label="Previous news"
                      >
                        Previous
                      </button>

                      <button
                        type="button"
                        onClick={goNext}
                        className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-red-500"
                        aria-label="Next news"
                      >
                        Next
                      </button>
                    </>
                  )}
                </div>

                {posts.length > 1 && (
                  <div className="mt-8 flex flex-wrap gap-2">
                    {posts.map((post, index) => (
                      <button
                        key={post.id}
                        type="button"
                        onClick={() => setActiveIndex(index)}
                        aria-label={`Show news item ${index + 1}`}
                        className={`h-2.5 rounded-full transition ${
                          activeIndex === index
                            ? "w-10 bg-red-600"
                            : "w-2.5 bg-white/20 hover:bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

