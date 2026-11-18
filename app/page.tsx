import Link from "next/link";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import LatestNews from "../components/LatestNews";
import About from "../components/About";
import Achievements from "../components/Achievements";
import Tournaments from "../components/Tournaments";
import Leadership from "../components/Leadership";
import TrustDetails from "../components/TrustDetails";
import Footer from "../components/footer";

export default function Home() {
  return (
    <>
      <Navbar />
      <Hero />

      <section className="border-y border-amber-300/30 bg-[#102b1d] px-5 py-5 text-white md:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">CDC Excellence Awards</p>
            <h2 className="mt-1 text-xl font-black md:text-2xl">CDC Excellence Awards archive</h2>
            <p className="mt-1 text-sm text-emerald-100/80">View the 2026 award record and recipients.</p>
          </div>
          <Link href="/cdc-excellence-awards" className="shrink-0 rounded-lg border border-amber-300/50 px-4 py-2.5 text-sm font-bold text-amber-100 transition hover:bg-amber-300 hover:text-emerald-950">Open awards archive</Link>
        </div>
      </section>

      {/* Latest News */}
      <LatestNews />

      <About />
      <TrustDetails />
      <Achievements />
      <Tournaments />
      <Leadership />
      <Footer />
    </>
  );
}
