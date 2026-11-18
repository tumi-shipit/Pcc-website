import Image from "next/image";
import { cdcAwardWinnerGroups, winnerPlace, winnerPrimaryAwardLabel, winnerSpecialAwardLabel } from "@/lib/cdcAwardWinners";

function AgeGroup({ group, index }: { group: (typeof cdcAwardWinnerGroups)[number]; index: number }) {
  return (
    <section id={group.key} aria-labelledby={`${group.key}-heading`} className="scroll-mt-28">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[#d3ad47]/25 pb-4">
        <div>
          <p className="cdc-eyebrow">Age group 0{index + 1}</p>
          <h3 id={`${group.key}-heading`} className="mt-2 font-serif text-3xl font-semibold text-white md:text-4xl">{group.label}</h3>
        </div>
        <p className="text-sm text-[#bdcbbd]">{group.winners.length} players</p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {group.winners.map((winner) => (
          <li key={`${group.key}-${winner.name}`}>
            <article className="h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#10311d] to-[#091d11] shadow-xl shadow-black/15">
              {winner.photo ? (
                <div className="relative aspect-[4/5] overflow-hidden bg-[#0a2717]">
                  <Image
                    src={winner.photo}
                    alt={`${winner.name}, ${group.label} player award winner`}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover object-top transition duration-500 hover:scale-[1.025]"
                  />
                  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/50 to-transparent" aria-hidden="true" />
                </div>
              ) : (
                <div className="flex aspect-[4/5] flex-col items-center justify-center gap-3 bg-[radial-gradient(ellipse_at_center,#194a2b,#0a2717)] px-3 text-center">
                  <span aria-hidden="true" className="text-4xl">💛</span>
                  <p className="max-w-[12rem] text-sm font-medium leading-5 text-[#e5dfc5]">We missed you at the awards.</p>
                </div>
              )}
              <div className="p-3 sm:p-5">
                <div className="flex flex-wrap gap-2">
                  {winnerPlace(winner) !== null ? (
                    <span className="rounded-full border border-[#dfbd58]/25 bg-[#dfbd58]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-[#e4c45e] sm:text-[10px]">
                      {winnerPrimaryAwardLabel(winner)}
                    </span>
                  ) : null}
                  {winner.awards.map(winnerSpecialAwardLabel).filter((label) => label !== null).map((label) => (
                    <span key={label} className="rounded-full border border-[#dfbd58]/25 bg-[#dfbd58]/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.06em] text-[#e4c45e] sm:text-[10px]">{label}</span>
                  ))}
                </div>
                <p className="mt-2 break-words font-serif text-base font-semibold leading-snug text-white sm:text-xl">{winner.name}</p>
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function CdcAwardWinnersArchive() {
  const [under8, ...otherAgeGroups] = cdcAwardWinnerGroups;

  return (
    <section id="awards-2026-winners" aria-labelledby="cdc-2026-winners-heading" className="border-y border-[#d3ad47]/25 bg-[#081f12]">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
        <div className="max-w-3xl">
          <p className="cdc-eyebrow">Player Awards · 2026</p>
          <h2 id="cdc-2026-winners-heading" className="mt-4 font-serif text-4xl font-semibold text-white md:text-6xl">2026 CDC Excellence Winners</h2>
        </div>

        <div className="mt-12 space-y-14 md:mt-16 md:space-y-20">
          <AgeGroup group={under8} index={0} />
          <details className="group rounded-2xl border border-[#d3ad47]/30 bg-black/10 p-4 sm:p-6">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-serif text-xl font-semibold text-white marker:hidden sm:text-2xl">
              <span>Explore all age groups</span>
              <span aria-hidden="true" className="text-2xl text-[#e4c45e] transition group-open:rotate-45">+</span>
            </summary>
            <nav aria-label="Jump to an age group" className="mt-5 flex flex-wrap gap-2">
              {otherAgeGroups.map((group) => (
                <a key={group.key} href={`#${group.key}`} className="cdc-outline-button !min-h-10 !px-4 !py-2 !text-xs">{group.label}</a>
              ))}
            </nav>
            <div className="mt-10 space-y-14 md:space-y-20">
              {otherAgeGroups.map((group, index) => <AgeGroup key={group.key} group={group} index={index + 1} />)}
            </div>
          </details>
        </div>
      </div>
    </section>
  );
}
