"use client";

import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";
import { supabase } from "@/lib/supabase";

type WinnerRow = { category: string; name: string; surname: string };
type TallyRow = { category: string; name: string; surname: string; votes: number };
type Summary = {
  state: "not_open" | "open" | "closed";
  opens_at: string;
  closes_at: string | null;
  results_at: string;
  winners: WinnerRow[] | null;
  total_voters: number;
  total_votes: number;
  tallies: TallyRow[];
};
type GoogleTallyRow = TallyRow;
type GoogleResponse = Record<string, string>;

function asSastInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Johannesburg",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return get("year") + "-" + get("month") + "-" + get("day") + "T" + get("hour") + ":" + get("minute");
}

function formatSast(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg",
  }).format(new Date(value));
}

export default function CdcVotingAdminPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [closeAt, setCloseAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [googleTally, setGoogleTally] = useState<GoogleTallyRow[]>([]);
  const [googleVoters, setGoogleVoters] = useState(0);
  const [googleImportMessage, setGoogleImportMessage] = useState("");
  const [googleResponses, setGoogleResponses] = useState<GoogleResponse[]>([]);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("cdc_admin_get_voting_summary");
    if (error) {
      setMessage("Voting controls and live results are unavailable. Apply database/cdc_excellence_awards_admin_vote_tally.sql in Supabase, then refresh this page.");
      return;
    }
    const result = data as Summary;
    setSummary(result);
    setCloseAt(asSastInput(result.closes_at));
    setMessage("");
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { void load(); }, 30_000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    void (async () => {
      const { data, error } = await supabase.rpc("cdc_admin_get_google_form_responses");
      if (error) {
        setGoogleImportMessage("Shared Google Forms responses could not be loaded. Apply the Google Forms storage migration in Supabase.");
        return;
      }
      setGoogleResponses((data ?? []) as GoogleResponse[]);
    })();
  }, []);

  useEffect(() => {
    if (googleResponses.length === 0) return;
    const counts = new Map<string, GoogleTallyRow>();
    const categories = new Set(["Coach of the Year", "Arbiter of the Year", "Upcoming Arbiter of the Year", "Organiser of the Year", "Administrator of the Year", "Team Manager of the Year", "Upcoming Manager of the Year"]);
    for (const row of googleResponses) for (const category of categories) {
      const answer = String(row[category] ?? "").trim();
      if (!answer) continue;
      const [name, ...surnameParts] = answer.split(/\s+/);
      const surname = surnameParts.join(" ");
      if (!name || !surname) continue;
      const key = `${category}|${name}|${surname}`;
      const current = counts.get(key) ?? { category, name, surname, votes: 0 };
      current.votes += 1;
      counts.set(key, current);
    }
    setGoogleVoters(googleResponses.length);
    setGoogleTally(Array.from(counts.values()).sort((a, b) => a.category.localeCompare(b.category) || b.votes - a.votes));
  }, [googleResponses]);

  async function setDeadline(value: string | null) {
    setBusy(true);
    setMessage("");
    try {
      const { error } = await supabase.rpc("cdc_admin_set_voting_close_at", { p_closes_at: value });
      if (error) {
        setMessage(error.message);
        return;
      }
      setMessage(value ? "Voting closing date saved." : "No automatic closing date is set.");
      await load();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not update the voting closing date.");
    } finally {
      setBusy(false);
    }
  }

  async function saveDeadline() {
    if (!closeAt) {
      await setDeadline(null);
      return;
    }
    const parsed = new Date(closeAt + ":00+02:00");
    if (!Number.isFinite(parsed.getTime()) || parsed.getTime() <= Date.now()) {
      setMessage("Choose a future closing date and time in South African time. Use Close voting now to end the ballot immediately.");
      return;
    }
    await setDeadline(parsed.toISOString());
  }

  async function closeNow() {
    if (!window.confirm("Close CDC Excellence Awards voting now? Voters will no longer be able to submit a ballot.")) return;
    await setDeadline(new Date().toISOString());
  }

  function importGoogleFormsCsv(file: File) {
    setGoogleImportMessage("Reading Google Forms responses…");
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data: rows }) => {
        void (async () => {
          const { data: added, error } = await supabase.rpc("cdc_admin_import_google_form_responses", { p_rows: rows });
          if (error) {
            setGoogleImportMessage(`Could not save the CSV responses: ${error.message}`);
            return;
          }
          const { data: saved, error: loadError } = await supabase.rpc("cdc_admin_get_google_form_responses");
          if (loadError) {
            setGoogleImportMessage(`Imported responses, but could not refresh the shared tally: ${loadError.message}`);
            return;
          }
          const merged = (saved ?? []) as GoogleResponse[];
          setGoogleResponses(merged);
          setGoogleImportMessage(`Added ${Number(added ?? 0)} new response${Number(added ?? 0) === 1 ? "" : "s"}; ${merged.length} unique responses are counted for all admins.`);
        })();
      },
      error: (error) => setGoogleImportMessage(`Could not read the CSV: ${error.message}`),
    });
  }

  const combinedTally = new Map<string, GoogleTallyRow>();
  for (const row of [...(summary?.tallies ?? []), ...googleTally]) {
    const key = `${row.category}|${row.name}|${row.surname}`;
    const current = combinedTally.get(key) ?? { ...row, votes: 0 };
    current.votes += row.votes;
    combinedTally.set(key, current);
  }
  const displayTally = Array.from(combinedTally.values()).sort((a, b) => a.category.localeCompare(b.category) || b.votes - a.votes);
  const displayVoters = (summary?.total_voters ?? 0) + googleVoters;
  const displaySelections = (summary?.total_votes ?? 0) + googleTally.reduce((total, row) => total + row.votes, 0);

  return (
    <section className="mt-7 rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Voting controls</h2>
          <p className="mt-1 text-sm text-zinc-400">The ballot opens as soon as every approved nominee has accepted or declined. If responses remain pending, it opens at midnight on 22 October 2026 (South African time). Winner names are published on the site at 21:00 on 14 November 2026, once voting is closed.</p>
        </div>
        {summary && <span className="rounded-full border border-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-200">{summary.state.replace("_", " ")}</span>}
      </div>

      {summary && (
        <div className="mt-5 flex flex-wrap items-end gap-3">
          <label className="block text-sm font-semibold text-zinc-200">Voting closes (South African time)
            <input type="datetime-local" value={closeAt} onChange={(event) => setCloseAt(event.target.value)} className="mt-2 block rounded-lg border border-white/15 bg-zinc-950 px-3 py-2 text-sm text-white" />
          </label>
          <button type="button" disabled={busy || summary.state === "closed"} onClick={() => void saveDeadline()} className="rounded-lg bg-amber-300 px-4 py-2.5 text-sm font-black text-zinc-950 disabled:opacity-50">Save closing date</button>
          <button type="button" disabled={busy || summary.state === "closed" || summary.state === "not_open"} onClick={() => void closeNow()} className="rounded-lg border border-red-300/30 px-4 py-2.5 text-sm font-bold text-red-100 disabled:opacity-50">Close voting now</button>
          <p className="w-full text-xs text-zinc-400">{summary.closes_at ? "Scheduled to close " + formatSast(summary.closes_at) + ". " : "No closing date is scheduled yet. "}Winner names publish {formatSast(summary.results_at)} after voting closes. Live totals are available to admins here; voter names and email addresses stay private.</p>
        </div>
      )}

      {message && <p role="status" className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">{message}</p>}

      {summary && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-bold">Current CDC vote tally</h3>
              <p className="mt-1 text-xs text-zinc-400">Combined Supabase and Google Forms tally</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/[0.07] bg-black/15 p-4"><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Voters counted</p><p className="mt-1 text-2xl font-black">{displayVoters}</p></div>
            <div className="rounded-xl border border-white/[0.07] bg-black/15 p-4"><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Selections counted</p><p className="mt-1 text-2xl font-black">{displaySelections}</p></div>
          </div>
          {displayTally.length === 0 ? (
            <p className="mt-4 rounded-lg border border-white/[0.07] bg-black/15 p-4 text-sm text-zinc-400">No votes have been submitted yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {Array.from(new Set(displayTally.map((row) => row.category))).map((category) => {
                const categoryRows = displayTally.filter((row) => row.category === category);
                const categoryTotal = categoryRows.reduce((total, row) => total + row.votes, 0);
                const maxVotes = Math.max(1, ...categoryRows.map((row) => row.votes));
                return <article key={category} className="rounded-xl border border-white/[0.07] bg-black/15 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h4 className="font-bold">{category}</h4><span className="text-xs text-zinc-400">{categoryTotal} vote{categoryTotal === 1 ? "" : "s"}</span></div>
                  <div className="space-y-3">
                    {categoryRows.map((row) => <div key={category + "-" + row.name + "-" + row.surname}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-sm"><span>{row.name} {row.surname}</span><span className="font-bold text-amber-200">{row.votes}</span></div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-amber-300" style={{ width: ((row.votes / maxVotes) * 100) + "%" }} /></div>
                    </div>)}
                  </div>
                </article>;
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-white/10 pt-5">
        <h3 className="font-bold">Temporary Google Forms tally</h3>
        <p className="mt-1 text-xs text-zinc-400">Download the Google Forms responses as CSV, then import it here. This tally is kept separate from Supabase votes.</p>
        <label className="mt-3 inline-flex cursor-pointer rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:border-amber-300/50">
          Import Google Forms CSV
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) importGoogleFormsCsv(file); event.currentTarget.value = ""; }} />
        </label>
        {googleImportMessage && <p role="status" className="mt-3 text-xs text-zinc-300">{googleImportMessage}</p>}
        {googleTally.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/[0.07] bg-black/15 p-4"><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Google Forms voters</p><p className="mt-1 text-2xl font-black">{googleVoters}</p></div>
          <div className="rounded-xl border border-white/[0.07] bg-black/15 p-4"><p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Google selections</p><p className="mt-1 text-2xl font-black">{googleTally.reduce((total, row) => total + row.votes, 0)}</p></div>
        </div>}
        {googleTally.length > 0 && <div className="mt-4 space-y-4">{Array.from(new Set(googleTally.map((row) => row.category))).map((category) => {
          const rows = googleTally.filter((row) => row.category === category);
          const maxVotes = Math.max(1, ...rows.map((row) => row.votes));
          return <article key={category} className="rounded-xl border border-white/[0.07] bg-black/15 p-4"><div className="mb-3 flex items-center justify-between gap-2"><h4 className="font-bold">{category}</h4><span className="text-xs text-zinc-400">{rows.reduce((total, row) => total + row.votes, 0)} votes</span></div>{rows.map((row) => <div key={`${row.category}-${row.name}-${row.surname}`} className="mb-3 last:mb-0"><div className="mb-1 flex items-center justify-between gap-3 text-sm"><span>{row.name} {row.surname}</span><span className="font-bold text-amber-200">{row.votes}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-sky-300" style={{ width: `${(row.votes / maxVotes) * 100}%` }} /></div></div>)}</article>;
        })}</div>}
      </div>

      {summary?.state === "closed" && summary.winners && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold">Award winners</h3>
          </div>
          <div className="mt-4 space-y-2">
            {summary.winners.map((row) => <div key={row.category + "-" + row.name + "-" + row.surname} className="grid gap-1 rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2 text-sm sm:grid-cols-[1fr_1fr]"><span>{row.category}</span><span className="font-semibold">{row.name} {row.surname}</span></div>)}
            {summary.winners.length === 0 && <p className="text-sm text-zinc-400">No winner names are available to display.</p>}
          </div>
        </div>
      )}
      {summary?.state === "closed" && summary.winners === null && (
        <p className="mt-6 border-t border-white/10 pt-5 text-sm text-zinc-300">Voting is closed. Winner names will be published on the site at {formatSast(summary.results_at)}.</p>
      )}
    </section>
  );
}
