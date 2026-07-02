import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-black px-6 pt-24 text-white">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.35),_transparent_35%)]" />

      {/* Chessboard-style background pattern */}
      <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(45deg,#ffffff_25%,transparent_25%),linear-gradient(-45deg,#ffffff_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#ffffff_75%),linear-gradient(-45deg,transparent_75%,#ffffff_75%)] [background-position:0_0,0_20px,20px_-20px,-20px_0px] [background-size:40px_40px]" />

      <div className="relative mx-auto w-full max-w-7xl">
        <div className="max-w-4xl">
          <p className="mb-6 font-semibold uppercase tracking-[0.3em] text-red-400">
            Polokwane Chess Club
          </p>

          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Building Champions
            <span className="block text-red-500">Since 1958</span>
          </h1>

          <p className="mt-8 max-w-2xl text-lg leading-8 text-gray-300 md:text-xl">
            A home for chess players in Polokwane and Limpopo. We develop
            talent, host competitive events and build a stronger chess
            community for every generation.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <a
              href="#about"
              className="rounded-xl bg-red-600 px-8 py-4 text-center font-semibold text-white transition hover:bg-red-700"
            >
              Scroll to Explore
            </a>

            <a
              href="#tournaments"
              className="rounded-xl border border-white px-8 py-4 text-center font-semibold text-white transition hover:bg-white hover:text-black"
            >
              Upcoming Tournaments
            </a>
          </div>

          <div className="mt-12 flex flex-wrap gap-6 text-sm text-gray-400">
            <span>Established in 1958</span>
            <span className="hidden sm:inline">•</span>
            <span>Polokwane, Limpopo</span>
            <span className="hidden sm:inline">•</span>
            <span>Competitive Chess</span>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <a
        href="#about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center transition hover:text-white"
      >
        <p className="text-sm tracking-widest text-gray-400">
          SCROLL TO EXPLORE
        </p>

        <span className="mt-2 block animate-bounce text-xl text-red-500">
          ↓
        </span>
      </a>
    </section>
  );
}