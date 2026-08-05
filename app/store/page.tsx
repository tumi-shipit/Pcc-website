import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";

export const metadata: Metadata = {
  title: "PCC Store Coming Soon | Polokwane Chess Club",
  description:
    "PCC merchandise is being prepared. Polokwane Chess Club apparel and supporter items will be available soon.",
};

export default function StorePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#f4f0e8] px-4 pb-16 pt-28 text-zinc-950 md:px-6">
        <section className="mx-auto grid max-w-7xl gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.28em] text-red-700">
              PCC Store
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight md:text-7xl">
              Store coming soon
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-zinc-700 md:text-xl md:leading-9">
              PCC merchandise is being prepared. Apparel and supporter items
              will be shared here once designs, pricing and manufacturing are
              finalised.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-lg bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
              >
                Back home
              </Link>
              <Link
                href="/#tournaments"
                className="rounded-lg border border-zinc-300 bg-white px-5 py-3 text-sm font-black text-zinc-950 transition hover:border-red-400"
              >
                View tournaments
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-zinc-950 bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-red-700"
              >
                Contact PCC
              </Link>
            </div>

            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              <StoreNote title="Polos" text="Club and tournament wear" />
              <StoreNote title="Hoodies" text="Warm-up and supporter gear" />
              <StoreNote title="Jackets" text="Team and travel concepts" />
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.5rem] border border-zinc-200 bg-white shadow-2xl shadow-zinc-300/60">
            <div className="grid grid-cols-[0.85fr_1.15fr] gap-0 border-b border-zinc-200">
              <MerchTile tone="dark" title="Team black" />
              <MerchTile tone="red" title="Tournament red" />
            </div>
            <div className="grid grid-cols-[1.15fr_0.85fr] gap-0">
              <MerchTile tone="light" title="Club white" />
              <div className="bg-zinc-950 p-5 text-white md:p-7">
                <p className="text-xs font-black uppercase tracking-[0.24em] text-red-300">
                  In development
                </p>
                <h2 className="mt-3 text-2xl font-black">
                  Apparel range under review
                </h2>
                <p className="mt-3 text-sm leading-6 text-zinc-300">
                  The store will open after PCC confirms the product range,
                  supplier, sizes, prices and order process.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

function StoreNote({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-lg shadow-zinc-200/60">
      <p className="text-sm font-black text-zinc-950">{title}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p>
    </div>
  );
}

function MerchTile({ tone, title }: { tone: "dark" | "red" | "light"; title: string }) {
  const styles = {
    dark: "bg-zinc-950 text-white",
    red: "bg-red-700 text-white",
    light: "bg-[#f8f3ea] text-zinc-950",
  };

  return (
    <div className={`relative min-h-64 overflow-hidden p-5 md:p-7 ${styles[tone]}`}>
      <div className="absolute inset-x-6 bottom-0 h-48 rounded-t-[2.5rem] border border-current/20 bg-current/10" />
      <div className="absolute bottom-8 left-1/2 h-28 w-24 -translate-x-1/2 rounded-t-[2rem] border border-current/30 bg-current/10" />
      <div className="absolute bottom-14 left-1/2 h-16 w-44 -translate-x-1/2 rounded-full border border-current/20" />
      <p className="relative text-xs font-black uppercase tracking-[0.22em] opacity-70">
        Preview
      </p>
      <h2 className="relative mt-2 text-2xl font-black">{title}</h2>
    </div>
  );
}
