import Image from "next/image";
import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import CdcNominationForm from "@/components/CdcNominationForm";
import CdcNominationCountdown from "@/components/CdcNominationCountdown";
import CdcPublicNomineeList from "@/components/CdcPublicNomineeList";
import { cdcAwardGroups, cdcNominationEligibility } from "@/lib/cdcAwards";

export default function CdcExcellenceAwardsPage() {
  return (
    <PublicPageShell>
      <main className="cdc-awards min-h-screen bg-[#061b10] text-[#f7f4e9]">
        <section className="cdc-hero relative overflow-hidden border-b border-[#d3ad47]/30">
          <div aria-hidden="true" className="cdc-hero-glow" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-5 pb-16 pt-28 md:grid-cols-[1fr_320px] md:px-10 md:pb-24 md:pt-36">
            <div>
              <div className="flex items-center gap-3">
                <span className="h-px w-10 bg-[#e4c45e]" />
                <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#e4c45e]">
                  Capricorn District Chess
                </p>
              </div>
              <h1 className="mt-6 max-w-3xl font-serif text-5xl font-semibold leading-[0.98] tracking-[-0.035em] text-white md:text-7xl">
                2nd CDC Excellence <span className="text-[#e5c560]">Awards</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d4dfd4]">
                Honouring the dedication, leadership and achievements that move chess
                forward across Capricorn District.
              </p>
              <div className="mt-9 flex flex-wrap gap-3">
                <a href="#nominate" className="cdc-gold-button">Nominee acceptance</a>
                <Link href="/cdc-excellence-awards/vote" className="cdc-outline-button">Verify email for voting</Link>
                <a href="#categories" className="cdc-outline-button">Explore the awards</a>
              </div>
              <p className="mt-5 text-sm text-[#c1cfbf]">
                Presented by Capricorn District Chess with support from Polokwane Chess Club.
              </p>
            </div>

            <div className="mx-auto w-full max-w-[270px] rounded-full border border-[#dfbd58]/40 bg-[#082616]/70 p-3 shadow-[0_0_80px_rgba(197,156,50,0.15)]">
              <div className="rounded-full border border-[#dfbd58]/30 bg-[#f7f4e9] p-5">
                <Image
                  src="/images/organisations/capricorn-district-chess.png"
                  alt="Capricorn District Chess crest"
                  width={500}
                  height={500}
                  priority
                  className="h-auto w-full rounded-full"
                />
              </div>
              <p className="pb-2 pt-4 text-center text-xs font-bold uppercase tracking-[0.25em] text-[#e4c45e]">
                Excellence • Dedication • Chess
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-7xl gap-4 px-5 py-8 md:grid-cols-3 md:px-10">
          <EventFact label="Awards evening" value="14 November 2026" />
          <EventFact label="Venue" value="Northern Academy Secondary School" />
          <EventFact label="Time" value="17:00" />
        </section>

        <section className="mx-auto max-w-7xl px-5 pb-14 pt-8 md:px-10 md:pb-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="cdc-eyebrow">The honours</p>
              <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">2026 Award Categories</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-[#bfccbf]">
              There are 26 unique awards. Nominations for seven service awards are now closed;
              the other awards will be determined from yearly results and records.
            </p>
          </div>

          <div id="categories" className="grid gap-5 lg:grid-cols-2">
            {cdcAwardGroups.map((group, groupIndex) => (
              <section key={group.title} className={`cdc-category-panel ${group.mode === "nominations" ? "cdc-category-featured" : ""}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="cdc-panel-index">0{groupIndex + 1}</p>
                    <h3 className="mt-2 font-serif text-2xl font-semibold">{group.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#bdcbbd]">{group.description}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${group.mode === "nominations" ? "bg-[#dfbd58] text-[#17210f]" : "border border-white/15 text-[#d7ded3]"}`}>
                    {group.mode === "nominations" ? "Nominations closed" : "2026 results"}
                  </span>
                </div>
                <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                  {group.categories.map((category) => (
                    <li key={category} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-black/15 px-3.5 py-3 text-sm leading-5 text-[#f3f1e8]">
                      <span aria-hidden="true" className="mt-0.5 text-[#dfbd58]">✦</span>
                      <span>{category}</span>
                    </li>
                  ))}
                </ul>
                {group.mode === "nominations" && (
                  <div className="mt-5 border-t border-white/10 pt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#dfbd58]">Who can be nominated</p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-[#cbd5c9]">
                      {group.categories.map((category) => (
                        <li key={category}><strong className="font-semibold text-white">{category}:</strong> {cdcNominationEligibility[category as keyof typeof cdcNominationEligibility]}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            ))}
          </div>
        </section>

        <section id="nominate" className="border-y border-[#d3ad47]/25 bg-[#0a2617]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 md:grid-cols-[0.8fr_1.2fr] md:px-10 md:py-20">
            <div className="max-w-lg">
              <p className="cdc-eyebrow">Nominations closed · Acceptance underway</p>
              <h2 className="mt-4 font-serif text-4xl font-semibold leading-tight">Nominees: confirm your place.</h2>
              <p className="mt-5 leading-7 text-[#c1d0c0]">
                Nominations are closed. Approved nominees will receive a private link to
                accept or decline every category in which they were nominated. Responses
                close at midnight tonight, 00:00 on Thursday, 22 October 2026 (South African time).
              </p>
              <CdcNominationCountdown />
              <div className="mt-8 rounded-2xl border border-[#d8b64e]/25 bg-[#071b11] p-5">
                <p className="text-sm font-bold text-[#e4c45e]">What happens next?</p>
                <p className="mt-2 text-sm leading-6 text-[#c1d0c0]">
                  Only nominees on the approved shortlist who accept will be published.
                  Voting opens as soon as every approved nominee has accepted or declined;
                  if responses remain pending, the ballot opens when the response period ends.
                  Any verified email
                  may submit one vote in each available category; the voting closing date
                  will be announced separately.
                </p>
              </div>
              <p className="mt-6 text-xs leading-5 text-[#9faf9f]">
                By submitting, you confirm that the nominee meets the category criteria.
                Contact details are collected for award administration and are not shown publicly.
              </p>
            </div>
            <CdcNominationForm />
          </div>
        </section>

        <CdcPublicNomineeList />

        <footer className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-[#9faf9f] sm:flex-row sm:items-center sm:justify-between md:px-10">
          <p>2nd Capricorn District Chess Excellence Awards · 2026</p>
          <Link href="/" className="font-semibold text-[#d9bd69] hover:text-white">Polokwane Chess Club</Link>
        </footer>
      </main>
    </PublicPageShell>
  );
}

function EventFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="cdc-event-fact">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8bb59]">{label}</p>
      <p className="mt-2 text-lg font-semibold leading-6 text-white">{value}</p>
    </div>
  );
}
