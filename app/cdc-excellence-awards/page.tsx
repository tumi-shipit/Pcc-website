import Image from "next/image";
import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import { cdcAwardGroups } from "@/lib/cdcAwards";

const highlights = [
  { number: "01", title: "Leadership", text: "Celebrating the people who guide, organise and grow chess across the district." },
  { number: "02", title: "Excellence", text: "Honouring outstanding contribution, commitment and achievement." },
  { number: "03", title: "Community", text: "Bringing the Capricorn District chess family together for one unforgettable evening." },
];

export default function CdcExcellenceAwardsPage() {
  return (
    <PublicPageShell>
      <main className="cdc-awards min-h-screen overflow-hidden bg-[#061b10] text-[#f7f4e9]">
        <section className="cdc-hero relative border-b border-[#d3ad47]/30"><div aria-hidden="true" className="cdc-hero-glow" /><div className="relative mx-auto max-w-7xl px-5 pb-20 pt-28 md:px-10 md:pb-28 md:pt-40"><div className="grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div><div className="flex items-center gap-3 text-[#e4c45e]"><span className="h-px w-12 bg-current" /><p className="text-xs font-bold uppercase tracking-[0.32em]">Capricorn District Chess</p></div><p className="mt-8 inline-flex rounded-full border border-[#dfbd58]/40 bg-[#dfbd58]/10 px-4 py-2 text-xs font-black uppercase tracking-[0.22em] text-[#f0d878]">The countdown to celebration begins</p><h1 className="mt-7 max-w-4xl font-serif text-6xl font-semibold leading-[0.9] tracking-[-0.045em] text-white md:text-8xl">The people who make chess <span className="text-[#e5c560]">exceptional.</span></h1><p className="mt-8 max-w-2xl text-lg leading-8 text-[#d4dfd4] md:text-xl">The 2nd Capricorn District Chess Excellence Awards is an evening dedicated to the people, passion and progress behind our chess community.</p><div className="mt-10 flex flex-wrap gap-3"><span className="cdc-gold-button cursor-default">Voting closed</span><a href="#the-evening" className="cdc-outline-button">Discover the evening</a></div></div>
          <div className="relative mx-auto w-full max-w-[340px]"><div className="absolute -inset-8 rounded-full bg-[#d3ad47]/10 blur-3xl" /><div className="relative rounded-[2rem] border border-[#dfbd58]/45 bg-[#f7f4e9] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)]"><Image src="/images/organisations/capricorn-district-chess.png" alt="Capricorn District Chess crest" width={500} height={500} priority className="h-auto w-full rounded-[1.4rem]" /><div className="mt-4 border-t border-[#17210f]/15 pt-4 text-center"><p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#17210f]">Excellence · Dedication · Chess</p></div></div></div>
        </div></div></section>

        <section id="the-evening" className="mx-auto max-w-7xl px-5 py-10 md:px-10 md:py-14"><div className="grid gap-4 md:grid-cols-3"><EventFact label="The date" value="14 November 2026" /><EventFact label="The venue" value="Northern Academy Secondary School" /><EventFact label="The time" value="17:00" /></div></section>

        <section className="mx-auto max-w-7xl px-5 pb-20 md:px-10 md:pb-28"><div className="max-w-3xl"><p className="cdc-eyebrow">A night worth celebrating</p><h2 className="mt-4 font-serif text-4xl font-semibold leading-tight md:text-6xl">More than an award. A moment for the whole district.</h2><p className="mt-6 text-lg leading-8 text-[#c1d0c0]">From the first move to the final handshake, chess is built by people. This evening brings those people into the spotlight and gives the district a chance to celebrate together.</p></div><div className="mt-12 grid gap-4 md:grid-cols-3">{highlights.map((item) => <article key={item.number} className="cdc-category-panel"><p className="text-sm font-black text-[#dfbd58]">{item.number}</p><h3 className="mt-10 font-serif text-3xl font-semibold">{item.title}</h3><p className="mt-4 leading-7 text-[#bdcbbd]">{item.text}</p></article>)}</div></section>

        <section className="border-y border-[#d3ad47]/25 bg-[#0a2617]"><div className="mx-auto max-w-7xl px-5 py-20 md:px-10 md:py-28"><div className="flex flex-col justify-between gap-8 md:flex-row md:items-end"><div><p className="cdc-eyebrow">The honours</p><h2 className="mt-4 font-serif text-4xl font-semibold md:text-6xl">A stage for excellence.</h2></div><p className="max-w-md leading-7 text-[#c1d0c0]">Every category tells a story of service, achievement and dedication to chess in Capricorn District.</p></div><div className="mt-12 grid gap-4 md:grid-cols-2">{cdcAwardGroups.map((group, index) => <article key={group.title} className="cdc-category-panel"><div className="flex items-start justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#dfbd58]">0{index + 1}</p><h3 className="mt-3 font-serif text-2xl font-semibold">{group.title}</h3></div><span className="rounded-full border border-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#d7ded3]">{group.categories.length} awards</span></div><p className="mt-6 leading-7 text-[#bdcbbd]">{group.description}</p></article>)}</div></div></section>

        <section className="mx-auto max-w-5xl px-5 py-20 text-center md:px-10 md:py-28"><p className="cdc-eyebrow">Thank you for taking part</p><h2 className="mt-5 font-serif text-5xl font-semibold leading-tight md:text-7xl">Voting has closed.</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#c1d0c0]">Thank you to everyone who managed to vote and support the Capricorn District Chess Excellence Awards. The results will be announced soon.</p><div className="mt-10 flex flex-wrap justify-center gap-3"><a href="#the-evening" className="cdc-gold-button">Save the date</a><Link href="/" className="cdc-outline-button">Back to Polokwane Chess Club</Link></div></section>
        <footer className="border-t border-white/10 px-5 py-8 text-center text-xs text-[#9faf9f] md:px-10"><p>2nd Capricorn District Chess Excellence Awards · 2026</p></footer>
      </main>
    </PublicPageShell>
  );
}

function EventFact({ label, value }: { label: string; value: string }) { return <div className="cdc-event-fact"><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#d8bb59]">{label}</p><p className="mt-2 text-lg font-semibold leading-6 text-white">{value}</p></div>; }
