import Link from "next/link";

const partnerName =
  process.env.NEXT_PUBLIC_PARTNER_RANKINGS_NAME || "Limpopo Chess Academy";
const partnerUrl =
  process.env.NEXT_PUBLIC_PARTNER_RANKINGS_URL ||
  "https://limpopochessacademy.co.za/player-rankings";

export default function PublicPlayerRankingsPage() {
  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.22),_transparent_34%)]">
        <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-16">
          <Link
            href="/players"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            Back to Player Centre
          </Link>

          <div className="mt-8 max-w-4xl">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-red-400">
              LCA Rankings
            </p>

            <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
              Rankings are maintained by {partnerName}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              The rankings below are from Limpopo Chess Academy. PCC does not
              independently calculate these public rankings.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-900 p-5 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-red-300">
              Source attribution
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-300">
              The rankings below are from Limpopo Chess Academy. PCC does not
              independently calculate these public rankings.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={partnerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Open Limpopo Chess Academy rankings
            </a>

            <Link
              href="/players"
              className="rounded-xl border border-white/10 bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
            >
              Search Player Centre
            </Link>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white">
          <iframe
            src={partnerUrl}
            title="Limpopo Chess Academy player rankings"
            className="h-[72vh] min-h-[520px] w-full bg-white md:h-[78vh] md:min-h-[720px]"
            loading="lazy"
          />
        </div>

        <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-red-50/80">
          If the view does not load correctly, Limpopo Chess Academy may be
          blocking this. Use the button above to open the official ranking page
          directly.
        </p>
      </section>
    </main>
  );
}
