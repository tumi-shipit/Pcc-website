import Image from "next/image";
import Link from "next/link";
import GambitBaseTournaments from "@/components/gambitbase/GambitBaseTournaments";
import GambitBaseShell from "@/components/gambitbase/GambitBaseShell";

const features = [
  {
    number: "01",
    title: "Find your next event",
    description:
      "Browse published chess tournaments and check dates, venues, sections and entry details.",
  },
  {
    number: "02",
    title: "Register in one place",
    description:
      "Use the online registration flow to enter an event and follow its entry requirements.",
  },
  {
    number: "03",
    title: "Stay up to date",
    description:
      "Return to the event page for tournament information, updates and published results.",
  },
];

export default function GambitBasePage() {
  return (
    <GambitBaseShell>
      <main className="min-h-screen overflow-hidden bg-[#f6f3eb] text-[#142239]">
      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-12 md:grid-cols-[1.08fr_0.92fr] md:px-8 md:py-20">
          <div className="max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.28em] text-[#a87517]">Your chess calendar</p>
            <h1 className="mt-5 font-serif text-5xl font-semibold leading-[1.02] tracking-tight md:text-7xl">
              Every event has a next move.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#536176] md:text-lg">
              Find your next tournament, see what you need to enter, and keep the event details in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/gambitbase/tournaments" className="rounded-full bg-[#142239] px-6 py-3.5 text-sm font-bold text-white transition hover:bg-[#263c5c]">Explore the calendar <span aria-hidden="true">→</span></Link>
              <Link href="/gambitbase/register" className="rounded-full border border-[#b8ad98] px-6 py-3.5 text-sm font-bold text-[#142239] transition hover:border-[#a87517] hover:bg-white">Enter a tournament</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-[#d9d3c6] pt-5 text-xs font-semibold uppercase tracking-[0.12em] text-[#6f7885]">
              <span>Find an event</span><span>Check entry details</span><span>Play your next round</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute -right-3 -top-3 h-full w-full rounded-[2rem] border border-[#c89a42]/50" />
            <div className="relative overflow-hidden rounded-[1.8rem] bg-white p-4 shadow-[0_28px_80px_rgba(20,34,57,0.16)]">
            <Image
              src="/images/gambitbase-logo.jpeg"
              alt="GambitBase chess knight mark in navy and gold"
              width={1536}
              height={1024}
              priority
              className="h-auto w-full rounded-[1.3rem]"
            />
            </div>
            <p className="absolute -bottom-5 left-6 rounded-full border border-[#e3ddcf] bg-[#f6f3eb] px-4 py-2 text-xs font-bold text-[#445168] shadow-lg">A clearer way to find your next event</p>
          </div>
      </section>

      <GambitBaseTournaments mode="preview" />

      <section id="how-it-works" className="border-t border-[#dfd9cc] bg-[#eee9de] px-5 py-16 md:px-8 md:py-20">
        <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 md:grid-cols-[0.7fr_1.3fr] md:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.26em] text-[#a87517]">From listing to leaderboard</p>
            <h2 className="mt-4 max-w-lg font-serif text-4xl font-semibold leading-tight md:text-5xl">The event, without the guesswork.</h2>
          </div>
          <p className="max-w-2xl text-sm leading-7 text-[#536176] md:justify-self-end md:text-base">Clear dates, venues, sections and entry status help players and teams know what to do next.</p>
        </div>
        <div className="mt-10 grid gap-0 border-y border-[#d2cabb] md:grid-cols-3">
          {features.map((feature) => (
            <article
              key={feature.number}
              className="border-b border-[#d2cabb] py-6 md:border-b-0 md:border-r md:px-7 md:py-8 last:border-0 first:pl-0"
            >
              <span className="text-xs font-black tracking-[0.2em] text-[#a87517]">
                {feature.number}
              </span>
              <h3 className="mt-4 font-serif text-2xl font-semibold">{feature.title}</h3>
              <p className="mt-3 max-w-sm text-sm leading-7 text-[#536176]">
                {feature.description}
              </p>
            </article>
          ))}
        </div>
        </div>
      </section>
      </main>
    </GambitBaseShell>
  );
}
