"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type NewsPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string | null;
  image_url: string | null;
  category: string | null;
  published_at: string | null;
};

type NewsOrganisationCredit = {
  id: string;
  role: string;
  representative_name: string | null;
  organisations: {
    id: string;
    name: string;
    logo_url: string | null;
    website_url: string | null;
    representative_name: string | null;
  } | null;
};

type NewsOfficialCredit = {
  id: string;
  role: string;
  notes: string | null;
  players: {
    id: string;
    full_name: string;
    chess_sa_id: string | null;
    profile_photo_url: string | null;
    title: string | null;
  } | null;
};

function formatDate(value: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getCategoryIcon(category: string | null) {
  if (category === "Platform Update") return "Platform";
  if (category === "Tournament Report") return "Results";
  if (category === "Tournament News") return "Tournament";
  if (category === "Achievement") return "Honours";
  if (category === "Player Spotlight") return "Player";
  return "News";
}

function renderTextWithLineBreaks(text: string) {
  return text.split("\n").map((line, index) => (
    <span key={`${line}-${index}`}>
      {index > 0 && <br />}
      {line}
    </span>
  ));
}

function renderArticleContent(content: string | null) {
  if (!content) return null;

  const normalizedContent = content.replace(/\r\n?/g, "\n");
  const blocks = normalizedContent
    .split(/\n{2,}/)
    .filter((block) => block.trim());

  return blocks.map((block, index) => {
    const text = block.trim();

    if (text.startsWith("## ")) {
      return (
        <h2
          key={index}
          className="mt-10 border-l-4 border-red-500 pl-4 text-2xl font-black text-white md:text-3xl"
        >
          {text.replace("## ", "")}
        </h2>
      );
    }

    if (text.startsWith("### ")) {
      return (
        <h3
          key={index}
          className="mt-8 text-xl font-bold text-red-300 md:text-2xl"
        >
          {text.replace("### ", "")}
        </h3>
      );
    }

    if (text.startsWith("> ")) {
      return (
        <blockquote
          key={index}
          className="my-8 rounded-2xl border-l-4 border-red-500 bg-red-500/10 p-5 text-lg font-semibold leading-8 text-red-100"
        >
          {renderTextWithLineBreaks(text.replace("> ", ""))}
        </blockquote>
      );
    }

    if (text.startsWith("[IMAGE:") && text.endsWith("]")) {
      const imagePath = text.replace("[IMAGE:", "").replace("]", "").trim();

      return (
        <div
          key={index}
          className="my-8 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
        >
          <div className="relative aspect-[16/10]">
            <Image
              src={imagePath}
              alt="Article image"
              fill
              sizes="(max-width: 768px) 100vw, 900px"
              className="object-cover"
            />
          </div>
        </div>
      );
    }

    if (text.startsWith("Caption:")) {
      return (
        <p
          key={index}
          className="-mt-5 mb-8 text-center text-sm italic leading-6 text-gray-500"
        >
          {text.replace("Caption:", "").trim()}
        </p>
      );
    }

    if (text.startsWith("- ")) {
      const items = text
        .split("\n")
        .map((item) => item.replace("- ", "").trim())
        .filter(Boolean);

      return (
        <ul
          key={index}
          className="grid gap-3 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm leading-6 text-gray-300 md:text-base"
        >
          {items.map((item) => (
            <li key={item} className="flex gap-3">
              <span className="mt-1 text-red-400">-</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    }

    if (text.includes(":") && text.length < 80) {
      return (
        <h3
          key={index}
          className="mt-8 text-xl font-bold text-red-300 md:text-2xl"
        >
          {text}
        </h3>
      );
    }

    return (
      <p
        key={index}
        className="text-base leading-8 text-gray-300 md:text-lg md:leading-9"
      >
        {renderTextWithLineBreaks(text)}
      </p>
    );
  });
}

export default function NewsArticlePage() {
  const params = useParams();
  const articleId = String(params.id);

  const [post, setPost] = useState<NewsPost | null>(null);
  const [organisationCredits, setOrganisationCredits] = useState<
    NewsOrganisationCredit[]
  >([]);
  const [officialCredits, setOfficialCredits] = useState<NewsOfficialCredit[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadArticle() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase
        .from("news_posts")
        .select("id, title, excerpt, content, image_url, category, published_at")
        .eq("id", articleId)
        .eq("published", true)
        .single();

      if (error || !data) {
        setMessage("Article could not be found.");
        setLoading(false);
        return;
      }

      setPost(data as NewsPost);

      const [organisationResult, officialResult] = await Promise.all([
        supabase
          .from("news_organisations")
          .select(
            "id, role, representative_name, organisations(id, name, logo_url, website_url, representative_name)"
          )
          .eq("news_post_id", articleId)
          .order("display_order", { ascending: true }),
        supabase
          .from("news_officials")
          .select(
            "id, role, notes, players(id, full_name, chess_sa_id, profile_photo_url, title)"
          )
          .eq("news_post_id", articleId)
          .order("display_order", { ascending: true }),
      ]);

      setOrganisationCredits(
        organisationResult.error
          ? []
          : ((organisationResult.data ?? []) as unknown as NewsOrganisationCredit[])
      );
      setOfficialCredits(
        officialResult.error
          ? []
          : ((officialResult.data ?? []) as unknown as NewsOfficialCredit[])
      );
      setLoading(false);
    }

    if (articleId) {
      loadArticle();
    }
  }, [articleId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
          Loading article...
        </div>
      </main>
    );
  }

  if (message || !post) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
          <h1 className="text-2xl font-bold">Article not found</h1>
          <p className="mt-3 text-red-100">{message}</p>
          <Link
            href="/news"
            className="mt-5 inline-block rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Back to News
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.22),_transparent_42%)]">
        <div className="mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-16">
          <Link
            href="/news"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to News
          </Link>

          <div className="mt-7">
            <span className="inline-flex rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-red-200">
              {getCategoryIcon(post.category)} {post.category ?? "News"}
            </span>

            <h1 className="mt-5 text-3xl font-black leading-tight md:text-6xl">
              {post.title}
            </h1>

            <p className="mt-4 text-sm font-semibold text-gray-500">
              {formatDate(post.published_at)}
            </p>

            <p className="mt-6 max-w-3xl text-lg leading-8 text-gray-300 md:text-xl md:leading-9">
              {post.excerpt}
            </p>
          </div>
        </div>
      </section>

      <NewsCredits
        organisations={organisationCredits}
        officials={officialCredits}
      />

      {post.image_url && (
        <section className="mx-auto max-w-5xl px-4 py-8 md:px-6">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-2xl">
            <div className="relative aspect-[16/10]">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                priority
                sizes="(max-width: 768px) 100vw, 900px"
                className="object-cover"
              />
            </div>
          </div>
        </section>
      )}

      <article className="mx-auto max-w-4xl space-y-6 px-4 pb-16 md:px-6">
        <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-5 md:p-8">
          <div className="prose prose-invert max-w-none">
            {renderArticleContent(post.content)}
          </div>
        </div>
      </article>
    </main>
  );
}

function NewsCredits({
  organisations,
  officials,
}: {
  organisations: NewsOrganisationCredit[];
  officials: NewsOfficialCredit[];
}) {
  if (organisations.length === 0 && officials.length === 0) return null;

  return (
    <section className="mx-auto max-w-5xl px-4 py-8 md:px-6">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/70 p-5 shadow-2xl shadow-black/20 md:p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Article Credits
            </p>
            <h2 className="mt-2 text-2xl font-black">People and organisations</h2>
          </div>
          <p className="text-sm text-gray-400">
            Linked to this news record
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {organisations.map((credit) => {
            const organisation = credit.organisations;
            const representative =
              credit.representative_name || organisation?.representative_name;
            const card = (
              <div className="flex h-full items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4">
                {organisation?.logo_url ? (
                  <img
                    src={organisation.logo_url}
                    alt={`${organisation.name} logo`}
                    className="h-14 w-14 shrink-0 rounded-xl border border-white/10 bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black text-sm font-black text-red-200">
                    {(organisation?.name ?? "OR").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">
                    {credit.role}
                  </p>
                  <p className="mt-1 truncate font-black text-white">
                    {organisation?.name ?? "Organisation"}
                  </p>
                  {representative && (
                    <p className="mt-1 truncate text-xs text-gray-400">
                      Representative: {representative}
                    </p>
                  )}
                </div>
              </div>
            );

            return organisation?.website_url ? (
              <a
                key={credit.id}
                href={organisation.website_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {card}
              </a>
            ) : (
              <div key={credit.id}>{card}</div>
            );
          })}

          {officials.map((credit) => {
            const player = credit.players;

            return (
              <div
                key={credit.id}
                className="flex h-full items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-red-500/30 bg-red-500/10">
                  {player?.profile_photo_url ? (
                    <Image
                      src={player.profile_photo_url}
                      alt={player.full_name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm font-black text-red-200">
                      {(player?.full_name ?? "P").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-red-300">
                    {credit.role}
                  </p>
                  <p className="mt-1 truncate font-black text-white">
                    {player?.full_name ?? "Official"}
                  </p>
                  {player?.title && (
                    <p className="mt-1 truncate text-xs text-gray-400">
                      {player.title}
                    </p>
                  )}
                  {credit.notes && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {credit.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

