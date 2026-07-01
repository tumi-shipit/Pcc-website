type Leader = {
  name: string;
  role: string;
  description: string;
};

const leaders: Leader[] = [
  {
    name: "Joe Mahomole",
    role: "Club Manager",
    description:
      "Leading the growth of chess in Limpopo through mentorship, competition and community development.",
  },
  {
    name: "Tumelo Mmola",
    role: "Club Captain",
    description:
      "Supporting players, organising tournaments and helping develop the next generation of competitive chess players.",
  },
  {
    name: "Tebogo Mahomole",
    role: "Club Official",
    description:
      "Committed to strengthening the club through administration, events and player development.",
  },
];

export default function Leadership() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">

        <div className="text-center">
          <p className="uppercase tracking-[0.3em] text-red-600 font-semibold">
            Leadership
          </p>

          <h2 className="mt-4 text-5xl font-bold text-black">
            Meet The Team
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600">
            Behind every successful chess club is a dedicated team committed
            to growing the game and inspiring future champions.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">

          {leaders.map((leader) => (
            <div
              key={leader.name}
              className="rounded-3xl border border-gray-200 bg-white p-8 shadow-lg transition hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-gray-200 text-gray-500">
                Photo
              </div>

              <h3 className="text-center text-2xl font-bold text-black">
                {leader.name}
              </h3>

              <p className="mt-2 text-center font-semibold text-red-600">
                {leader.role}
              </p>

              <p className="mt-6 text-center leading-7 text-gray-600">
                {leader.description}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}