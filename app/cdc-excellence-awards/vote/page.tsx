import type { Metadata } from "next";
import PublicPageShell from "@/components/PublicPageShell";

export const metadata: Metadata = {
  title: "Verify Email · 2nd CDC Excellence Awards",
  description: "Verify your email address for the 2nd Capricorn District Chess Excellence Awards voting process.",
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
          <p className="mt-2 leading-7 text-[#bdcbbd]">The results will be announced soon.</p>
        </section>
      </main>
    </PublicPageShell>
  );
}
