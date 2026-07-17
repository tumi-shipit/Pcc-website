import Image from "next/image";
import Link from "next/link";

const whatsappJoinLink =
  "https://wa.me/27728787894?text=Hi%20Polokwane%20Chess%20Club%20%F0%9F%91%8B%0A%0AI%20would%20like%20to%20become%20a%20member.%0A%0AMy%20details%20are%3A%0A%0A%E2%80%A2%20Full%20Name%3A%0A%E2%80%A2%20Age%3A%0A%E2%80%A2%20School%20%2F%20Club%3A%0A%E2%80%A2%20Chess%20SA%20ID%20(if%20available)%3A%0A%E2%80%A2%20Playing%20Strength%3A%0A%E2%80%A2%20Parent%2FGuardian%20Name%20(if%20junior)%3A%0A%E2%80%A2%20Contact%20Number%3A%0A%0AI%20would%20like%20more%20information%20about%20membership.";
const quickLinks = [
  { href: "/#tournaments", title: "Tournaments", text: "Entries, results and archives" },
  { href: "/players", title: "Player Centre", text: "Verified profiles and records" },
  {
    href: "/players/rankings",
    title: "LCA Rankings",
    text: "Limpopo Chess Academy",
  },
  { href: "/hall-of-fame", title: "Hall of Fame", text: "PCC legacy" },
];

const proofPoints = [
  { label: "Established", value: "1958" },
  { label: "Base", value: "Polokwane" },
  { label: "Player Data", value: "Verified" },
];

export default function Hero() {
  return (
    <section className="relative min-h-[88vh] overflow-hidden bg-black px-4 pt-24 text-white md:px-6">
      <Image
        src="/images/club/club-photo.jpg"
        alt="Polokwane Chess Club players and officials"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-black/70" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.95)_0%,rgba(0,0,0,0.76)_48%,rgba(120,0,0,0.28)_100%)]" />

      <div className="relative mx-auto grid min-h-[calc(88vh-6rem)] max-w-7xl items-center gap-10 py-10 lg:grid-cols-[1fr_420px]">
        <div className="max-w-4xl">
          <div className="mb-5 inline-flex rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-red-200">
            Established 1958 - Polokwane, Limpopo
          </div>

          <h1 className="text-4xl font-black leading-tight md:text-7xl">
            Polokwane Chess Club
          </h1>

          <p className="mt-5 max-w-3xl text-base leading-7 text-gray-200 md:text-xl md:leading-8">
            Tournament registration, verified player records, member services
            and the living archive of chess in Polokwane.
          </p>

          <div className="mt-6 grid max-w-2xl grid-cols-3 gap-2">
            {proofPoints.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-black/40 px-3 py-3"
              >
                <p className="text-lg font-black text-white md:text-2xl">
                  {item.value}
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">
                  {item.label}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <Link
              href="/register"
              className="rounded-xl bg-red-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
            >
              Enter a Tournament
            </Link>
            <Link
              href="/#tournaments"
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white hover:text-black"
            >
              View Tournaments
            </Link>
            <Link
              href="/members/login"
              className="rounded-xl border border-white/20 bg-black/30 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
            >
              Member Centre
            </Link>
            <Link
              href="/players"
              className="rounded-xl border border-white/20 bg-black/30 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
            >
              Player Centre
            </Link>
            <a
              href={whatsappJoinLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-green-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-green-700"
            >
              Become a Member
            </a>
          </div>
        </div>

        <div className="grid gap-3">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-xl border border-white/10 bg-black/45 p-4 backdrop-blur transition hover:border-red-500"
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
