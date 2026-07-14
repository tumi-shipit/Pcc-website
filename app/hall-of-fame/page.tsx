import Image from "next/image";
import Link from "next/link";

type Inductee = {
  name: string;
  title: string;
  subtitle: string;
  image: string;
  href: string;
  badge: string;
  summary: string;
  pillars: string[];
};

const inductees: Inductee[] = [
  {
    name: "Mahlodi Joe Mahomole",
    title: "Founding Inductee",
    subtitle:
      "Former Chess South Africa President - Former FIDE Zone 4.5 President - FIDE Arbiter",
    image: "/images/leaders/joe.jpeg",
    href: "/hall-of-fame/joe-mahomole",
    badge: "Inductee No. 1",
    summary:
      "Honoured for decades of leadership, administration, arbitration, coaching and youth chess development in Limpopo, South Africa and Southern Africa.",
    pillars: ["Leadership", "Administration", "Arbitration", "Youth development"],
  },
];

const principles = [
  "Service that shaped chess beyond one event or season.",
  "Leadership that strengthened clubs, districts, provinces or national chess.",
  "Work that future players and organisers can learn from.",
];

const legacyPath = [
  {
    label: "Record",
    text: "Collect names, service history, photos and verified achievements.",
  },
  {
    label: "Preserve",
    text: "Keep long-form profiles that future players and organisers can read.",
  },
  {
    label: "Inspire",
    text: "Show young players that chess service matters beyond trophies.",
  },
];

export default function HallOfFamePage() {
  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:px-6 md:py-24 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400 md:text-sm">
              PCC Hall of Fame
            </p>
            <h1 className="mt-5 text-4xl font-black leading-tight md:text-7xl">
              The people who built the game
            </h1>
            <p className="mt-6 max-w-3xl text-sm leading-7 text-gray-300 md:text-lg md:leading-8">
              A permanent record honouring people whose leadership, service and
              sacrifice helped shape Polokwane Chess Club, Limpopo chess and the
              wider South African chess community.
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900 p-5">
            <h2 className="text-xl font-black">Why it matters</h2>
            <div className="mt-4 space-y-3">
              {principles.map((principle) => (
                <p
                  key={principle}
                  className="rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm leading-6 text-gray-300"
                >
                  {principle}
                </p>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-20">
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Founding Legacy
            </p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">
              First Inductee
            </h2>
          </div>

          <Link
            href="/"
            className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
          >
            Back to PCC
          </Link>
        </div>

        <div className="grid gap-8">
          {inductees.map((inductee) => (
            <article
              key={inductee.name}
              className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
            >
              <div className="grid lg:grid-cols-[400px_1fr]">
                <Link
                  href={inductee.href}
                  className="relative block aspect-[4/5] overflow-hidden bg-black lg:aspect-auto lg:min-h-[520px]"
                >
                  <Image
                    src={inductee.image}
                    alt={inductee.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 400px"
                    className="object-cover object-top transition duration-700 hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <span className="absolute left-5 top-5 rounded-full bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white">
                    {inductee.badge}
                  </span>
                </Link>

                <div className="flex flex-col justify-center p-6 md:p-10">
                  <p className="text-sm font-bold uppercase tracking-[0.3em] text-red-400">
                    {inductee.title}
                  </p>
                  <h3 className="mt-4 text-3xl font-black leading-tight md:text-6xl">
                    {inductee.name}
                  </h3>
                  <p className="mt-5 max-w-3xl text-base font-semibold leading-7 text-red-200 md:text-xl md:leading-8">
                    {inductee.subtitle}
                  </p>
                  <p className="mt-6 max-w-3xl text-sm leading-7 text-gray-400 md:text-base md:leading-8">
                    {inductee.summary}
                  </p>

                  <div className="mt-6 flex flex-wrap gap-2">
                    {inductee.pillars.map((pillar) => (
                      <span
                        key={pillar}
                        className="rounded-full border border-white/10 bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300"
                      >
                        {pillar}
                      </span>
                    ))}
                  </div>

                  <div className="mt-8">
                    <Link
                      href={inductee.href}
                      className="inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-700"
                    >
                      View Legacy
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <section className="mt-12 rounded-2xl border border-white/10 bg-zinc-900 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            The Standard
          </p>
          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            Not just achievement. Contribution.
          </h2>
          <p className="mt-4 max-w-4xl text-sm leading-7 text-gray-400 md:text-base md:leading-8">
            The Hall of Fame is not a ranking table. It is a memory project for
            the club: a way to preserve the stories of people who gave time,
            structure, care and leadership to chess so the next generation could
            inherit something stronger.
          </p>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {legacyPath.map((item) => (
            <div key={item.label} className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
                {item.label}
              </p>
              <p className="mt-3 text-sm leading-7 text-gray-400">{item.text}</p>
            </div>
          ))}
        </section>
      </section>
    </main>
  );
}
