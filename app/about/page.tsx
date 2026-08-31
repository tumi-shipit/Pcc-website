import PublicPageShell from "@/components/PublicPageShell";

const registrationUsers = [
  "Individuals",
  "Schools",
  "Chess organisations",
  "Districts",
  "Provinces",
  "National federations",
];

export default function AboutPage() {
  return (
    <PublicPageShell>
      <main className="min-h-screen bg-black pt-24 text-white">
        <section className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-400">
            About PCC
          </p>
          <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
            The home of chess in the heart of Polokwane
          </h1>

          <div className="mt-8 max-w-3xl space-y-5 text-base leading-8 text-gray-300">
            <p>
              Polokwane Chess Club was established in 1958. The club is based in
              Polokwane, Limpopo, and provides a place for local players to take
              part in chess.
            </p>
            <p>
              This website lists tournaments, accepts online entries, publishes
              event information and results, and keeps verified public player
              records.
            </p>
            <p>
              The registration service is not limited to events in Polokwane.
              Approved organisers can use it for school, organisational,
              district, provincial and national tournaments.
            </p>
          </div>

          <section className="mt-12 border-t border-white/10 pt-8">
            <h2 className="text-2xl font-black">Who can use the service</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {registrationUsers.map((user) => (
                <div
                  key={user}
                  className="rounded-xl border border-white/10 bg-zinc-950 px-5 py-4 font-semibold"
                >
                  {user}
                </div>
              ))}
            </div>
          </section>
        </section>
      </main>
    </PublicPageShell>
  );
}
