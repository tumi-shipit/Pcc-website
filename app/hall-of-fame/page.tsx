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
};

const inductees: Inductee[] = [
  {
    name: "Mahlodi Joe Mahomole",
    title: "Founding Inductee",
    subtitle:
      "Former Chess South Africa President • Former FIDE Zone 4.5 President • FIDE Arbiter",
    image: "/images/leaders/joe.jpeg",
    href: "/hall-of-fame/joe-mahomole",
    badge: "Inductee No. 1",
    summary:
      "Honoured for decades of leadership, administration, arbitration, coaching and youth chess development in Limpopo, South Africa and Southern Africa.",
  },
];

export default function HallOfFamePage() {
  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top,_rgba(220,38,38,0.28),_transparent_42%)]">
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(45deg,#fff_1px,transparent_1px),linear-gradient(-45deg,#fff_1px,transparent_1px)] [background-size:42px_42px]" />

        <div className="relative mx-auto max-w-7xl px-4 py-20 text-center md:px-6 md:py-28">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-red-400 md:text-sm">
            Polokwane Chess Club
          </p>

          <h1 className="mt-5 text-4xl font-black leading-tight md:text-7xl">
            PCC Hall of Fame
          </h1>

          <p className="mx-auto mt-6 max-w-3xl text-sm leading-7 text-gray-300 md:text-lg md:leading-8">
            Honouring individuals whose dedication, leadership and lifelong
            service have left a lasting mark on Polokwane Chess Club, Limpopo
            and South African chess.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-20">
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Founding Legacy
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-5xl">
            First Inductee
          </h2>

          <p className="mt-4 text-sm leading-7 text-gray-400 md:text-base md:leading-8">
            The Hall of Fame begins by recognising a figure whose work has
            shaped chess far beyond club level.
          </p>
        </div>

        <div className="grid gap-8">
          {inductees.map((inductee) => (
            <article
              key={inductee.name}
              className="group overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-900 shadow-2xl transition duration-300 hover:-translate-y-1 hover:border-red-500/70 hover:shadow-[0_0_50px_rgba(220,38,38,0.28)]"
            >
              <div className="grid lg:grid-cols-[380px_1fr]">
                <Link
                  href={inductee.href}
                  className="relative block aspect-[4/5] overflow-hidden bg-black lg:aspect-auto lg:min-h-[520px]"
                >
                  <Image
                    src={inductee.image}
                    alt={inductee.name}
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 380px"
                    className="object-cover object-top transition duration-700 group-hover:scale-110"
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

                  <div className="mt-8">
                    <Link
                      href={inductee.href}
                      className="inline-flex rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-700"
                    >
                      View Legacy →
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-zinc-900 p-6 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Purpose
          </p>

          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            Preserving chess history
          </h2>

          <p className="mt-4 max-w-4xl text-sm leading-7 text-gray-400 md:text-base md:leading-8">
            The PCC Hall of Fame exists to document and celebrate those whose
            leadership, mentorship and service helped build the chess community.
            It is a permanent record for future players, parents, officials and
            organisers to learn from and be inspired by.
          </p>
        </div>
      </section>
    </main>
  );
}
