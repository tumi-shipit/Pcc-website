export default function Achievements() {
  return (
    <section className="bg-black py-24 text-white">

      <div className="mx-auto max-w-7xl px-6">

        <p className="text-center uppercase tracking-[0.3em] text-red-500">
          Achievements
        </p>

        <h2 className="mt-3 text-center text-5xl font-bold">
          Trophy Cabinet
        </h2>

        <div className="mt-16 rounded-3xl border border-white/10 bg-zinc-900 p-10">

          <div className="grid items-center gap-10 lg:grid-cols-2">

            <div>

              <span className="rounded-full bg-red-600 px-4 py-2 text-sm">
                2023
              </span>

              <h3 className="mt-6 text-4xl font-bold">
                ULSSA Team Champions
              </h3>

              <p className="mt-6 text-lg leading-8 text-gray-400">
                One of the proudest moments in the club's modern history,
                showcasing teamwork, dedication and excellence.
              </p>

              <button className="mt-8 rounded-lg bg-red-600 px-6 py-3 hover:bg-red-700">
                Read Story
              </button>

            </div>

            <div className="flex h-[400px] items-center justify-center rounded-3xl bg-zinc-800">
              Championship Photo
            </div>

          </div>

        </div>

      </div>

    </section>
  );
}