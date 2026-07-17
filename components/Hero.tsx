import Image from "next/image";
import Link from "next/link";

const whatsappJoinLink =
  "https://wa.me/27728787894?text=Hi%20Polokwane%20Chess%20Club%20%F0%9F%91%8B%0A%0AI%20would%20like%20to%20become%20a%20member.%0A%0AMy%20details%20are%3A%0A%0A%E2%80%A2%20Full%20Name%3A%0A%E2%80%A2%20Age%3A%0A%E2%80%A2%20School%20%2F%20Club%3A%0A%E2%80%A2%20Chess%20SA%20ID%20(if%20available)%3A%0A%E2%80%A2%20Playing%20Strength%3A%0A%E2%80%A2%20Parent%2FGuardian%20Name%20(if%20junior)%3A%0A%E2%80%A2%20Contact%20Number%3A%0A%0AI%20would%20like%20more%20information%20about%20membership.";
const quickLinks = [
  {
    href: "/#tournaments",
    title: "Tournament Centre",
    text: "Upcoming events, entries and archives",
  },
  {
    href: "/players",
    title: "Player Centre",
    text: "Verified profiles, records and history",
  },
  {
    href: "/players/rankings",
    title: "LCA Rankings",
    text: "Limpopo Chess Academy",
  },
  { href: "/hall-of-fame", title: "Hall of Fame", text: "PCC legacy" },
];

const proofPoints = [
  { label: "Established", value: "1958", text: "Serving Limpopo chess for generations" },
  { label: "Home Base", value: "Polokwane", text: "A public hub for local chess" },
  { label: "Records", value: "Verified", text: "Profiles linked to club and event data" },
];

export default function Hero() {
  return (
    <section className="relative min-h-[92vh] overflow-hidden bg-black px-4 pt-24 text-white md:px-6">
      <Image
        src="/images/club/club-photo.jpg"
        alt="Polokwane Chess Club players and officials"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/65" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.98)_0%,rgba(0,0,0,0.78)_46%,rgba(127,29,29,0.26)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black to-transparent" />

      <div className="relative mx-auto grid min-h-[calc(92vh-6rem)] max-w-7xl items-center gap-10 py-10 lg:grid-cols-[1fr_390px]">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex max-w-full rounded-full border border-red-400/40 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-red-100 md:tracking-[0.22em]">
            Established 1958 - Polokwane, Limpopo
          </div>

          <h1 className="max-w-5xl text-5xl font-black leading-[1.02] md:text-7xl">
            Polokwane Chess Club
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-gray-200 md:text-xl md:leading-9">
            The public home for PCC tournaments, verified player records,
            member services and the living archive of chess in Polokwane.
          </p>

          <div className="mt-7 grid max-w-3xl gap-3 sm:grid-cols-3">
            {proofPoints.map((item) => (
              <div
                key={item.label}
                className="rounded-lg border border-white/10 bg-black/45 px-4 py-4 shadow-2xl shadow-black/20 backdrop-blur"
              >
                <p className="text-xl font-black text-white md:text-3xl">
                  {item.value}
                </p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-red-200">
                  {item.label}
                </p>
                <p className="mt-2 hidden text-xs leading-5 text-gray-300 sm:block">
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <Link
              href="/register"
              className="rounded-lg bg-red-600 px-5 py-3 text-center text-sm font-bold text-white shadow-lg shadow-red-950/30 transition hover:bg-red-700"
            >
              Enter a Tournament
            </Link>
            <Link
              href="/#tournaments"
              className="rounded-lg border border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white hover:text-black"
            >
              View Tournaments
            </Link>
            <Link
              href="/members/login"
              className="rounded-lg border border-white/20 bg-black/30 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
            >
              Member Centre
            </Link>
            <Link
              href="/players"
              className="rounded-lg border border-white/20 bg-black/30 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
            >
              Player Centre
            </Link>
            <a
              href={whatsappJoinLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg bg-green-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-green-700"
            >
              Become a Member
            </a>
          </div>
        </div>

        <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/35 p-3 shadow-2xl shadow-black/30 backdrop-blur-md">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg border border-white/10 bg-white/[0.04] p-4 transition hover:border-red-500 hover:bg-red-500/10"
            >
              <p className="text-lg font-black text-white">{item.title}</p>
              <p className="mt-1 text-sm text-gray-400">{item.text}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
