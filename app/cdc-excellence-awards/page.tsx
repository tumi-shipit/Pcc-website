import Image from "next/image";
import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import CdcAwardWinnersArchive from "@/components/CdcAwardWinnersArchive";
import CdcAwardOfficialsArchive from "@/components/CdcAwardOfficialsArchive";
import CdcAwardsFeedbackForm from "@/components/CdcAwardsFeedbackForm";

export default function CdcExcellenceAwardsPage() {
  return (
    <PublicPageShell>
      <main className="cdc-awards min-h-screen overflow-hidden bg-[#061b10] text-[#f7f4e9]">
        <section className="cdc-hero relative border-b border-[#d3ad47]/30">
          <div aria-hidden="true" className="cdc-hero-glow" />
          <div className="relative mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-10 md:pb-28 md:pt-40">
            <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
              <div>
                <div className="flex items-center gap-3 text-[#e4c45e]"><span className="h-px w-12 bg-current" /><p className="text-xs font-bold uppercase tracking-[0.32em]">Capricorn District Chess</p></div>
                <p className="mt-8 inline-flex rounded-full border border-[#dfbd58]/40 bg-[#dfbd58]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#f0d878]">Annual awards archive</p>
                <h1 className="mt-7 max-w-4xl font-serif text-6xl font-semibold leading-[0.9] tracking-[-0.045em] text-white md:text-8xl">The people who make chess <span className="text-[#e5c560]">exceptional.</span></h1>
                <p className="mt-8 max-w-2xl text-lg leading-8 text-[#d4dfd4] md:text-xl">The continuing record of the CDC Excellence Awards. Each year, this page will bring together the Player Awards, Officials and Teams, and district recognition.</p>
                <div className="mt-10 flex flex-wrap gap-3"><Link href="#awards-2026-winners" className="cdc-gold-button">View 2026 CDC Excellence Winners</Link><a href="#awards-archive" className="cdc-outline-button">Browse award years</a></div>
              </div>
              <div className="relative mx-auto w-full max-w-[340px]"><div className="absolute -inset-8 rounded-full bg-[#d3ad47]/10 blur-3xl" /><div className="relative rounded-[2rem] border border-[#dfbd58]/45 bg-[#f7f4e9] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)]"><Image src="/images/organisations/capricorn-district-chess.png" alt="Capricorn District Chess crest" width={500} height={500} priority className="h-auto w-full rounded-[1.4rem]" /><div className="mt-4 border-t border-[#17210f]/15 pt-4 text-center"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#17210f]">Excellence · Dedication · Chess</p></div></div></div>
            </div>
          </div>
        </section>

        <section id="awards-archive" aria-labelledby="awards-archive-heading" className="mx-auto max-w-7xl px-5 py-12 md:px-10 md:py-16">
          <div className="mb-6 max-w-3xl">
            <p className="cdc-eyebrow">Year by year</p>
            <h2 id="awards-archive-heading" className="mt-3 font-serif text-4xl font-semibold text-white md:text-5xl">Awards archive</h2>
            <p className="mt-4 leading-7 text-[#c1d0c0]">A growing record of award winners, ceremony details and the people who make chess thrive across Capricorn District.</p>
          </div>
          <article id="awards-2026" className="grid overflow-hidden rounded-[2rem] border border-[#d3ad47]/30 bg-[#0a2617] shadow-[0_30px_100px_rgba(0,0,0,0.28)] lg:grid-cols-[0.85fr_1.15fr]">
            <figure className="relative min-h-[260px] sm:min-h-[360px]">
              <Image src="/images/events/sabc-polokwane-awards-venue.png" alt="SABC Polokwane building beside the intersection and Polokwane direction signs" width={1450} height={1080} sizes="(max-width: 1024px) 100vw, 45vw" className="absolute inset-0 h-full w-full object-cover" />
              <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-5 pb-5 pt-14 text-sm font-semibold text-white sm:px-7 sm:pb-7">A district evening recognising achievement, service and dedication to chess.</figcaption>
            </figure>
            <div className="p-6 sm:p-9 lg:p-12">
              <p className="cdc-eyebrow">2026 · Annual record</p>
              <h3 className="mt-3 font-serif text-3xl font-semibold text-white md:text-4xl">2026 CDC Excellence Awards</h3>
              <p className="mt-4 leading-7 text-[#d4dfd4]">The awards brought together young players, chess officials, teams and community contributors to celebrate excellence across the district.</p>
              <dl className="mt-6 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-black/15 p-4"><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d8bb59]">Date</dt><dd className="mt-1 font-semibold text-white">14 November 2026</dd></div>
                <div className="rounded-xl border border-white/10 bg-black/15 p-4"><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d8bb59]">Arrival</dt><dd className="mt-1 font-semibold text-white">17:00 · Programme 18:00</dd></div>
                <div className="col-span-2 rounded-xl border border-white/10 bg-black/15 p-4"><dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#d8bb59]">Venue</dt><dd className="mt-1 font-semibold leading-6 text-white">SABC Polokwane, 19 Hospital Street, corner of Landros Mare Street, Polokwane, 0700</dd></div>
              </dl>
              <p className="mt-6 text-sm leading-6 text-[#bdcbbd]">The 2026 record includes Player Awards across Under 8 to Under 20, Officials and Teams awards, and special recognition for service and contribution.</p>
              <a href="https://drive.google.com/drive/folders/1MWzMyHZ22WWuwxJeDlNrL6xbKuihZveu?usp=sharing" target="_blank" rel="noopener noreferrer" className="mt-5 inline-flex min-h-11 items-center rounded-lg border border-[#dfbd58]/35 px-4 py-2.5 text-sm font-bold text-amber-100 transition hover:border-[#dfbd58]/70 hover:bg-[#dfbd58]/10">View more photos from the awards <span className="ml-2" aria-hidden="true">↗</span></a>
              <div className="mt-7 flex flex-wrap gap-3"><Link href="#awards-2026-winners" className="cdc-gold-button">Player Awards</Link><Link href="#awards-2026-officials" className="cdc-outline-button">Officials and Teams</Link></div>
            </div>
          </article>
        </section>

        <CdcAwardWinnersArchive />
        <CdcAwardOfficialsArchive />
        <CdcAwardsFeedbackForm />

        <section className="mx-auto max-w-5xl px-5 py-20 text-center md:px-10 md:py-28"><p className="cdc-eyebrow">A district celebration</p><h2 className="mt-5 font-serif text-5xl font-semibold leading-tight md:text-7xl">Thank you for celebrating with us.</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#c1d0c0]">The 2026 CDC Excellence Awards honoured the players, officials, teams and supporters who keep chess moving forward. This archive will continue to grow with each year&apos;s awards.</p><div className="mt-10 flex flex-wrap justify-center gap-3"><Link href="#awards-archive" className="cdc-gold-button">Browse the awards archive</Link><Link href="/" className="cdc-outline-button">Back to Polokwane Chess Club</Link></div></section>
        <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-[#9faf9f] md:px-10"><p>Capricorn District Chess Excellence Awards · Annual archive</p></footer>
      </main>
    </PublicPageShell>
  );
}
