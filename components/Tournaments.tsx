import Image from "next/image";

const tournaments = [
  {
    title: "Polokwane Open 2026",
    date: "1 August 2026",
    venue: "Polokwane, Limpopo",
    format: "Open tournament",
    timeControl: "To be announced",
    status: "Upcoming",
    registration: "Tournament details and registration information coming soon.",
    image: "/images/tournaments/polokwane-open-2026.png",
  },
  {
    title: "Sekhukhune District Junior Qualifiers 2026",
    date: "1 August 2026",
    venue: "Kgaola Mafiri Hall, Jane Furse",
    format: "5 rounds — Swiss system",
    timeControl: "25+5 Fischer increment",
    status: "Upcoming",
    registration:
      "Starts at 08:30. Entry fee: R100 per player. Registration closes 30 July 2026. Age categories: U10, U12, U14, U16, U18 and U20.",
    registrationLink:
      "https://docs.google.com/forms/d/e/1FAIpQLSesJJv_Jz9WOaXHcZBpgS9xnNHf8LPt7Zra7M6XlsFDVj_TVg/viewform?usp=header",
    image: "/images/tournaments/sekhukhune-qualifiers-4.jpeg",
  },
  {
    title: "Women's Day Chess Championship",
    date: "8 August 2026",
    venue: "Polokwane, Limpopo",
    format: "Championship tournament",
    timeControl: "To be announced",
    status: "Upcoming",
    registration: "Tournament details and registration information coming soon.",
    image: "/images/tournaments/womens-day-2026.png",
  },
  {
    title: "Polokwane Monthly Rapid",
    date: "Every month",
    venue: "Lichess platform",
    format: "Online rapid chess",
    timeControl: "To be announced",
    status: "Monthly",
    registration:
      "Join the Polokwane Chess Club online community for monthly rapid events.",
    image: "/images/tournaments/monthly-rapid.png",
  },
];

export default function Tournaments() {
  return (
    <section id="tournaments" className="bg-zinc-950 py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-14 max-w-3xl">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.3em] text-red-500">
            Club Calendar
          </p>

          <h2 className="text-4xl font-bold md:text-5xl">
            Upcoming Tournaments
          </h2>

          <p className="mt-5 text-lg leading-8 text-gray-400">
            Compete, improve your game and represent Polokwane Chess Club at
            local and online events.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {tournaments.map((tournament) => (
            <article
              key={tournament.title}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-red-500/60"
            >
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={tournament.image}
                  alt={`${tournament.title} tournament poster`}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />

                <span className="absolute left-4 top-4 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                  {tournament.status}
                </span>
              </div>

              <div className="p-7">
                <p className="text-sm font-semibold uppercase tracking-wider text-red-400">
                  {tournament.date}
                </p>

                <h3 className="mt-3 text-2xl font-bold">
                  {tournament.title}
                </h3>

                <div className="mt-5 space-y-2 text-sm leading-6 text-gray-400">
                  <p>
                    <span className="font-semibold text-white">Venue:</span>{" "}
                    {tournament.venue}
                  </p>

                  <p>
                    <span className="font-semibold text-white">Format:</span>{" "}
                    {tournament.format}
                  </p>

                  <p>
                    <span className="font-semibold text-white">
                      Time control:
                    </span>{" "}
                    {tournament.timeControl}
                  </p>
                </div>

                <p className="mt-5 border-t border-white/10 pt-5 text-sm leading-6 text-gray-400">
                  {tournament.registration}
                </p>

                {tournament.registrationLink && (
                  <a
                    href={tournament.registrationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-6 inline-block rounded-lg bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                  >
                    Register Now →
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}