import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import { cdcServiceAwardCategories } from "@/lib/cdcAwards";

export const metadata: Metadata = {
  title: "Nominate for the 2nd CDC Excellence Awards",
  description:
    "Nominations are open for the 2nd Capricorn District Chess Excellence Awards. Nominate a chess contributor by 23 October 2026.",
  openGraph: {
    title: "Nominate for the 2nd CDC Excellence Awards",
    description:
      "Nominations are open for the 2nd Capricorn District Chess Excellence Awards. Nominate a chess contributor by 23 October 2026.",
    type: "article",
    images: [
      {
        url: "/images/organisations/capricorn-district-chess.png",
        width: 500,
        height: 500,
        alt: "Capricorn District Chess crest",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Nominate for the 2nd CDC Excellence Awards",
    description:
      "Nominations are open for the 2nd Capricorn District Chess Excellence Awards. Nominate a chess contributor by 23 October 2026.",
    images: ["/images/organisations/capricorn-district-chess.png"],
  },
};

export default function CdcAwardsNewsArticle() {
  return (
    <PublicPageShell>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <article className="mx-auto max-w-5xl">
          <Link href="/news" className="text-sm font-semibold text-red-300 hover:text-white">← All news</Link>
          <div className="mt-6 overflow-hidden rounded-3xl border border-amber-200/20 bg-[#071b10]">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="relative flex min-h-72 items-center justify-center bg-[radial-gradient(ellipse_at_center,#14532d,#04170c)] p-10 md:min-h-[420px]">
                <div className="absolute inset-4 rounded-[2rem] border border-amber-200/20" />
                <Image
                  src="/images/organisations/capricorn-district-chess.png"
                  alt="Capricorn District Chess crest"
                  width={500}
                  height={500}
                  priority
                  className="relative w-56 rounded-full border-4 border-amber-200/50 bg-white shadow-2xl shadow-black/50 md:w-72"
                />
              </div>
              <div className="flex flex-col justify-center p-6 md:p-10">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Awards announcement · 20 October 2026</p>
                <h1 className="mt-4 text-3xl font-black leading-tight md:text-5xl">Nominate a contributor for the 2nd CDC Excellence Awards</h1>
                <p className="mt-5 leading-7 text-zinc-300">
                  Capricorn District Chess is celebrating the people who help chess thrive across the district. Polokwane Chess Club is proud to support CDC and invite the chess community to recognise their coaches, arbiters, organisers, administrators and team managers.
                </p>
                <Link href="/cdc-excellence-awards" className="mt-7 inline-flex w-fit rounded-xl bg-amber-300 px-6 py-3 font-bold text-emerald-950 transition hover:bg-amber-200">
                  Make a nomination
                </Link>
              </div>
            </div>

            <div className="grid gap-8 border-t border-white/10 p-6 md:grid-cols-[1fr_0.8fr] md:p-10">
              <div>
                <h2 className="text-2xl font-black">Nominations are open</h2>
                <p className="mt-3 leading-7 text-zinc-300">
                  Send in your nomination by Friday, 23 October 2026. The nominee list will be published on 24 and 25 October so the community can review the candidates. Public voting begins Monday, 26 October; its closing date will be announced when voting opens.
                </p>
                <p className="mt-4 leading-7 text-zinc-300">
                  Each nomination includes the nominee’s name, category, school or club, and your contact details. You’ll confirm that the nominee meets the criteria for the selected award.
                </p>
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {cdcServiceAwardCategories.map((category) => (
                    <li key={category} className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold text-zinc-100">{category}</li>
                  ))}
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
        </article>
      </main>
    </PublicPageShell>
  );
}
