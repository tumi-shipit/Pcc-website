import Image from "next/image";
import Link from "next/link";

export default function Achievements() {
  return (
    <section className="bg-black py-24 text-white">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center font-semibold uppercase tracking-[0.3em] text-red-500">
          Achievements
        </p>

        <h2 className="mt-3 text-center text-4xl font-bold md:text-5xl">
          Trophy Cabinet
        </h2>

        <p className="mx-auto mt-5 max-w-3xl text-center text-lg text-gray-400">
          Celebrating milestones, championships and memorable moments that have
          shaped our journey.
        </p>

        <div className="mt-16 rounded-3xl border border-white/10 bg-zinc-900 p-6 md:p-10">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <span className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold">
                2023
              </span>

              <h3 className="mt-6 text-3xl font-bold md:text-4xl">
                ULSSA Team Champions
              </h3>

              <p className="mt-6 text-lg leading-8 text-gray-400">
                One of the proudest moments in the club's history, showcasing
                teamwork, determination and excellence as Polokwane Chess Club
                claimed the ULSSA Team Championship.
              </p>

              <Link
                href="/news"
                className="mt-8 inline-flex rounded-lg bg-red-600 px-6 py-3 font-semibold transition hover:bg-red-700"
              >
                View Full Story 
              </Link>
            </div>

            <div className="relative h-[280px] overflow-hidden rounded-3xl md:h-[400px]">
              <Image
                src="/images/achievements/ulssa-2023.JPG"
                alt="Joe Mahomole holding the ULSSA Team Champions trophy in 2023"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
