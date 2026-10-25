"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import { supabase } from "@/lib/supabase";
import { cdcServiceAwardCategories } from "@/lib/cdcAwards";
import { cdcAwardsNewsItem } from "@/lib/cdcAwardsNews";

type Article = {
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  published: boolean;
};

const fallbackArticle: Article = {
  title: cdcAwardsNewsItem.title,
  excerpt: cdcAwardsNewsItem.excerpt,
  content: cdcAwardsNewsItem.content,
  image_url: cdcAwardsNewsItem.image_url,
  published: true,
};

export default function CdcAwardsNewsArticle() {
  const [article, setArticle] = useState(fallbackArticle);
  const [unpublished, setUnpublished] = useState(false);

  useEffect(() => {
    async function loadArticle() {
      const { data } = await supabase
        .from("news_posts")
        .select("title, excerpt, content, image_url, published")
        .eq("id", cdcAwardsNewsItem.id)
        .maybeSingle();
      if (!data) return;
      if (!data.published) {
        setUnpublished(true);
        return;
      }
      setArticle({
        title: data.title ?? fallbackArticle.title,
        excerpt: data.excerpt ?? fallbackArticle.excerpt,
        content: data.content ?? fallbackArticle.content,
        image_url: data.image_url ?? fallbackArticle.image_url,
        published: data.published,
      });
    }
    void loadArticle();
  }, []);

  return (
    <PublicPageShell>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <article className="mx-auto max-w-5xl">
          <Link href="/news" className="text-sm font-semibold text-red-300 hover:text-white">← All news</Link>
          {unpublished ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-300">This announcement is not currently published.</p>
          ) : (
            <div className="mt-6 overflow-hidden rounded-3xl border border-amber-200/20 bg-[#071b10]">
              <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
                <div className="relative flex min-h-72 items-center justify-center bg-[radial-gradient(ellipse_at_center,#14532d,#04170c)] p-10 md:min-h-[420px]">
                  <div className="absolute inset-4 rounded-[2rem] border border-amber-200/20" />
                  <Image src={article.image_url} alt="Capricorn District Chess awards" width={500} height={500} priority className="relative max-h-72 w-auto max-w-full rounded-2xl object-contain shadow-2xl shadow-black/50 md:max-h-80" />
                </div>
                <div className="flex flex-col justify-center p-6 md:p-10">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Awards announcement · 20 October 2026</p>
                  <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">{article.title}</h1>
                  <p className="mt-5 whitespace-pre-line leading-7 text-zinc-300">{article.excerpt}</p>
                  <Link href="/cdc-excellence-awards" className="mt-7 inline-flex w-fit rounded-xl bg-amber-300 px-6 py-3 font-bold text-emerald-950 transition hover:bg-amber-200">View the awards</Link>
                </div>
              </div>
              <div className="grid gap-8 border-t border-white/10 p-6 md:grid-cols-[1fr_0.8fr] md:p-10">
                <div>
                  <h2 className="text-2xl font-black">About the awards</h2>
                  <div className="mt-3 space-y-4 leading-7 text-zinc-300">
                    {article.content.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                  </div>
                  <h3 className="mt-7 text-lg font-black">Nomination categories</h3>
                  <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                    {cdcServiceAwardCategories.map((category) => <li key={category} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-100">{category}</li>)}
                  </ul>
                </div>
                <aside className="h-fit rounded-2xl border border-amber-200/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-300">Awards evening</p>
                  <p className="mt-3 text-xl font-black">14 November 2026</p>
                  <p className="mt-1 text-zinc-300">17:00</p>
                  <p className="mt-4 border-t border-white/10 pt-4 text-sm leading-6 text-zinc-300">Northern Academy Secondary School</p>
                  <Link href="/cdc-excellence-awards#categories" className="mt-5 inline-flex text-sm font-bold text-amber-200 hover:text-white">See all award categories →</Link>
                </aside>
              </div>
            </div>
          )}
        </article>
      </main>
    </PublicPageShell>
  );
}
