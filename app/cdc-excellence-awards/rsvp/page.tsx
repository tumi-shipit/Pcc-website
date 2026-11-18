import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import CdcAwardsCountdown from "@/components/CdcAwardsCountdown";

export default function CdcNomineeRsvpPage() {
  return (
    <PublicPageShell>
      <main className="cdc-awards min-h-screen bg-[#061b10] px-5 pb-20 pt-28 text-[#f7f4e9] md:pt-36">
        <section className="mx-auto max-w-2xl rounded-3xl border border-[#d3ad47]/30 bg-[#0a2617] p-6 shadow-2xl shadow-black/30 md:p-10">
          <p className="cdc-eyebrow">CDC Excellence Awards · 2026</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-white md:text-5xl">Nominee RSVP</h1>
            <p className="mt-4 leading-7 text-[#c1d0c0]">The awards evening took place on Saturday, 14 November 2026 at SABC Polokwane, 19 Hospital Street, corner of Landros Mare Street, Polokwane, 0700.</p>
          <CdcAwardsCountdown />
          <div role="status" className="mt-8 rounded-2xl border border-amber-200/20 bg-black/20 p-5">
            <p className="font-bold text-amber-200">RSVP submissions are closed</p>
            <p className="mt-2 text-sm leading-6 text-[#c1d0c0]">RSVPs are closed now that the awards evening has taken place. Visit the awards page to see the 2026 Player Awards.</p>
          </div>
          <Link href="/cdc-excellence-awards#awards-2026-winners" className="mt-5 inline-flex text-sm font-semibold text-amber-200 hover:text-white">View the 2026 CDC Excellence winners →</Link>
          <Link href="/cdc-excellence-awards" className="mt-6 inline-flex text-sm font-semibold text-amber-200 hover:text-white">← Back to the awards</Link>
        </section>
      </main>
    </PublicPageShell>
  );
}
