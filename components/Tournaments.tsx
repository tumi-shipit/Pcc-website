type Tournament = {
  title: string;
  date: string;
  venue: string;
  format: string;
  status: string;
  registration: string;
};

const tournaments: Tournament[] = [
  {
    title: "PCC Monthly Rapid Tournament",
    date: "Date to be announced",
    venue: "Polokwane, Limpopo",
    format: "Rapid Chess",
    status: "Coming Soon",
    registration: "Registration details will be announced soon.",
  },
  {
    title: "Limpopo Closed Chess Championship",
    date: "Dates to be announced",
    venue: "Polokwane, Limpopo",
    format: "Classical Chess",
    status: "Upcoming",
    registration: "More information will be available soon.",
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

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          {tournaments.map((tournament) => (
            <article
              key={tournament.title}
              className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="flex items-center justify-between bg-black px-7 py-5 text-white">
                <span className="text-sm font-semibold uppercase tracking-widest text-red-400">
                  {tournament.status}
                </span>

                <span className="text-2xl">♟</span>
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
                    <span className="mr-2 font-semibold text-black">Format:</span>
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