import Link from "next/link";
import Navbar from "@/components/Navbar";

const platformSteps = [
  {
    number: "01",
    title: "Create the event",
    text: "Add the dates, venue, sections, fees and information players need.",
  },
  {
    number: "02",
    title: "Publish the event page",
    text: "Players and teams use one page for registration, directions, documents and updates.",
  },
  {
    number: "03",
    title: "Manage the entries",
    text: "The assigned organiser can review entries, payments, sections and event notices.",
  },
  {
    number: "04",
    title: "Publish the results",
    text: "After the event, the page can show results, reports and a link to the photo album.",
  },
];

const audiences = [
  ["Individuals", "Enter an available tournament online."],
  ["Schools and organisations", "Collect entries for school, club or organisational events."],
  ["Districts and provinces", "Use the same registration process for larger regional events."],
  ["National federations", "List sections and accept entries for national events."],
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
              Tournament registration from Polokwane to national events.
            </h1>
            <p className="mt-6 max-w-3xl text-base leading-8 text-gray-300 md:text-xl">
              This is Polokwane Chess Club&apos;s registration service. It can be
              used by individuals, schools, organisations, districts, provinces
              and national federations for approved chess events.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/tournaments" className="rounded-xl bg-red-600 px-6 py-3 text-sm font-black transition hover:bg-red-700">
                View tournaments
              </Link>
              <Link href="/register" className="rounded-xl border border-white/15 px-6 py-3 text-sm font-black transition hover:border-red-400">
                Register for an event
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-16 md:px-6 md:py-24">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Who it serves
              </p>
              <h2 className="mt-4 text-3xl font-black md:text-5xl">
                Based in Polokwane, available beyond the city.
              </h2>
              <p className="mt-5 text-sm leading-7 text-gray-400 md:text-base">
                Polokwane Chess Club is a city-based chess club. Its website also
                gives approved organisers outside the city a practical way to
                publish an event and receive online registrations.
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
              How registration works
            </p>
            <h2 className="mt-4 text-3xl font-black md:text-5xl">
              From event listing to published results
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
            About the service
          </p>
          <h2 className="mt-4 text-3xl font-black md:text-5xl">
            Operated by Polokwane Chess Club.
          </h2>
          <p className="mx-auto mt-5 max-w-3xl text-sm leading-7 text-gray-400 md:text-base">
            PCC controls access to the system. Organisers receive access only to
            the tournaments assigned to them, while players and the public use the
            event pages without needing admin access.
          </p>
        </section>
      </main>
    </>
  );
}
