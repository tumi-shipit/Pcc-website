export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black text-white">

      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1580541832626-2a7131ee809f?q=80&w=2070&auto=format&fit=crop')",
        }}
      />

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Content */}
      <div className="relative z-10 max-w-5xl px-6 text-center">

        <div className="mb-6 inline-block rounded-full border border-red-600/40 bg-red-600/10 px-5 py-2 text-sm uppercase tracking-[0.3em] text-red-400">
          Established in 1958 • One of Limpopo's Oldest Chess Clubs
        </div>

        <h1 className="text-5xl font-extrabold leading-tight md:text-7xl">
          Building Champions
          <br />
          <span className="text-red-600">Since 1958</span>
        </h1>

        <p className="mx-auto mt-8 max-w-3xl text-lg leading-8 text-gray-300">
          For more than six decades, Polokwane Chess Club has developed
          strategic thinkers, empowered young players and promoted competitive
          chess throughout Limpopo.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-5">

          <button className="rounded-xl bg-red-600 px-8 py-4 font-semibold transition hover:scale-105 hover:bg-red-700">
            Become a Member
          </button>

          <button className="rounded-xl border border-white px-8 py-4 font-semibold transition hover:bg-white hover:text-black">
            Upcoming Tournaments
          </button>

        </div>

      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 text-center">
        <p className="text-sm tracking-widest text-gray-400">
          SCROLL TO EXPLORE
        </p>

        <div className="mx-auto mt-2 h-10 w-6 rounded-full border border-white">
          <div className="mx-auto mt-2 h-2 w-2 animate-bounce rounded-full bg-red-500"></div>
        </div>
      </div>

    </section>
  );
}