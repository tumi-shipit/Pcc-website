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
      <main className="min-h-screen bg-black px-4 pb-16 pt-28 text-white md:px-6">
        <section className="mx-auto grid max-w-7xl gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.28em] text-red-400">
              PCC Store
            </p>
            <h1 className="mt-4 max-w-4xl text-5xl font-black leading-tight md:text-7xl">
              Store coming soon
            </h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-gray-300 md:text-xl md:leading-9">
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
                className="rounded-lg border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white hover:text-black"
              >
                View tournaments
              </Link>
              <Link
                href="/contact"
                className="rounded-lg border border-white/15 bg-black px-5 py-3 text-sm font-black text-white transition hover:border-red-400"
              >
                Contact PCC
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl shadow-black/30">
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-red-200">
                In development
              </p>
              <h2 className="mt-3 text-2xl font-black text-white">
                Apparel range under review
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-300">
                The store will open only after PCC confirms the product range,
                supplier, sizes, prices and order process.
              </p>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StoreNote title="Polos" text="Club and tournament wear" />
              <StoreNote title="Hoodies" text="Warm-up and supporter gear" />
              <StoreNote title="Jackets" text="Team and travel concepts" />
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
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-sm font-black text-white">{title}</p>
      <p className="mt-2 text-xs leading-5 text-gray-500">{text}</p>
    </div>
  );
}
