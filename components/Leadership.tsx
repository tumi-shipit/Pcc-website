import Image from "next/image";

type Leader = {
  name: string;
  role: string;
  description: string;
  image: string;
};

const leaders: Leader[] = [
  {
    name: "Joe Mahomole",
    role: "Club Manager",
    description:
      "Leading the growth of chess in Limpopo through mentorship, competition and community development.",
    image: "/images/leaders/joe.jpeg",
  },
  {
    name: "Tumelo Mmola",
    role: "Club Captain",
    description:
      "Supporting players, organising tournaments and helping develop the next generation of competitive chess players.",
    image: "/images/leaders/tumelo.jpeg",
  },
  {
    name: "Tebogo Mahomole",
    role: "Club Official",
    description:
      "Committed to strengthening the club through administration, events and player development.",
    image: "/images/leaders/tebogo.jpeg",
  },
];

export default function Leadership() {
  return (
    <section className="bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center">
          <p className="font-semibold uppercase tracking-[0.3em] text-red-600">
            Leadership
          </p>

          <h2 className="mt-4 text-4xl font-bold text-black md:text-5xl">
            Meet The Team
          </h2>

          <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600">
            Behind every successful chess club is a dedicated team committed
            to growing the game and inspiring future champions.
          </p>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {leaders.map((leader) => (
            <article
              key={leader.name}
              className="group overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-lg transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="relative h-96 overflow-hidden bg-gray-100">
                <Image
                  src={leader.image}
                  alt={`${leader.name}, ${leader.role} at Polokwane Chess Club`}
                  fill
                  sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"
                  className="object-contain transition duration-500 group-hover:scale-105"
                />
              </div>

              <div className="p-8">
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
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}