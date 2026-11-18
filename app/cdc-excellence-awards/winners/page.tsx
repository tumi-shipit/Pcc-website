import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import { cdcAwardWinnerGroups, winnerAwardLabel } from "@/lib/cdcAwardWinners";

export const metadata: Metadata = {
  title: "2026 Young Player Award Recipients | CDC Excellence Awards",
  description:
    "Meet the young chess players recognised at the 2nd Capricorn District Chess Excellence Awards, from Under 8 through Under 20.",
  openGraph: {
    title: "2026 Young Player Award Recipients | CDC Excellence Awards",
    description:
      "Celebrating the young chess players recognised across seven age groups at the 2nd CDC Excellence Awards.",
    images: ["/images/organisations/capricorn-district-chess.png"],
    type: "website",
  },
};

export default function CdcAwardWinnersPage() {
  return (
    <PublicPageShell>
      <main className="cdc-awards min-h-screen overflow-hidden bg-[#061b10] text-[#f7f4e9]">
        <section className="cdc-hero relative border-b border-[#d3ad47]/30">
          <div aria-hidden="true" className="cdc-hero-glow" />
          <div className="relative mx-auto max-w-7xl px-5 pb-14 pt-28 md:px-10 md:pb-20 md:pt-36">
            <Link href="/cdc-excellence-awards" className="text-sm font-semibold text-[#f0d783] hover:text-white">
              ← 2nd CDC Excellence Awards
            </Link>
            <p className="mt-9 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.32em] text-[#e4c45e]">
              <span className="h-px w-12 bg-current" /> Capricorn District Chess · 2026
            </p>
            <h1 className="mt-6 max-w-4xl font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.04em] text-white md:text-7xl">
              Young players, <span className="text-[#e5c560]">honoured.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d4dfd4]">
              Celebrating the young chess players recognised at the 2nd Capricorn District Chess Excellence Awards, across Under 8 to Under 20.
            </p>
            <nav aria-label="Jump to age group" className="mt-9 flex flex-wrap gap-2">
              {cdcAwardWinnerGroups.map((group) => (
                <a key={group.key} href={`#${group.key}`} className="cdc-outline-button !min-h-10 !px-4 !py-2 !text-xs">
                  {group.label}
                </a>
              ))}
            </nav>
          </div>
        </section>

        <div className="mx-auto max-w-7xl px-5 py-8 md:px-10 md:py-12">
          <div className="mb-10 rounded-2xl border border-[#d3ad47]/25 bg-[#0a2617] p-5 sm:p-6">
            <p className="cdc-eyebrow">The young award recipients</p>
            <p className="mt-2 text-sm leading-6 text-[#c1d0c0]">
              Each recipient is shown with the distinction recorded for their award. Where no photograph is available, their name can be displayed on its own.
            </p>
          </div>

          <div className="space-y-14 md:space-y-20">
            {cdcAwardWinnerGroups.map((group, groupIndex) => (
              <section key={group.key} id={group.key} aria-labelledby={`${group.key}-heading`} className="scroll-mt-28">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#d3ad47]/25 pb-4">
                  <div>
                    <p className="cdc-eyebrow">Age group 0{groupIndex + 1}</p>
                    <h2 id={`${group.key}-heading`} className="mt-2 font-serif text-3xl font-semibold text-white md:text-4xl">
                      {group.label}
                    </h2>
                  </div>
                  <p className="text-sm text-[#bdcbbd]">{group.winners.length} recipients listed</p>
                </div>

                {group.winners.length ? (
                  <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {group.winners.map((winner) => (
                      <li key={`${group.key}-${winner.name}-${winner.awards.join("-")}`}>
                        <article className="h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#10311d] to-[#091d11] shadow-xl shadow-black/15">
                          {winner.photo ? (
                            <div className="relative aspect-[4/5] overflow-hidden bg-[#0a2717]">
                              <Image
                                src={winner.photo}
                                alt={`${winner.name}, ${group.label} award recipient`}
                                fill
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                                className="object-cover object-top transition duration-500 hover:scale-[1.025]"
                              />
                              <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
                            </div>
                          ) : null}
                          <div className="p-4 sm:p-5">
                            <div className="flex flex-wrap gap-2">
                              {winner.awards.map((award) => (
                                <span key={award} className="rounded-full border border-[#dfbd58]/25 bg-[#dfbd58]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#e4c45e]">
                                  {winnerAwardLabel(award)}
                                </span>
                              ))}
                            </div>
                            <h3 className="mt-2 font-serif text-xl font-semibold leading-snug text-white">{winner.name}</h3>
                          </div>
                        </article>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="rounded-2xl border border-dashed border-white/15 px-5 py-8 text-sm text-[#bdcbbd]">
                    Recipient names for this age group will be added here.
                  </p>
                )}
              </section>
            ))}
          </div>

          <div className="mt-16 border-t border-white/10 pt-8 text-center">
            <Link href="/cdc-excellence-awards" className="cdc-gold-button">Back to the awards page</Link>
          </div>
        </div>
      </main>
    </PublicPageShell>
  );
}
