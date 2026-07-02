import Image from "next/image";

export default function About() {
  return (
    <section className="bg-white py-24 text-black">
      <div className="mx-auto grid max-w-7xl items-center gap-16 px-6 lg:grid-cols-2">
        <div>
          <p className="mb-3 font-semibold uppercase tracking-[0.3em] text-red-600">
            About PCC
          </p>

          <h2 className="text-4xl font-bold md:text-5xl">
            More Than A Chess Club
          </h2>

          <p className="mt-8 text-lg leading-8 text-gray-600">
            Established in 1958, Polokwane Chess Club has proudly served the
            Limpopo chess community for more than six decades. Through
            coaching, tournaments and youth development, PCC continues to
            inspire strategic thinking while producing competitive players
            across the province.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-6">
            <div className="rounded-xl border p-6">
              <h3 className="text-3xl font-bold text-red-600">68+</h3>
              <p className="mt-2 text-gray-600">Years of Excellence</p>
            </div>

            <div className="rounded-xl border p-6">
              <h3 className="text-3xl font-bold text-red-600">1958</h3>
              <p className="mt-2 text-gray-600">Club Founded</p>
            </div>
          </div>
        </div>

        <div className="relative h-[420px] overflow-hidden rounded-3xl bg-gray-100 shadow-xl md:h-[500px]">
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