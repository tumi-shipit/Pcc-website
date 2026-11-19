import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

export default function GambitBaseShell({ children }: { children: ReactNode }) {
  return (
    <div className="gambitbase-site">
      <header className="sticky top-0 z-50 border-b border-[#d9d3c6] bg-[#f7f4ec]/95 text-[#142239] backdrop-blur">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between gap-4 px-4 md:px-8">
          <Link href="/gambitbase" aria-label="GambitBase home" className="flex shrink-0 items-center gap-2.5">
            <Image src="/images/gambitbase-logo.jpeg" alt="" width={52} height={35} className="h-9 w-[52px] rounded bg-white object-contain" />
            <span className="text-sm font-black tracking-[0.08em] sm:text-base">GAMBIT<span className="text-[#bc8622]">BASE</span></span>
          </Link>
          <nav className="flex items-center gap-3 text-xs font-bold sm:gap-7 sm:text-sm">
            <Link href="/gambitbase/tournaments" className="text-[#364760] transition hover:text-[#bc8622]">Explore events</Link>
            <Link href="/gambitbase#how-it-works" className="hidden text-[#364760] transition hover:text-[#bc8622] md:inline">How it works</Link>
            <Link href="/gambitbase/register" className="rounded-full bg-[#142239] px-3.5 py-2.5 text-white transition hover:bg-[#263c5c] sm:px-5">Enter an event</Link>
          </nav>
        </div>
      </header>
      <div className="min-h-screen">{children}</div>
      <footer className="border-t border-[#c99a3d]/50 bg-[#292929] text-[#f7f4ec]">
        <div className="mx-auto grid max-w-7xl gap-9 px-5 py-12 sm:grid-cols-2 md:grid-cols-[1.3fr_0.7fr_0.7fr] md:px-8 md:py-14">
          <div>
            <Link href="/gambitbase" className="text-sm font-black tracking-[0.12em]">GAMBIT<span className="text-[#e3b451]">BASE</span></Link>
            <p className="mt-3 max-w-sm text-sm leading-6 text-[#d0cbc0]">A home for chess events. Find your next tournament, follow the details, and get your entry on the board.</p>
          </div>
          <nav aria-label="Explore GambitBase">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#e3b451]">Explore</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm font-semibold text-[#f1eee7]">
              <Link href="/gambitbase/tournaments" className="transition hover:text-[#f0c66d]">All tournaments</Link>
              <Link href="/gambitbase#how-it-works" className="transition hover:text-[#f0c66d]">How it works</Link>
            </div>
          </nav>
          <nav aria-label="Enter a chess event">
            <p className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-[#e3b451]">Take your next move</p>
            <div className="mt-4 flex flex-col items-start gap-3 text-sm font-semibold text-[#f1eee7]">
              <Link href="/gambitbase/register" className="transition hover:text-[#f0c66d]">Register for an event</Link>
              <Link href="/gambitbase" className="transition hover:text-[#f0c66d]">GambitBase home</Link>
            </div>
          </nav>
          <p className="border-t border-white/15 pt-4 text-[10px] font-semibold uppercase tracking-[0.15em] text-[#bdb7ac] sm:col-span-2 md:col-span-3">GambitBase <span className="mx-2 text-[#e3b451]">·</span> Chess events, connected.</p>
        </div>
      </footer>
    </div>
  );
}
