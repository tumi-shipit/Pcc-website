import type { Metadata } from "next";
import PublicPageShell from "@/components/PublicPageShell";

export const metadata: Metadata = {
  title: "Voting Closed · CDC Excellence Awards",
  description: "Voting has closed for the 2026 CDC Excellence Awards. View the winners in the annual awards archive.",
  robots: { index: false, follow: false },
};

export default function CdcAwardsVotePage() {
  return (
    <PublicPageShell>
      <main className="flex min-h-screen items-center justify-center bg-[#061b10] px-5 py-24 text-center text-[#f7f4e9]">
        <section className="w-full max-w-2xl rounded-3xl border border-[#d3ad47]/30 bg-[#0a2617] p-8 shadow-[0_0_80px_rgba(197,156,50,0.12)] md:p-14">
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-[#e4c45e]">CDC Excellence Awards</p>
          <h1 className="mt-5 font-serif text-4xl font-semibold md:text-6xl">Thank you for voting!</h1>
          <p className="mt-6 text-xl leading-8 text-[#d4dfd4]">Voting has now closed.</p>
          <p className="mt-2 leading-7 text-[#bdcbbd]">The 2026 winners are now available in the awards archive.</p>
          <a href="/cdc-excellence-awards#awards-2026-winners" className="mt-6 inline-flex rounded-lg bg-amber-300 px-5 py-3 text-sm font-bold text-emerald-950 transition hover:bg-amber-200">View 2026 CDC Excellence Winners</a>
        </section>
      </main>
    </PublicPageShell>
  );
}
