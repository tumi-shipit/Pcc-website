import Image from "next/image";
import Link from "next/link";

type Leader = {
  name: string;
  role: string;
  focus: string;
  image: string;
  qualifications: string[];
  legacyHref?: string;
  legacyBadge?: string;
};

const leaders: Leader[] = [
  {
    name: "Joe Mahomole",
    role: "Club Manager",
    focus: "Club leadership",
    image: "/images/leaders/joe.jpeg",
    legacyHref: "/hall-of-fame/joe-mahomole",
    legacyBadge: "Hall of Fame",
    qualifications: [
      "Qualified FIDE Arbiter",
      "Level 3 Instructor & Coach",
      "Current President of Capricorn District Chess",
      "Former Chess SA President",
      "Former FIDE Zone 4.5 President (2018-2022)",
      "Former FIDE Commonwealth Treasurer (2018-2022)",
      "Coach at Limpopo Chess Academy and other institutions",
      "Mzansi Youth Inter-Provincial Chess Championship 2024 LOC Chairperson",
      "Player",
    ],
  },
  {
    name: "Tumelo Mmola",
    role: "Club Captain & Head of Operations",
    focus: "Growth of club",
    image: "/images/leaders/tumelo.jpeg",
    qualifications: [
      "Qualified Level 3 Chess Instructor & Coach (CHESSA)",
      "Candidate Provincial Arbiter (CHESSA)",
      "Recognised National Arbiter (FIDE)",
      "Chess Coach at Mitchell House",
      "Head Coach at Capricorn District Chess",
      "PCC Website Developer",
      "Tournament Organiser",
    ],
  },
  {
    name: "Elias Mabotja",
    role: "Operations & Administration Manager",
    focus: "Support through admin",
    image: "/images/leaders/elias-mabotja.jpg",
    qualifications: [
      "Qualified FIDE School Instructor",
      "Recognised National Arbiter (FIDE)",
      "Level 1 Chess Instructor & Coach",
      "Chess Coach at Northern Academy Secondary",
      "Candidate Provincial Arbiter (CHESSA)",
      "Founder of Chess Clinic",
      "General Secretary of Capricorn District Chess",
      "Tournament Organiser",
    ],
  },
  {
    name: "Tebogo Mahomole",
    role: "Competitions & Events Coordinator",
    focus: "Player development",
    image: "/images/leaders/tebogo.jpeg",
    qualifications: [
      "Qualified Level 1 Chess Instructor & Coach",
      "Tournament Support",
      "Administration",
      "Player Development",
      "Events Support",
    ],
  },
];

export default function Leadership() {
  return (
    <section className="bg-zinc-950 py-16 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-500 md:text-sm">
            Leadership
          </p>

          <h2 className="mt-4 text-3xl font-black md:text-5xl">
            Club leadership and service
          </h2>

          <p className="mt-5 text-sm leading-7 text-gray-400 md:text-lg md:leading-8">
            PCC is guided by people who serve the club through governance,
            tournament delivery, player development and the preservation of
            chess history in Limpopo.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {leaders.map((leader) => (
            <LeaderCard key={leader.name} leader={leader} />
          ))}
        </div>

        <div className="mt-12 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
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
            className="mt-6 inline-flex rounded-lg border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500 hover:bg-red-600"
          >
            Visit PCC Hall of Fame
          </Link>
        </div>
      </div>
    </section>
  );
}

function LeaderCard({ leader }: { leader: Leader }) {
  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-xl transition duration-300 hover:-translate-y-1 hover:border-red-500/70">
      <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
        <Image
          src={leader.image}
          alt={`${leader.name}, ${leader.role} at Polokwane Chess Club`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width:1024px) 50vw, 25vw"
          className="object-cover object-top transition-transform duration-700 group-hover:scale-110"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-transparent" />

        {leader.legacyBadge && (
          <span className="absolute left-4 top-4 rounded-full border border-yellow-300/40 bg-yellow-500/20 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-yellow-100 backdrop-blur-md">
            Featured {leader.legacyBadge}
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-300 md:text-xs md:tracking-[0.24em]">
            {leader.role}
          </p>

          <h3 className="mt-2 text-lg font-black leading-tight text-white md:text-2xl">
            {leader.name}
          </h3>
        </div>
      </div>

      <div className="border-t border-white/10 p-4 md:p-5">
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-red-200">
          {leader.focus}
        </p>

        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-red-300 md:text-xs">
          Qualifications & service
        </p>

        <ul className="mt-4 space-y-2">
          {leader.qualifications.map((item) => (
            <li
              key={item}
              className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-[11px] font-semibold leading-5 text-gray-300 md:text-xs md:leading-6"
            >
              {item}
            </li>
          ))}
        </ul>

        {leader.legacyHref && (
          <Link
            href={leader.legacyHref}
            className="mt-5 inline-flex text-sm font-bold text-red-300 transition hover:text-red-200"
          >
            View Hall of Fame profile
          </Link>
        )}
      </div>
    </article>
  );
}
