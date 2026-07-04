import Image from "next/image";
import Link from "next/link";

const whatsappJoinLink =
  "https://wa.me/27728787894?text=Hi%20Polokwane%20Chess%20Club%20%F0%9F%91%8B%0A%0AI%20would%20like%20to%20become%20a%20member.%0A%0AMy%20details%20are%3A%0A%0A%E2%80%A2%20Full%20Name%3A%0A%E2%80%A2%20Age%3A%0A%E2%80%A2%20School%20%2F%20Club%3A%0A%E2%80%A2%20Chess%20SA%20ID%20(if%20available)%3A%0A%E2%80%A2%20Playing%20Strength%3A%0A%E2%80%A2%20Parent%2FGuardian%20Name%20(if%20junior)%3A%0A%E2%80%A2%20Contact%20Number%3A%0A%0AI%20would%20like%20more%20information%20about%20membership.";

export default function Hero() {
  return (
    <section className="relative flex min-h-[88vh] items-center overflow-hidden bg-black px-4 pt-24 text-white md:px-6">
      <Image
        src="/images/hero/chess-hero.jpg"
        alt="Chess players competing at a tournament"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      <div className="absolute inset-0 bg-black/72" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.76)_48%,rgba(127,0,0,0.30)_100%)]" />

      <div className="relative mx-auto w-full max-w-7xl py-10 md:py-16">
        <div className="max-w-4xl text-center lg:text-left">
          <div className="mb-4 flex justify-center lg:justify-start">
            <Image
              src="/logo.png"
              alt="Polokwane Chess Club logo"
              width={220}
              height={220}
              className="h-24 w-24 object-contain md:h-36 md:w-36"
              priority
            />
          </div>

          <div className="mb-4 inline-flex rounded-full border border-red-500/40 bg-red-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-red-200">
            Online tournament registration is now available
          </div>

          <p className="mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-red-300 md:text-sm">
            Polokwane Chess Club
          </p>

          <h1 className="text-4xl font-black leading-tight md:text-7xl">
            Building Champions
            <span className="block text-red-500">Since 1958</span>
          </h1>

          <p className="mx-auto mt-5 max-w-3xl text-base leading-7 text-gray-200 md:text-xl md:leading-8 lg:mx-0">
            Developing chess players, supporting tournaments and growing the
            game across South Africa through coaching, community and modern
            tournament services.
          </p>

          <p className="mx-auto mt-4 max-w-3xl text-sm leading-6 text-gray-400 md:text-base md:leading-7 lg:mx-0">
            Discover upcoming chess events, register online, follow club news
            and explore tournament galleries from one central platform.
          </p>

          <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap">
            <Link
              href="/register"
              className="rounded-xl bg-red-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
            >
              Register for Tournament
            </Link>

            <a
              href={whatsappJoinLink}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-green-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-green-700"
            >
              Become a Member
            </a>

            <a
              href="#news"
              className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-white hover:text-black"
            >
              Latest News
            </a>

            <a
              href="#tournaments"
              className="rounded-xl border border-white/20 bg-black/30 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
            >
              Tournament Centre
            </a>
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 text-left sm:grid-cols-4">
            {[
              ["🏆", "Events", "Upcoming tournaments"],
              ["📰", "News", "Club updates"],
              ["📸", "Gallery", "Photos & memories"],
              ["♟️", "Calendar", "Chess activities"],
            ].map(([icon, title, text]) => (
              <div
                key={title}
                className="rounded-xl border border-white/10 bg-black/35 p-3 backdrop-blur"
              >
                <p className="text-xl">{icon}</p>
                <p className="mt-2 text-sm font-bold text-white">{title}</p>
                <p className="mt-1 text-xs text-gray-400">{text}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap justify-center gap-3 text-xs text-gray-300 lg:justify-start md:text-sm">
            <span className="rounded-full bg-white/10 px-3 py-1">
              Established in 1958
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              Polokwane, Limpopo
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              Competitive Chess
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1">
              Player Development
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
