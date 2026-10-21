"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import type { AuthSession } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

type Nominee = { name: string; surname: string; school_club: string };
type BallotCategory = { category: string; nominees: Nominee[] };
type SavedVote = { category: string; name: string; surname: string };
type Winner = { category: string; name: string; surname: string };
type Ballot = {
  state: "not_open" | "open" | "closed";
  opens_at: string;
  closes_at: string | null;
  results_at: string;
  winners: Winner[] | null;
  categories: BallotCategory[];
  my_votes: SavedVote[];
};

function formatSast(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(value));
}

export default function CdcVotingBallot() {
  const [email, setEmail] = useState("");
  const [ballot, setBallot] = useState<Ballot | null>(null);
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let active = true;
    const applySession = (session: AuthSession | null, event?: string) => {
      if (!active) return;
      if (!session?.user.email_confirmed_at) {
        setEmail("");
        return;
      }
      setEmail(session.user.email ?? "");
      if (event === "SIGNED_IN") {
        const url = new URL(window.location.href);
        if (url.hash || url.searchParams.has("code")) {
          url.hash = "";
          url.searchParams.delete("code");
          window.history.replaceState(null, "", url.pathname + url.search);
          window.requestAnimationFrame(() => document.getElementById("voting")?.scrollIntoView({ behavior: "smooth" }));
        }
      }
    };

    void supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => applySession(session, event));
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;
    async function loadBallot() {
      setLoading(true);
      const { data, error } = await supabase.rpc("cdc_get_voting_ballot");
      if (!active) return;
      if (error) {
        setMessage("The ballot is being prepared. Please check back shortly.");
      } else {
        const result = data as Ballot; const eligibleCategories = result.categories.filter(({ nominees }) => nominees.length >= 2); const eligibleCategoryNames = new Set(eligibleCategories.map(({ category }) => category)); setBallot({ ...result, categories: eligibleCategories }); setChoices(Object.fromEntries(result.my_votes.filter(({ category }) => eligibleCategoryNames.has(category)).map((vote) => [vote.category, `${vote.name}|${vote.surname}`])));
        
        
      }
      setLoading(false);
    }
    void loadBallot();
    const refreshTimer = window.setInterval(() => { void loadBallot(); }, 30_000);
    return () => {
      active = false;
      window.clearInterval(refreshTimer);
    };
  }, [email]);

  async function submitBallot(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ballot || !email) return;
    setBusy(true);
    setMessage("");
    const selections = ballot.categories.map(({ category, nominees }) => {
      const [name, surname] = (choices[category] ?? "").split("|");
      const selected = nominees.find((item) => item.name === name && item.surname === surname);
      return selected ? { category, name: selected.name, surname: selected.surname } : null;
    });
    if (selections.some((choice) => choice === null)) {
      setMessage("Choose one nominee in every listed category before submitting.");
      setBusy(false);
      return;
    }

    try {
      const { data, error } = await supabase.rpc("cdc_cast_voting_ballot", {
        p_choices: selections,
      });
      if (error) {
        setMessage(error.message);
        return;
      }
      const saved = data as Ballot; const eligibleCategories = saved.categories.filter(({ nominees }) => nominees.length >= 2); const eligibleCategoryNames = new Set(eligibleCategories.map(({ category }) => category)); setBallot({ ...saved, categories: eligibleCategories }); setChoices(Object.fromEntries(saved.my_votes.filter(({ category }) => eligibleCategoryNames.has(category)).map((vote) => [vote.category, `${vote.name}|${vote.surname}`])));
      
      
      setMessage("Your votes have been recorded. You can vote only once in each category.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not submit your votes. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const alreadyVoted = (ballot?.my_votes.length ?? 0) > 0;
  const selectedCategories = ballot?.categories.filter(({ category }) => Boolean(choices[category])).length ?? 0;
  const ballotProgress = ballot?.categories.length ? (selectedCategories / ballot.categories.length) * 100 : 0;

  return (
    <section id="voting" className="mt-12 scroll-mt-28 border-t border-[#d3ad47]/25 pt-10">
      <div className="max-w-3xl">
        <p className="cdc-eyebrow">The public vote</p>
        <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Vote for the 2026 award recipients</h2>
        <p className="mt-4 leading-7 text-[#c1d0c0]">
          Any voter with a verified email may submit one selection in each available category. A submitted vote cannot be changed.
        </p>
      </div>

      {loading ? (
        <p className="mt-6 text-sm text-[#bfccbf]">Loading voting status…</p>
      ) : !ballot ? (
        <p role="status" className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-[#d4dfd4]">{message}</p>
      ) : ballot.state === "not_open" ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-[#d4dfd4]">Voting opens as soon as every approved nominee has accepted or declined. If responses are still pending, voting opens at midnight on 22 October 2026 (South African time).</p>
      ) : ballot.state === "closed" ? (
        <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-[#d4dfd4]">
          <p>Voting is closed. Award winners will be published on this page at {formatSast(ballot.results_at)}.</p>
          {ballot.winners && (
            <div className="mt-5 border-t border-white/10 pt-5">
              <h3 className="font-serif text-2xl font-semibold text-white">2026 Award winners</h3>
              {ballot.winners.length > 0 ? (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {ballot.winners.map((winner) => (
                    <div key={`${winner.category}-${winner.name}-${winner.surname}`} className="rounded-xl border border-[#d3ad47]/20 bg-black/20 p-4">
                      <p className="text-xs font-bold uppercase tracking-wider text-[#e4c45e]">{winner.category}</p>
                      <p className="mt-1 font-semibold text-white">{winner.name} {winner.surname}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="mt-3 text-[#becbbd]">Winner names are not available to display.</p>}
            </div>
          )}
        </div>
      ) : ballot.categories.length === 0 ? (
        <p className="mt-6 rounded-xl border border-white/10 bg-black/20 p-5 text-sm leading-6 text-[#d4dfd4]">No categories have enough eligible nominations to go to a public vote.</p>
      ) : !email ? (
        <div className="mt-6 rounded-2xl border border-[#dfbd58]/25 bg-black/15 p-5">
          <p className="text-sm leading-6 text-[#d4dfd4]">Verify your email to open the ballot. We will send a sign-in link to your inbox and return you here after confirmation.</p>
          <Link href="/cdc-excellence-awards/vote" className="cdc-gold-button mt-4 inline-flex">Verify email and continue</Link>
        </div>
      ) : alreadyVoted ? (
        <div className="mt-6 rounded-2xl border border-[#dfbd58]/25 bg-black/15 p-5">
          <p className="font-semibold text-[#e4c45e]">Ballot submitted</p>
          <p className="mt-2 text-sm text-[#d4dfd4]">Signed in as {email}. Your one vote in each category has been recorded.</p>
        </div>
      ) : (
        <form onSubmit={submitBallot} className="mt-6">
          <p className="mb-5 text-sm text-[#becbbd]">Verified as {email}. Voting closes {ballot.closes_at ? `at ${formatSast(ballot.closes_at)}` : "on a date to be announced"}.</p>
          <div className="mb-5 rounded-xl border border-white/10 bg-black/20 p-4" aria-live="polite">
            <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[#becbbd]"><span>Your ballot progress</span><span>{selectedCategories} of {ballot.categories.length} categories selected</span></div>
            <div
              role="progressbar"
              aria-label="Your ballot completion"
              aria-valuemin={0}
              aria-valuemax={ballot.categories.length}
              aria-valuenow={selectedCategories}
              className="h-2 overflow-hidden rounded-full bg-white/10"
            >
              <div className="h-full rounded-full bg-gradient-to-r from-[#d5a92f] to-[#fff0a3] transition-[width] duration-300" style={{ width: `${ballotProgress}%` }} />
            </div>
            <p className="mt-2 text-[11px] text-[#9faf9f]">This shows only your selections and does not reflect other voters.</p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {ballot.categories.map(({ category, nominees }) => (
              <fieldset key={category} className="cdc-category-panel" disabled={busy}>
                <legend className="font-serif text-xl font-semibold text-white">{category}</legend>
                <div className="mt-4 space-y-2">
                  {nominees.map((nominee) => {
                    const value = `${nominee.name}|${nominee.surname}`;
                    return (
                      <label key={`${category}-${value}`} className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/[0.08] bg-black/15 px-3.5 py-3 text-sm text-[#f3f1e8]">
                        <input required type="radio" name={category} value={value} checked={choices[category] === value} onChange={() => setChoices((current) => ({ ...current, [category]: value }))} className="mt-1 accent-amber-300" />
                        <span><span className="block font-semibold">{nominee.name} {nominee.surname}</span><span className="mt-1 block text-xs text-[#b9c8b9]">{nominee.school_club}</span></span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
          <button disabled={busy || ballot.categories.some(({ category }) => !choices[category])} className="cdc-gold-button mt-6 disabled:cursor-not-allowed disabled:opacity-50">
            {busy ? "Submitting votes…" : "Submit my ballot"}
          </button>
        </form>
      )}

      {message && ballot && ballot.state === "open" && email && !alreadyVoted && (
        <p role="status" className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-[#d4dfd4]">{message}</p>
      )}
      {ballot?.state === "open" && ballot.closes_at && <p className="mt-5 text-xs text-[#9faf9f]">Voting closes {formatSast(ballot.closes_at)} (South African time).</p>}
    </section>
  );
}
