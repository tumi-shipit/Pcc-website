"use client";

import { useEffect, useState } from "react";
import { publicSupabase } from "@/lib/publicSupabase";

const closingTime = new Date("2026-10-22T00:00:00+02:00").getTime();
type RemainingTime = { days: number; hours: number; minutes: number; seconds: number };
type VotingState = "checking" | "not_open" | "open" | "closed" | "unavailable";

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
  const [votingState, setVotingState] = useState<VotingState>("checking");

  useEffect(() => {
    let cancelled = false;
    async function refreshVotingState() {
      const { data, error } = await publicSupabase.rpc("cdc_get_voting_ballot");
      if (cancelled) return;
      if (error) {
        setVotingState("unavailable");
        return;
      }
      const state = (data as { state?: string } | null)?.state;
      setVotingState(state === "open" || state === "closed" ? state : "not_open");
    }
    void refreshVotingState();
    const statusInterval = window.setInterval(() => { void refreshVotingState(); }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(statusInterval);
    };
  }, []);

  useEffect(() => {
    if (votingState !== "not_open") return;
    const update = () => setRemaining(getRemainingTime());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [votingState]);

  if (votingState === "open") return null;

  return (
    <div className="cdc-countdown-panel" aria-live="polite" aria-label="Nominee response and voting status">
      {votingState === "checking" ? (
        <p className="text-sm text-[#c1d0c0]">Checking voting status…</p>
      ) : votingState === "unavailable" ? (
        <p className="text-sm leading-6 text-[#c1d0c0]">Voting status is temporarily unavailable. Please refresh the page in a moment.</p>
      ) : votingState === "closed" ? (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e4c45e]">Voting has closed</p>
          <p className="mt-3 text-sm leading-6 text-[#c1d0c0]">The nominee response period has ended and the accepted nominee list is public.</p>
        </>
      ) : remaining ? (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e4c45e]">Nominee responses close in</p>
          <div className="mt-3 grid grid-cols-4 gap-2">
            <CountdownUnit label="Days" value={remaining.days} />
            <CountdownUnit label="Hours" value={remaining.hours} />
            <CountdownUnit label="Minutes" value={remaining.minutes} />
            <CountdownUnit label="Seconds" value={remaining.seconds} />
          </div>
          <p className="mt-3 text-[11px] text-[#aabbaa]">Closes at 00:00 on Thursday, 22 October (South African time).</p>
        </>
      ) : (
        <>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#e4c45e]">Nominee responses are closed</p>
          <p className="mt-3 text-sm leading-6 text-[#c1d0c0]">The accepted nominee list is public. Verify your email to cast one vote in each available category.</p>
        </>
      )}
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
