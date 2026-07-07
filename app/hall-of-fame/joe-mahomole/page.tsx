import Image from "next/image";
import Link from "next/link";

type ServiceArea = {
  organisation: string;
  service: string;
  description: string;
  logo: string;
};

type LegacyPillar = {
  title: string;
  description: string;
};

type Reference = {
  title: string;
  description: string;
  href: string;
};

const serviceAreas: ServiceArea[] = [
  {
    organisation: "Chess South Africa",
    service: "National Leadership & Service",
    description:
      "Service at national level within South African chess, including being listed by Chess South Africa as its 11th President.",
    logo: "/images/organisations/chessa.png",
  },
  {
    organisation: "FIDE Zone 4.5",
    service: "Zonal Leadership & Southern African Chess",
    description:
      "Contribution to chess leadership and development within the Southern African chess region.",
    logo: "/images/organisations/fide-zone-45.png",
  },
  {
    organisation: "FIDE",
    service: "International Officiating",
    description:
      "Recognition as a FIDE Arbiter, bringing international officiating standards and tournament experience to the chess community.",
    logo: "/images/organisations/fide.png",
  },
  {
    organisation: "Chess Limpopo",
    service: "Provincial Leadership & Development",
    description:
      "Service to Limpopo chess through provincial leadership, development, administration and guidance.",
    logo: "/images/organisations/chess-limpopo.png",
  },
  {
    organisation: "Capricorn District Chess",
    service: "District Leadership & Growth",
    description:
      "Support for chess growth at district level through leadership, organising, development and community chess activity.",
    logo: "/images/organisations/capricorn-district-chess.png",
  },
  {
    organisation: "Mzansi Inter-Provincial Youth Chess Championships",
    service: "National Youth Event Leadership",
    description:
      "Chairperson of the Local Organising Committee for the 2024 Mzansi Inter-Provincial Youth Chess Championships, a national youth chess event.",
    logo: "/images/organisations/mzansi-interprovincial-youth.png",
  },
  {
    organisation: "Limpopo Chess Academy",
    service: "Coaching & Player Development",
    description:
      "Coaching and mentorship across hundreds of schools, numerous clubs and individual players, with continued development work through the Limpopo Chess Academy.",
    logo: "/images/organisations/limpopo-chess-academy.png",
  },
  {
    organisation: "Polokwane Chess Club",
    service: "Club Leadership & Mentorship",
    description:
      "Leadership, experience and guidance that strengthens the club, its development programmes and its chess culture.",
    logo: "/images/organisations/polokwane-chess-club.png",
  },
];

const legacyPillars: LegacyPillar[] = [
  {
    title: "Leadership",
    description:
      "Guiding chess structures from club level to district, provincial, national and zonal levels.",
  },
  {
    title: "Coaching",
    description:
      "Developing players from schools, clubs and individual training environments through years of mentorship.",
  },
  {
    title: "Officiating",
    description:
      "Supporting fair and professional competition through internationally recognised arbiter experience.",
  },
  {
    title: "Tournament Organisation",
    description:
      "Helping deliver organised chess events and championship environments for players to compete and grow.",
  },
  {
    title: "Youth Development",
    description:
      "Creating opportunities for young players and supporting structures that help junior chess grow.",
  },
  {
    title: "Legacy Building",
    description:
      "Leaving behind stronger players, stronger organisers, stronger officials and stronger chess communities.",
  },
];

const references: Reference[] = [
  {
    title: "FIDE Profile",
    description: "Official FIDE profile and arbiter record.",
    href: "https://ratings.fide.com/profile/14303876",
  },
  {
    title: "Chess South Africa History",
    description: "Official Chess SA history page listing past presidents.",
    href: "https://chessa.co.za/about/history",
  },
];

export default function JoeMahomoleLegacyPage() {
  return (
    <main className="min-h-screen bg-black pt-24 text-white">
      <section className="relative overflow-hidden border-b border-yellow-500/20">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,_rgba(234,179,8,0.24),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(220,38,38,0.24),_transparent_32%),linear-gradient(135deg,_#050505,_#09090b_45%,_#000)]" />
        <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(45deg,#facc15_1px,transparent_1px),linear-gradient(-45deg,#facc15_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-12 md:grid-cols-[420px_1fr] md:px-6 md:py-20">
          <div className="relative">
            <div className="absolute -inset-5 rounded-[2.75rem] bg-yellow-500/20 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-yellow-500/30 bg-zinc-950 shadow-2xl">
              <div className="relative aspect-[4/5]">
                <Image
                  src="/images/leaders/joe.jpeg"
                  alt="Mahlodi Joe Mahomole"
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 420px"
                  className="object-cover object-top"
                />

                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-transparent" />

                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <div className="rounded-2xl border border-yellow-500/30 bg-black/55 p-4 backdrop-blur-md">
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-yellow-300">
                      PCC Hall of Fame
                    </p>
                    <p className="mt-2 text-lg font-black text-white">
                      Founding Inductee
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <Link
              href="/hall-of-fame"
              className="text-sm font-semibold text-yellow-300 transition hover:text-yellow-200"
            >
              ← Back to Hall of Fame
            </Link>

            <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-yellow-400">
              Citation of Service
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-7xl">
              Mahlodi Joe Mahomole
            </h1>

            <p className="mt-5 max-w-4xl text-lg font-semibold leading-8 text-yellow-100 md:text-2xl md:leading-10">
              Chess Administrator • FIDE Arbiter • Coach • Mentor • Development
              Leader
            </p>

            <p className="mt-6 max-w-4xl border-l-4 border-yellow-500 pl-5 text-base italic leading-8 text-gray-200 md:text-xl md:leading-10">
              “For decades, Joe Mahomole has devoted his life to building chess
              not for personal recognition, but to create opportunities for
              future generations.”
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="https://ratings.fide.com/profile/14303876"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-black text-black transition hover:bg-yellow-400"
              >
                View FIDE Profile →
              </a>

              <a
                href="https://chessa.co.za/about/history"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-yellow-500/30 px-5 py-3 text-sm font-black text-white transition hover:border-yellow-400 hover:bg-yellow-500/10"
              >
                Chess SA History →
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-20">
        <section className="relative overflow-hidden rounded-[2rem] border border-yellow-500/20 bg-zinc-950 p-6 shadow-2xl md:p-10">
          <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-yellow-500/10 blur-3xl" />

          <div className="relative">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Official Citation
            </p>

            <h2 className="mt-3 text-3xl font-black md:text-5xl">
              A life dedicated to building chess
            </h2>

            <div className="mt-8 space-y-5 text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              <p>
                Mahlodi Joe Mahomole is recognised for an outstanding
                contribution to chess through leadership, governance, officiating,
                coaching, mentorship and development. His service has reached
                across club, district, provincial, national and continental
                chess.
              </p>

              <p>
                His record includes service connected to Chess South Africa,
                FIDE Zone 4.5, FIDE, Chess Limpopo, Capricorn District Chess,
                Limpopo Chess Academy and Polokwane Chess Club. These
                contributions reflect a lifetime of work that goes beyond titles
                and official positions.
              </p>

              <p>
                Joe&apos;s legacy is found in the players who were coached, the
                schools and clubs that were supported, the tournaments that were
                organised, the officials who were guided and the chess structures
                that continue to benefit from his experience.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
              Leadership & Service
            </p>

            <h2 className="mt-3 text-3xl font-black md:text-5xl">
              Beyond titles, a lifetime of contribution
            </h2>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400 md:text-base md:leading-8">
              The cards below show organisations and areas of chess where Joe
              Mahomole&apos;s contribution has been felt. They are not meant to
              limit his work to job titles, but to help visitors understand the
              scale of his service.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {serviceAreas.map((area) => (
              <article
                key={`${area.organisation}-${area.service}`}
                className="group rounded-3xl border border-white/10 bg-zinc-950 p-5 transition duration-300 hover:-translate-y-1 hover:border-yellow-500/70 hover:shadow-[0_0_35px_rgba(234,179,8,0.18)]"
              >
                <div className="flex min-h-20 items-center gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-yellow-500/20 bg-white p-2">
                    <Image
                      src={area.logo}
                      alt={`${area.organisation} logo`}
                      width={56}
                      height={56}
                      className="max-h-full max-w-full object-contain"
                    />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-yellow-300">
                      {area.organisation}
                    </p>
                    <h3 className="mt-1 text-lg font-black text-white">
                      {area.service}
                    </h3>
                  </div>
                </div>

                <p className="mt-4 text-sm leading-6 text-gray-400">
                  {area.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-12 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-yellow-500/30 bg-yellow-500/10 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-300">
              Legacy of Service
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              Built for future generations
            </h2>

            <p className="mt-5 text-sm leading-7 text-yellow-50/90 md:text-base md:leading-8">
              Joe&apos;s contribution is not only found in the positions he has
              held. It is found in the opportunities created, the structures
              strengthened and the generations of players and officials inspired
              through chess.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-950 p-6 md:p-8">
            <h2 className="text-2xl font-black">Pillars of contribution</h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {legacyPillars.map((pillar) => (
                <div
                  key={pillar.title}
                  className="rounded-xl border border-white/10 bg-black p-4"
                >
                  <p className="font-bold text-white">♟ {pillar.title}</p>
                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    {pillar.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] border border-white/10 bg-zinc-950 p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Official References
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-5xl">
            Verified records
          </h2>

          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400 md:text-base md:leading-8">
            These references support selected public records linked to Joe
            Mahomole&apos;s chess service. The Hall of Fame page may continue to
            be expanded as more verified records become available.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {references.map((reference) => (
              <a
                key={reference.href}
                href={reference.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-white/10 bg-black p-5 transition hover:-translate-y-1 hover:border-yellow-500/70"
              >
                <p className="text-lg font-black text-white">
                  ✓ {reference.title}
                </p>

                <p className="mt-2 text-sm leading-6 text-gray-400">
                  {reference.description}
                </p>

                <p className="mt-4 text-sm font-bold text-yellow-300">
                  Open source →
                </p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] border border-yellow-500/20 bg-gradient-to-br from-zinc-950 via-black to-zinc-950 p-6 text-center md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-400">
            Tribute
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-5xl">
            Honoured by Polokwane Chess Club
          </h2>

          <p className="mx-auto mt-6 max-w-4xl text-sm leading-7 text-gray-300 md:text-lg md:leading-8">
            Polokwane Chess Club proudly recognises Mahlodi Joe Mahomole for his
            lifelong dedication to the advancement of chess. His leadership,
            mentorship and service have inspired generations of players,
            officials and organisers. His legacy will continue to shape the
            future of chess for years to come.
          </p>
        </section>
      </section>
    </main>
  );
}

