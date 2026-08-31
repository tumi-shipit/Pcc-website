import Link from "next/link";
import Navbar from "@/components/Navbar";

const platformSteps = [
  {
    number: "01",
    title: "Create the event",
    text: "An authorised organiser creates one event with its venue, dates, sections, fees, programme and public information.",
  },
  {
    number: "02",
    title: "Open one official hub",
    text: "Players, parents, schools, clubs and officials use the same public event page for entries, directions, updates and documents.",
  },
  {
    number: "03",
    title: "Run the event clearly",
    text: "Organisers manage entries, payments, capacity, officials, live notices and standings from a focused admin workflow.",
  },
  {
    number: "04",
    title: "Keep the record",
    text: "Results, reports, photos and verified records remain accessible as a useful archive after the final round.",
  },
];

const audiences = [
  ["PCC club events", "Keep PCC activity organised, visible and owned by the club."],
  ["Schools and districts", "Give parents, coaches and teams one dependable entry and information point."],
  ["Provinces and organisations", "Provide scoped organiser access without surrendering PCC’s platform ownership."],
  ["National events", "Use the same dependable workflow at larger scale, without creating a separate special system."],
];

export default function PlatformPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-950 pt-24 text-white">
        <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.26),_transparent_42%)]">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-red-400">
              Polokwane Chess Club platform
            </p>
            <h1 className="mt-5 max-w-5xl text-4xl font-black leading-tight md:text-6xl">
              A club-owned chess platform built to serve the whole structure.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-gray-300 md:text-xl">
              PCC keeps its roots as a club asset while giving every authorised
              event—club, district, provincial, organisational or national—the
              same clear operational standard.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/tournaments" className="rounded-xl bg-red-600 px-6 py-3 text-sm font-black transition hover:bg-red-700">
                Explore event hubs
              </Link>
              <Link href="/register" className="rounded-xl border border-white/15 px-6 py-3 text-sm font-black transition hover:border-red-400">
                See player entry flow
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                The principle
              </p>
              <h2 className="mt-4 text-3xl font-black md:text-5xl">
                Club-first. Structure-capable.
              </h2>
              <p className="mt-5 text-sm leading-7 text-gray-400 md:text-base">
                PCC does not build a different website for every important event.
                It builds one dependable system with equal-quality public hubs and
                responsible organiser access. That protects club ownership while
                making collaboration practical.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {audiences.map(([title, text]) => (
                <article key={title} className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
                  <h3 className="font-black text-white">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-white/10 bg-zinc-900/50">
          <div className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              One standard workflow
            </p>
            <h2 className="mt-4 text-3xl font-black md:text-5xl">
              From announcement to permanent record
            </h2>
            <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {platformSteps.map((step) => (
                <article key={step.number} className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
                  <p className="text-sm font-black text-red-400">{step.number}</p>
                  <h3 className="mt-4 text-xl font-black">{step.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-gray-400">{step.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16 text-center md:px-6 md:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            PCC commitment
          </p>
          <h2 className="mt-4 text-3xl font-black md:text-5xl">
            Better service without losing the club’s identity.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-gray-400 md:text-base">
            The platform stays visibly PCC: locally accountable, carefully managed
            and built to preserve the history, people and development work behind
            every event it supports.
          </p>
        </section>
      </main>
    </>
  );
}
