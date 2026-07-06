import Image from "next/image";
import Link from "next/link";

const achievements = [
  { icon: "🏆", title: "11th President", detail: "Chess South Africa" },
  { icon: "🌍", title: "Former President", detail: "FIDE Zone 4.5" },
  { icon: "♟", title: "FIDE Arbiter", detail: "Internationally recognised chess official" },
  { icon: "🏅", title: "LOC Chairperson", detail: "Mzansi Youth Chess Championships" },
  { icon: "🎓", title: "Coach & Mentor", detail: "Including work with University of Limpopo Chess Club" },
  { icon: "👥", title: "Youth Chess Development", detail: "Long-standing service to junior chess growth" },
];

const contributions = [
  "National chess administration and governance",
  "Continental chess leadership through FIDE Zone 4.5",
  "Tournament organisation and event leadership",
  "Arbitration and officiating of competitive chess events",
  "Coaching, mentorship and player development",
  "Youth chess development across South Africa",
  "Support for chess growth in Limpopo and Polokwane",
];

const references = [
  {
    title: "FIDE Profile",
    description: "Official FIDE profile and arbiter record",
    href: "https://ratings.fide.com/profile/14303876",
  },
  {
    title: "Chess South Africa History",
    description: "Official Chess SA history page listing past presidents",
    href: "https://chessa.co.za/about/history",
  },
];

export default function JoeMahomoleLegacyPage() {
  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="relative overflow-hidden border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.28),_transparent_42%)]">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(90deg,#fff_1px,transparent_1px),linear-gradient(#fff_1px,transparent_1px)] [background-size:52px_52px]" />

        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-12 md:grid-cols-[420px_1fr] md:px-6 md:py-20">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-black shadow-2xl">
            <div className="relative aspect-[4/5]">
              <Image
                src="/images/leaders/joe.jpeg"
                alt="Mahlodi Joe Mahomole"
                fill
                priority
                sizes="(max-width: 768px) 100vw, 420px"
                className="object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent" />
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <Link href="/hall-of-fame" className="text-sm font-semibold text-red-300 transition hover:text-red-200">
              ← Back to Hall of Fame
            </Link>

            <p className="mt-8 text-xs font-black uppercase tracking-[0.35em] text-red-400">
              Founding Inductee
            </p>

            <h1 className="mt-4 text-4xl font-black leading-tight md:text-7xl">
              Mahlodi Joe Mahomole
            </h1>

            <p className="mt-5 max-w-4xl text-lg font-semibold leading-8 text-red-200 md:text-2xl md:leading-10">
              11th President of Chess South Africa • Former FIDE Zone 4.5 President • FIDE Arbiter • Club Manager
            </p>

            <p className="mt-6 max-w-4xl text-sm leading-7 text-gray-300 md:text-lg md:leading-8">
              Polokwane Chess Club proudly recognises Mahlodi Joe Mahomole for
              his lifelong dedication to the advancement of chess in Limpopo,
              South Africa and across the African continent.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <a href="https://ratings.fide.com/profile/14303876" target="_blank" rel="noopener noreferrer" className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700">
                View FIDE Profile →
              </a>

              <a href="https://chessa.co.za/about/history" target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/10 px-5 py-3 text-sm font-black text-white transition hover:border-red-500">
                Chess SA Presidency →
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 md:px-6 md:py-20">
        <section className="rounded-[2rem] border border-white/10 bg-zinc-900 p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Legacy Biography
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-5xl">
            A lifetime of service to chess
          </h2>

          <div className="mt-8 space-y-5 text-sm leading-7 text-gray-300 md:text-base md:leading-8">
            <p>
              Mahlodi Joe Mahomole is one of South Africa&apos;s most respected
              chess administrators, arbiters and development leaders. Over many
              years, his work has reached club, provincial, national and
              continental level, helping to strengthen the structures that allow
              players, coaches, arbiters and organisers to participate in the
              game.
            </p>

            <p>
              He served as the 11th President of Chess South Africa and later as
              President of FIDE Zone 4.5, representing chess leadership across
              Southern Africa. His contribution has not only been
              administrative; he has also been involved in coaching, mentoring,
              tournament organisation and the development of youth chess.
            </p>

            <p>
              As a FIDE Arbiter, Joe brings internationally recognised
              officiating experience to chess events. His continued work with
              Polokwane Chess Club reflects a lifelong commitment to giving back
              to the game and ensuring that future generations inherit a
              stronger chess community.
            </p>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Positions & Service
            </p>

            <h2 className="mt-3 text-3xl font-black md:text-5xl">
              Major roles and achievements
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {achievements.map((achievement) => (
              <div key={`${achievement.title}-${achievement.detail}`} className="rounded-3xl border border-white/10 bg-zinc-900 p-6 transition hover:-translate-y-1 hover:border-red-500/70 hover:shadow-[0_0_35px_rgba(220,38,38,0.22)]">
                <div className="text-4xl">{achievement.icon}</div>
                <h3 className="mt-5 text-xl font-black text-white">{achievement.title}</h3>
                <p className="mt-2 text-sm leading-6 text-gray-400">{achievement.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-red-500/30 bg-red-500/10 p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-300">
              Lifetime Contribution
            </p>

            <h2 className="mt-3 text-3xl font-black text-white">
              Built for future generations
            </h2>

            <p className="mt-5 text-sm leading-7 text-red-50/90 md:text-base md:leading-8">
              Joe&apos;s legacy is not measured only by titles held, but by the
              players, officials and organisers whose chess journeys were made
              possible through his leadership, mentorship and service.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-zinc-900 p-6 md:p-8">
            <h2 className="text-2xl font-black">Areas of impact</h2>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {contributions.map((item) => (
                <div key={item} className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-gray-300">
                  ♟ {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-zinc-900 p-6 md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Official References
          </p>

          <h2 className="mt-3 text-3xl font-black md:text-5xl">
            Verified records
          </h2>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {references.map((reference) => (
              <a key={reference.href} href={reference.href} target="_blank" rel="noopener noreferrer" className="rounded-2xl border border-white/10 bg-zinc-950 p-5 transition hover:-translate-y-1 hover:border-red-500/70">
                <p className="text-lg font-black text-white">✓ {reference.title}</p>
                <p className="mt-2 text-sm leading-6 text-gray-400">{reference.description}</p>
                <p className="mt-4 text-sm font-bold text-red-300">Open source →</p>
              </a>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[2rem] border border-white/10 bg-zinc-900 p-6 text-center md:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
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
