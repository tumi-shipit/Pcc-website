"use client";

import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";

type ResultRow = { category: string; name: string; surname: string; votes: number };
type Summary = {
  state: "not_open" | "open" | "closed";
  opens_at: string;
  closes_at: string | null;
  voter_count: number;
  results: ResultRow[] | null;
};

function asSastInput(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Johannesburg",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(value));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
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

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc("cdc_admin_get_voting_summary");
    if (error) {
      setMessage("Voting controls are unavailable. Apply database/cdc_excellence_awards_voting_setup.sql in Supabase, then refresh this page.");
      return;
    }
    const result = data as Summary;
    setSummary(result);
    setCloseAt(asSastInput(result.closes_at));
    setMessage("");
  }, []);

  useEffect(() => { void load(); }, [load]);

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
    const parsed = new Date(`${closeAt}:00+02:00`);
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

  function exportResults() {
    if (!summary?.results) return;
    const workbook = XLSX.utils.book_new();
    const rows = summary.results.map((row) => ({
      Category: row.category,
      Nominee: `${row.name} ${row.surname}`,
      Votes: row.votes,
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [{ wch: 34 }, { wch: 30 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, sheet, "CDC Voting Results");
    XLSX.writeFile(workbook, "cdc-excellence-awards-voting-results-2026.xlsx");
  }

  return (
    <section className="mt-7 rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-black">Voting controls</h2>
          <p className="mt-1 text-sm text-zinc-400">The ballot opens automatically at 00:00 on 22 October 2026 (South African time). Set the closing date when it is announced.</p>
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
          <p className="w-full text-xs text-zinc-400">{summary.closes_at ? `Scheduled to close ${formatSast(summary.closes_at)}.` : "No closing date is scheduled yet."} {summary.state === "closed" ? `${summary.voter_count} verified voter(s) took part.` : "Vote totals stay hidden until voting closes."}</p>
        </div>
      )}

      {message && <p role="status" className="mt-4 rounded-lg border border-white/10 bg-black/20 p-3 text-sm text-zinc-200">{message}</p>}

      {summary?.state === "closed" && summary.results && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-bold">Final vote totals</h3>
            <button type="button" onClick={exportResults} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:border-amber-300/50">Export results to Excel</button>
          </div>
          <div className="mt-4 space-y-2">
            {summary.results.map((row) => <div key={`${row.category}-${row.name}-${row.surname}`} className="grid gap-1 rounded-lg border border-white/[0.07] bg-black/15 px-3 py-2 text-sm sm:grid-cols-[1fr_1fr_auto]"><span>{row.category}</span><span className="font-semibold">{row.name} {row.surname}</span><span className="text-amber-200">{row.votes} vote(s)</span></div>)}
            {summary.results.length === 0 && <p className="text-sm text-zinc-400">No votes were submitted.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
