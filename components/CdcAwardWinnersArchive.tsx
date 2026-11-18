import Image from "next/image";
import { cdcAwardWinnerGroups, winnerPlace, winnerSpecialAwardLabel } from "@/lib/cdcAwardWinners";

function ordinal(place: number) {
  if (place % 100 >= 11 && place % 100 <= 13) return `${place}th`;
  if (place % 10 === 1) return `${place}st`;
  if (place % 10 === 2) return `${place}nd`;
  if (place % 10 === 3) return `${place}rd`;
  return `${place}th`;
}

export default function CdcAwardWinnersArchive() {
  return (
    <section id="awards-2026-winners" aria-labelledby="young-award-recipients-heading" className="border-y border-[#d3ad47]/25 bg-[#081f12]">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
        <div className="max-w-3xl">
          <p className="cdc-eyebrow">2026 · 2nd awards</p>
          <h2 id="young-award-recipients-heading" className="mt-4 font-serif text-4xl font-semibold text-white md:text-6xl">
            Young award recipients
          </h2>
          <p className="mt-5 text-base leading-7 text-[#c1d0c0]">
            Recipients are ranked by their award placement within each age group. The player distinction is labelled consistently across all age groups, and tied places remain tied.
          </p>
        </div>

        <nav aria-label="Jump to an age group" className="mt-8 flex flex-wrap gap-2">
          {cdcAwardWinnerGroups.map((group) => (
            <a key={group.key} href={`#${group.key}`} className="cdc-outline-button !min-h-10 !px-4 !py-2 !text-xs">
              {group.label}
            </a>
          ))}
        </nav>

        <div className="mt-12 space-y-14 md:mt-16 md:space-y-20">
          {cdcAwardWinnerGroups.map((group, groupIndex) => (
            <section key={group.key} id={group.key} aria-labelledby={`${group.key}-heading`} className="scroll-mt-28">
              <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#d3ad47]/25 pb-4">
                <div>
                  <p className="cdc-eyebrow">Age group 0{groupIndex + 1}</p>
                  <h3 id={`${group.key}-heading`} className="mt-2 font-serif text-3xl font-semibold text-white md:text-4xl">
                    {group.label}
                  </h3>
                </div>
                <p className="text-sm text-[#bdcbbd]">{group.winners.length} recipients</p>
              </div>

              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.winners.map((winner) => (
                  <li key={`${group.key}-${winner.name}`}>
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
                          {winnerPlace(winner) !== null ? (
                            <span className="rounded-full border border-[#dfbd58]/25 bg-[#dfbd58]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#e4c45e]">
                              {ordinal(winnerPlace(winner)!)} Place · Outstanding Player of the Year
                            </span>
                          ) : null}
                          {winner.awards.map(winnerSpecialAwardLabel).filter((label) => label !== null).map((label) => (
                            <span key={label} className="rounded-full border border-[#dfbd58]/25 bg-[#dfbd58]/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-[#e4c45e]">
                              {label}
                            </span>
                          ))}
                        </div>
                        <p className="mt-2 font-serif text-xl font-semibold leading-snug text-white">{winner.name}</p>
                      </div>
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </section>
  );
}
