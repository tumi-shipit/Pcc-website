import Navbar from "@/components/Navbar";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white pt-24">

      <Navbar />

      {/* HERO */}
      <section className="relative flex min-h-[80vh] items-center justify-center px-6 text-center">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-72 w-72 rounded-full bg-red-600/20 blur-3xl"></div>
        </div>

        <div className="relative max-w-5xl">
          <p className="mb-6 text-sm uppercase tracking-[0.4em] text-red-600">
            Since 1958
          </p>

          <h1 className="text-5xl font-extrabold md:text-7xl">
            Polokwane Chess Club
          </h1>

          <p className="mt-6 text-xl text-gray-300 md:text-2xl">
            Building Champions Through Strategy, Discipline & Excellence
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <button className="rounded-lg bg-red-600 px-8 py-4 font-semibold hover:bg-red-700 transition">
              Become a Member
            </button>

            <button className="rounded-lg border border-white px-8 py-4 font-semibold hover:bg-white hover:text-black transition">
              Upcoming Tournaments
            </button>
          </div>
        </div>
      </section>

      {/* LEGACY SECTION */}
      <section className="px-6 py-20 text-center border-t border-white/10">
        <h2 className="text-3xl font-bold md:text-4xl">
          Our Legacy
        </h2>

        <p className="mx-auto mt-6 max-w-3xl text-gray-400">
          For over six decades, Polokwane Chess Club has been a foundation for
          developing strategic thinkers, competitive players, and national-level talent.
        </p>
      </section>

      {/* STATS SECTION */}
      <section className="grid gap-6 px-6 py-16 text-center md:grid-cols-3">
        <div className="rounded-lg border border-white/10 p-6">
          <h3 className="text-4xl font-bold text-red-500">60+</h3>
          <p className="mt-2 text-gray-400">Years of Excellence</p>
        </div>

        <div className="rounded-lg border border-white/10 p-6">
          <h3 className="text-4xl font-bold text-red-500">500+</h3>
          <p className="mt-2 text-gray-400">Players Developed</p>
        </div>

        <div className="rounded-lg border border-white/10 p-6">
          <h3 className="text-4xl font-bold text-red-500">50+</h3>
          <p className="mt-2 text-gray-400">Tournaments Hosted</p>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="px-6 py-20 text-center border-t border-white/10">
        <h2 className="text-3xl font-bold">
          Ready to Join PCC?
        </h2>

        <p className="mt-4 text-gray-400">
          Become part of a growing chess legacy in Limpopo.
        </p>

        <button className="mt-8 rounded-lg bg-red-600 px-8 py-4 font-semibold hover:bg-red-700 transition">
          Join the Club
        </button>
      </section>

    </main>
  );
}