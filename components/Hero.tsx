import Image from "next/image";

export default function Hero() {
  return (
    <section className="relative flex min-h-screen items-center overflow-hidden bg-black px-6 pt-24 text-white">
      {/* Background image */}
      <Image
        src="/images/hero/chess-hero.jpg"
        alt="Chess players competing at a tournament"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />

      {/* Dark overlay: keeps text readable */}
      <div className="absolute inset-0 bg-black/70" />

      {/* PCC red gradient overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.92)_0%,rgba(0,0,0,0.72)_48%,rgba(127,0,0,0.28)_100%)]" />

      <div className="relative mx-auto w-full max-w-7xl">
        <div className="max-w-4xl text-center lg:text-left">
          {/* Large PCC logo */}
          <div className="mb-6 flex justify-center lg:justify-start">
            <Image
              src="/logo.png"
              alt="Polokwane Chess Club logo"
              width={260}
              height={260}
              className="h-32 w-32 object-contain md:h-40 md:w-40"
              priority
            />
          </div>

          <p className="mb-6 font-semibold uppercase tracking-[0.3em] text-red-300">
            Polokwane Chess Club
          </p>

          <h1 className="text-5xl font-bold leading-tight md:text-7xl">
            Building Champions
            <span className="block text-red-500">Since 1958</span>
          </h1>

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-8 text-gray-200 md:text-xl lg:mx-0">
            A home for chess players in Polokwane and Limpopo. We develop
            talent, host competitive events and build a stronger chess
            community for every generation.
          </p>

          <div className="mt-10 flex flex-col justify-center gap-4 sm:flex-row lg:justify-start">
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

          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-300 lg:justify-start">
            <span>Established in 1958</span>
            <span className="hidden sm:inline">•</span>
            <span>Polokwane, Limpopo</span>
            <span className="hidden sm:inline">•</span>
            <span>Competitive Chess</span>
          </div>
        </div>
      </div>

      <a
        href="#about"
        className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center transition hover:text-white"
      >
        <p className="text-sm tracking-widest text-gray-300">
          SCROLL TO EXPLORE
        </p>

        <span className="mt-2 block animate-bounce text-xl text-red-400">
          ↓
        </span>
      </a>
    </section>
  );
}