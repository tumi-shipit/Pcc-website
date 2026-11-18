import Image from "next/image";
import { cdcOfficialAwardGroups } from "@/lib/cdcAwardOfficialWinners";

export default function CdcAwardOfficialsArchive() {
  return (
    <section id="awards-2026-officials" aria-labelledby="official-award-winners-heading" className="border-y border-[#d3ad47]/25 bg-[#0a2617]">
      <div className="mx-auto max-w-7xl px-5 py-16 md:px-10 md:py-24">
        <div className="max-w-3xl">
          <p className="cdc-eyebrow">Officials and Teams · 2026</p>
          <h2 id="official-award-winners-heading" className="mt-4 font-serif text-4xl font-semibold text-white md:text-6xl">
            Officials, teams and recognition
          </h2>
          <p className="mt-5 text-base leading-7 text-[#c1d0c0]">
            Recognising the people who serve chess, the teams that achieved, and those honoured for their contribution.
          </p>
        </div>

        <div className="mt-12 space-y-14 md:mt-16 md:space-y-20">
          {cdcOfficialAwardGroups.map((group) => (
            <section key={group.key} id={`2026-${group.key}`} aria-labelledby={`${group.key}-heading`} className="scroll-mt-28">
              <h3 id={`${group.key}-heading`} className="mb-6 border-b border-[#d3ad47]/25 pb-4 font-serif text-3xl font-semibold text-white md:text-4xl">
                {group.title}
              </h3>
              <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
                {group.recipients.map((recipient) => (
                  <li key={`${group.key}-${recipient.name}-${recipient.award}`}>
                    <article className="h-full overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-[#10311d] to-[#091d11] shadow-xl shadow-black/15">
                      {recipient.photo ? (
                        <div className="relative aspect-[4/5] overflow-hidden bg-[#0a2717]">
                          <Image
                            src={recipient.photo}
                            alt={recipient.representative
                              ? `${recipient.representative}, who collected the award for ${recipient.name}`
                              : `${recipient.name}, ${recipient.award} winner`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                            className="object-cover object-top transition duration-500 hover:scale-[1.025]"
                          />
                        </div>
                      ) : null}
                      <div className="p-4 sm:p-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.1em] text-[#e4c45e]">{recipient.award}</p>
                        <h4 className="mt-2 font-serif text-xl font-semibold leading-snug text-white">{recipient.name}</h4>
                        {recipient.representative && (
                          <p className="mt-2 text-xs leading-5 text-[#bdcbbd]">Collected by {recipient.representative}</p>
                        )}
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
