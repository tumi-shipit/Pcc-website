"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AwardFeedback = {
  id: string;
  created_at: string;
  satisfaction: number;
  what_worked_well: string;
  improvements: string;
  issues_faced: string;
};

const satisfactionLabels: Record<number, string> = {
  1: "Very dissatisfied",
  2: "Dissatisfied",
  3: "Neither satisfied nor dissatisfied",
  4: "Satisfied",
  5: "Very satisfied",
};

export default function CdcAwardsFeedbackAdminPanel() {
  const [rows, setRows] = useState<AwardFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFeedback = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await supabase
      .from("cdc_awards_feedback")
      .select("id, created_at, satisfaction, what_worked_well, improvements, issues_faced")
      .eq("award_year", 2026)
      .order("created_at", { ascending: false })
      .limit(500);
    if (result.error) {
      setRows([]);
      setError("Could not load feedback. Apply database/cdc_awards_feedback_setup.sql in the website’s Supabase project first.");
    } else {
      setRows((result.data ?? []) as AwardFeedback[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadFeedback(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadFeedback]);

  const average = useMemo(() => rows.length ? rows.reduce((sum, row) => sum + row.satisfaction, 0) / rows.length : 0, [rows]);

  return (
    <section className="mt-7 rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-200">2026 · Awards feedback</p>
          <h2 className="mt-2 text-xl font-black">Event reviews</h2>
          <p className="mt-1 text-sm text-zinc-400">Anonymous satisfaction ratings and comments, visible to Admin and Super Admin accounts.</p>
        </div>
        <button type="button" onClick={() => void loadFeedback()} disabled={loading} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:border-amber-300/50 disabled:opacity-50">
          {loading ? "Refreshing…" : "Refresh feedback"}
        </button>
      </div>

      {rows.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Responses</p>
            <p className="mt-2 text-2xl font-black text-white">{rows.length}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">Average satisfaction</p>
            <p className="mt-2 text-2xl font-black text-amber-100">{average.toFixed(1)} / 5</p>
          </div>
        </div>
      )}

      {error ? (
        <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-950/20 p-4 text-sm text-amber-100">{error}</p>
      ) : loading ? (
        <p className="mt-5 rounded-xl bg-black/20 p-5 text-sm text-zinc-400">Loading feedback…</p>
      ) : rows.length === 0 ? (
        <p className="mt-5 rounded-xl bg-black/20 p-5 text-sm text-zinc-400">No feedback has been submitted yet.</p>
      ) : (
        <div className="mt-5 space-y-3">
          {rows.map((row) => (
            <article key={row.id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold text-amber-100">{satisfactionLabels[row.satisfaction] ?? `${row.satisfaction} / 5`}</h3>
                <time className="text-xs text-zinc-500" dateTime={row.created_at}>{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(row.created_at))}</time>
              </div>
              <FeedbackText label="What worked well" value={row.what_worked_well} />
              <FeedbackText label="Suggested improvements" value={row.improvements} />
              <FeedbackText label="Issues faced" value={row.issues_faced} />
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function FeedbackText({ label, value }: { label: string; value: string }) {
  if (!value.trim()) return null;
  return <div className="mt-3 border-t border-white/[0.07] pt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-zinc-200">{value}</p></div>;
}
