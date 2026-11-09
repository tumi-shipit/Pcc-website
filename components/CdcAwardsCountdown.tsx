"use client";

import { useEffect, useState } from "react";

const programmeStart = new Date("2026-11-14T18:00:00+02:00").getTime();

type RemainingTime = { days: number; hours: number; minutes: number; seconds: number };

function getRemainingTime(): RemainingTime | null {
  const milliseconds = programmeStart - Date.now();
  if (milliseconds <= 0) return null;
  const totalSeconds = Math.floor(milliseconds / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export default function CdcAwardsCountdown() {
  const [remaining, setRemaining] = useState<RemainingTime | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const update = () => {
      const next = getRemainingTime();
      setRemaining(next);
      setStarted(next === null);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section aria-label="Countdown to the CDC Excellence Awards programme" className="cdc-countdown-panel mx-auto max-w-7xl">
      <p className="text-center text-xs font-bold uppercase tracking-[0.22em] text-[#e4c45e]">Countdown to the awards programme</p>
      {started ? (
        <p className="mt-4 text-center font-serif text-2xl font-semibold text-white">The celebration is underway</p>
      ) : remaining ? (
        <div role="timer" aria-live="off" className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <CountdownUnit label="Days" value={remaining.days} />
          <CountdownUnit label="Hours" value={remaining.hours} />
          <CountdownUnit label="Minutes" value={remaining.minutes} />
          <CountdownUnit label="Seconds" value={remaining.seconds} />
        </div>
      ) : (
        <p className="mt-4 text-center text-sm text-[#c1d0c0]">Preparing countdown…</p>
      )}
      <p className="mt-4 text-center text-xs text-[#aabbaa]">Saturday, 14 November 2026 at 18:00 South African time</p>
    </section>
  );
}

function CountdownUnit({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#dfbd58]/20 bg-black/20 px-3 py-3 text-center">
      <p className="font-mono text-2xl font-bold tabular-nums text-white">{String(value).padStart(2, "0")}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[#aebbaa]">{label}</p>
    </div>
  );
}
