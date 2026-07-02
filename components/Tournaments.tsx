import Image from "next/image";

type Tournament = {
  title: string;
  date: string;
  venue: string;
  format: string;
  status: string;
  registration: string;
  image: string;
};

const tournaments: Tournament[] = [
  {
    title: "Polokwane Open 2026",
    date: "1 August 2026",
    venue: "Polokwane, Limpopo",
    format: "Tournament details to be announced",
    status: "Upcoming",
    registration:
      "Registration details, venue and playing format will be announced soon.",
    image: "/images/tournaments/polokwane-open-2026.png",
  },
  {
    title: "Women's Day Chess Championship",
    date: "8 August 2026",
    venue: "Polokwane, Limpopo",
    format: "Tournament details to be announced",
    status: "Upcoming",
    registration:
      "Registration details, venue and playing format will be announced soon.",
    image: "/images/tournaments/womens-day-2026.png",
  },
  {
    title: "Polokwane Monthly Rapid",
    date: "Every month",
    venue: "Lichess platform",
    format: "Online Rapid Chess",
    status: "Monthly Event",
    registration:
      "Join PCC online each month on Lichess. Dates and joining details will be announced before every event.",
    image: "/images/tournaments/monthly-rapid.png",
  },
];

export default function Tournaments() {
  return (
    <section id="tournaments" className="bg-zinc-100 py-24 text-black">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <p className="font-semibold uppercase tracking-[0.3em] text-red-600">
              Play With PCC
            </p>

            <h2 className="mt-4 text-4xl font-bold md:text-5xl">
              Upcoming Tournaments
            </h2>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-600">
              Join competitive events, test your skills and become part of the
              growing chess community in Limpopo.
            </p>
          </div>

          <a
            href="#contact"
            className="inline-flex w-fit rounded-xl bg-red-600 px-6 py-3 font-semibold text-white transition hover:bg-red-700"
          >
            Enquire About Events
          </a>
        </div>

        <div className="mt-14 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((tournament) => (
            <article
              key={tournament.title}
              className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="relative h-56 overflow-hidden bg-zinc-200">
                <Image
                  src={tournament.image}
                  alt={`${tournament.title} tournament`}
                  fill
                  sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                  className="object-cover transition duration-500 group-hover:scale-105"
                />

                <div className="absolute left-5 top-5 rounded-full bg-black px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white">
                  {tournament.status}
                </div>
              </div>

              <div className="p-8">
                <h3 className="text-2xl font-bold">{tournament.title}</h3>

                <div className="mt-7 space-y-4 text-gray-600">
                  <p>
                    <span className="mr-2 font-semibold text-black">Date:</span>
                    {tournament.date}
                  </p>

                  <p>
                    <span className="mr-2 font-semibold text-black">Venue:</span>
                    {tournament.venue}
                  </p>

                  <p>
                    <span className="mr-2 font-semibold text-black">
                      Format:
                    </span>
                    {tournament.format}
                  </p>
                </div>

                <div className="mt-8 rounded-2xl bg-zinc-100 p-5 text-sm leading-6 text-gray-600">
                  {tournament.registration}
                </div>

                <a
                  href="#contact"
                  className="mt-8 inline-block font-semibold text-red-600 transition hover:text-red-800"
                >
                  Register interest →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}