import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import CdcNomineeRsvpForm from "@/components/CdcNomineeRsvpForm";

export default function CdcNomineeRsvpPage() {
  return (
    <PublicPageShell>
      <main className="cdc-awards min-h-screen bg-[#061b10] px-5 pb-20 pt-28 text-[#f7f4e9] md:pt-36">
        <section className="mx-auto max-w-2xl rounded-3xl border border-[#d3ad47]/30 bg-[#0a2617] p-6 shadow-2xl shadow-black/30 md:p-10">
          <p className="cdc-eyebrow">2nd CDC Excellence Awards · 2026</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold text-white md:text-5xl">Nominee RSVP</h1>
          <p className="mt-4 leading-7 text-[#c1d0c0]">Please let us know if you can join us on Saturday, 14 November 2026 at 17:00 at Northern Academy Secondary School. Choose whether you’re the nominee or their guest to see the relevant questions. Each nominee may bring one guest; guests should enter the nominee’s name.</p>
          <CdcNomineeRsvpForm />
          <p className="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-[#9faf9f]">Your contact and attendance details will be used by the awards organisers to plan the event.</p>
          <Link href="/cdc-excellence-awards" className="mt-6 inline-flex text-sm font-semibold text-amber-200 hover:text-white">← Back to the awards</Link>
        </section>
      </main>
    </PublicPageShell>
  );
}
