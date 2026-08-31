import Image from "next/image";

export default function About() {
  return (
    <section id="about" className="bg-white py-16 text-black md:py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-red-600">
            About PCC
          </p>

          <h2 className="max-w-2xl text-4xl font-black leading-tight md:text-5xl">
            A chess club in the heart of Polokwane
          </h2>

          <p className="mt-8 text-lg leading-8 text-gray-600">
            Polokwane Chess Club was established in 1958. It is a home for
            chess players in Polokwane and provides tournament information,
            online entry, results and player records through this website.
          </p>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <h3 className="text-3xl font-bold text-red-600">68+</h3>
              <p className="mt-2 text-sm font-semibold text-gray-700">
                Years of club history
              </p>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                Serving players, parents, schools and officials in Polokwane.
              </p>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
              <h3 className="text-3xl font-bold text-red-600">1958</h3>
              <p className="mt-2 text-sm font-semibold text-gray-700">
                Club founded
              </p>
              <p className="mt-3 text-sm leading-6 text-gray-500">
                The year Polokwane Chess Club was established.
              </p>
            </div>
          </div>
        </div>

        <div className="relative h-[420px] overflow-hidden rounded-2xl bg-gray-100 shadow-2xl md:h-[500px]">
          <Image
            src="/images/club/club-photo.jpg"
            alt="Polokwane Chess Club members"
            fill
            sizes="(max-width: 1023px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
