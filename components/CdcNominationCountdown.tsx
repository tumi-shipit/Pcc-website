"use client";

import { useEffect, useState } from "react";

const closingTime = new Date("2026-10-26T00:00:00+02:00").getTime();

type RemainingTime = { days: number; hours: number; minutes: number; seconds: number };

function getRemainingTime(): RemainingTime | null {
  const difference = closingTime - Date.now();
  if (difference <= 0) return null;
  const totalSeconds = Math.floor(difference / 1000);
  return {
    days: Math.floor(totalSeconds / 86_400),
    hours: Math.floor((totalSeconds % 86_400) / 3_600),
    minutes: Math.floor((totalSeconds % 3_600) / 60),
    seconds: totalSeconds % 60,
  };
}

export default function CdcNominationCountdown() {
  const [remaining, setRemaining] = useState<RemainingTime | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const update = () => {
      setRemaining(getRemainingTime());
      setReady(true);
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="cdc-countdown-panel" aria-label="Time remaining until nominee responses close">
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e4c45e]">
        {ready && !remaining ? "Nominee responses are closed" : "Nominee responses close in"}
      </p>
      {remaining ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          <CountdownUnit label="Days" value={remaining.days} />
          <CountdownUnit label="Hours" value={remaining.hours} />
          <CountdownUnit label="Minutes" value={remaining.minutes} />
          <CountdownUnit label="Seconds" value={remaining.seconds} />
        </div>
      ) : ready ? (
        <p className="mt-3 text-sm leading-6 text-[#c1d0c0]">The response period ended at midnight on Monday, 26 October (South African time).</p>
      ) : (
        <p className="mt-3 text-sm text-[#c1d0c0]">Calculating time remaining…</p>
      )}
      {ready && remaining && <p className="mt-3 text-[11px] text-[#aabbaa]">Closes at midnight after Sunday, 25 October (South African time).</p>}
    </div>
  );
}

function CountdownUnit({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-[#dfbd58]/20 bg-black/20 px-2 py-2 text-center">
      <p className="font-mono text-xl font-bold tabular-nums text-white">{String(value).padStart(2, "0")}</p>
      <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#aebbaa]">{label}</p>
    </div>
  );
}
