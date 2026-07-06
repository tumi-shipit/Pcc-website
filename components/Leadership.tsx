import Image from "next/image";
import Link from "next/link";

type Leader = {
  name: string;
  role: string;
  description: string;
  image: string;
  highlights: string[];
  legacyHref?: string;
  legacyBadge?: string;
};

const leaders: Leader[] = [
  {
    name: "Joe Mahomole",
    role: "Club Manager",
    description:
      "Providing leadership, mentorship and strategic guidance for Polokwane Chess Club and the wider chess community.",
    image: "/images/leaders/joe.jpeg",
    legacyHref: "/hall-of-fame/joe-mahomole",
    legacyBadge: "Hall of Fame",
    highlights: [
      "Former Chess SA President",
      "Former FIDE Zone 4.5 President",
      "FIDE Arbiter",
      "Mzansi Youth LOC Chair",
      "University of Limpopo Coach",
    ],
  },
  {
    name: "Tumelo Mmola",
    role: "Club Captain",
    description:
      "Organising tournaments, developing systems and supporting the growth of competitive chess players.",
    image: "/images/leaders/tumelo.jpeg",
    highlights: [
      "Club Captain",
      "Tournament Organiser",
      "Chess Coach",
      "Candidate Provincial Arbiter",
      "PCC Website Developer",
    ],
  },
  {
    name: "Tebogo Mahomole",
    role: "Club Official",
    description:
      "Strengthening the club through administration, event support and player development.",
    image: "/images/leaders/tebogo.jpeg",
    highlights: [
      "Club Official",
      "Tournament Support",
      "Administration",
      "Player Development",
      "Events Support",
    ],
  },
];

export default function Leadership() {
  return (
    <section className="bg-zinc-950 py-20 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="font-semibold uppercase tracking-[0.3em] text-red-500">
            Leadership
          </p>

          <h2 className="mt-4 text-4xl font-black md:text-5xl">
            Meet The Team
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-gray-400">
            Behind every successful chess club is a dedicated team committed to
            growing the game, developing players and preserving the legacy of
            chess in Limpopo.
          </p>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {leaders.map((leader) => (
            <LeaderCard key={leader.name} leader={leader} />
          ))}
        </div>

        <div className="mt-12 rounded-3xl border border-white/10 bg-zinc-900 p-6 text-center md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Legacy
          </p>

          <h3 className="mt-3 text-2xl font-black md:text-4xl">
            Honouring those who built the game
          </h3>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-gray-400 md:text-base md:leading-8">
            PCC recognises leaders whose contribution goes beyond club duties.
            The Hall of Fame preserves the stories of those whose service shaped
            chess in Polokwane, Limpopo and South Africa.
          </p>

          <Link
            href="/hall-of-fame"
            className="mt-6 inline-flex rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500 hover:bg-red-600"
          >
            Visit PCC Hall of Fame →
          </Link>
        </div>
      </div>
    </section>
  );
}

function LeaderCard({ leader }: { leader: Leader }) {
  return (
    <article className="group overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-xl transition-all duration-300 hover:-translate-y-2 hover:border-red-500/70 hover:shadow-[0_0_45px_rgba(220,38,38,0.38)]">
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
        <Image
          src={leader.image}
          alt={`${leader.name}, ${leader.role} at Polokwane Chess Club`}
          fill
          sizes="(max-width:768px) 100vw, (max-width:1024px) 50vw, 33vw"
          className="object-cover object-top transition-transform duration-700 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent" />

        {leader.legacyBadge && (
          <span className="absolute left-4 top-4 rounded-full border border-yellow-300/40 bg-yellow-500/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-yellow-100 backdrop-blur-md">
            ⭐ {leader.legacyBadge}
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md transition-all duration-500 group-hover:border-red-500/50 group-hover:bg-black/55">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-300">
              {leader.role}
            </p>

            <h3 className="mt-2 text-2xl font-black text-white transition-transform duration-500 group-hover:-translate-y-1">
              {leader.name}
            </h3>

            <div className="mt-3 h-0.5 w-0 bg-red-500 transition-all duration-500 group-hover:w-20" />

            <div className="mt-4 max-h-0 overflow-hidden opacity-0 transition-all duration-500 group-hover:max-h-56 group-hover:opacity-100">
              <div className="space-y-2 border-t border-white/10 pt-4">
                {leader.highlights.map((item) => (
                  <p key={item} className="text-sm text-gray-200">
                    ♟ {item}
                  </p>
                ))}

                {leader.legacyHref && (
                  <Link
                    href={leader.legacyHref}
                    className="mt-4 inline-flex rounded-lg bg-red-600 px-4 py-2 text-xs font-black text-white transition hover:bg-red-700"
                  >
                    View Legacy →
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 p-6">
        <p className="text-sm leading-7 text-gray-400">{leader.description}</p>

        {leader.legacyHref && (
          <Link
            href={leader.legacyHref}
            className="mt-5 inline-flex text-sm font-bold text-red-300 transition hover:text-red-200"
          >
            View Hall of Fame profile →
          </Link>
        )}
      </div>
    </article>
  );
}
