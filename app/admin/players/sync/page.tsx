"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminImportSummaryPanel from "@/components/admin/AdminImportSummaryPanel";
import ChessSaSyncReviewTable from "@/components/admin/ChessSaSyncReviewTable";
import {
  analyseChessSaRows,
  ChessSaSyncDecision,
  ChessSaSyncRow,
  parseChessSaCsv,
} from "@/lib/chessSaSync";
import {
  createImportSession,
  createImportSessionRows,
} from "@/lib/importSummary";
import type { IdentityPlayer } from "@/lib/identityResolver";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

export default function AdminPlayersSyncPage() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ChessSaSyncRow[]>([]);
  const [decisions, setDecisions] = useState<ChessSaSyncDecision[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [syncing, setSyncing] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setSummary(null);
    setMessage("");
    setDecisions([]);

    const text = await file.text();
    const parsed = parseChessSaCsv(text);

    if (parsed.length === 0) {
      setMessage("No rows found. Upload a CSV file with headers.");
      return;
    }

    setRows(parsed);
    setMessage(`${parsed.length} Chess SA row(s) loaded. Click Analyse to preview matches.`);
  }

  async function analyseRows() {
    if (rows.length === 0) {
      setMessage("Upload a file first.");
      return;
    }

    setAnalysing(true);
    setMessage("");

    const { data, error } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, date_of_birth, email, phone, club, province, rating"
      )
      .limit(20000);

    if (error) {
      setMessage(`Could not load existing players: ${error.message}`);
      setAnalysing(false);
      return;
    }

    const existingPlayers = (data ?? []) as IdentityPlayer[];
    const analysed = analyseChessSaRows(rows, existingPlayers);

    setDecisions(analysed);
    setMessage("Analysis complete. Review the preview before starting sync.");
    setAnalysing(false);
  }

  const stats = useMemo(() => {
    return {
      total: rows.length,
      withChessSa: rows.filter((row) => row.chess_sa_id).length,
      updateExisting: decisions.filter((d) => d.action === "update_existing").length,
      createNew: decisions.filter((d) => d.action === "create_new").length,
      review: decisions.filter((d) => d.action === "review").length,
    };
  }, [rows, decisions]);

  async function startSync(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (decisions.length === 0) {
      setMessage("Analyse the file before syncing.");
      return;
    }

    setSyncing(true);
    setMessage("");

    let updatedRows = 0;
    let createdRows = 0;
    let skippedRows = 0;
    let failedRows = 0;

    const historyRows: any[] = [];

    for (const decision of decisions) {
      try {
        const row = decision.row;

        if (decision.action === "review") {
          skippedRows += 1;
          historyRows.push({
            row_number: row.row_number,
            imported_name: row.full_name,
            matched_player_id: decision.matched_player_id,
            matched_player_name: decision.matched_player_name,
            confidence_score: decision.confidence_score,
            status: "Needs Review",
            message: decision.reasons.join(", "),
            row_data: row.raw,
          });
          continue;
        }

        if (decision.action === "update_existing" && decision.matched_player_id) {
          const { error } = await supabase
            .from("players")
            .update({
              chess_sa_id: row.chess_sa_id,
              fide_id: row.fide_id,
              club: row.club,
              province: row.province,
              rating: row.rating,
              date_of_birth: row.date_of_birth,
              title: row.title,
              verification_status: "Verified",
              updated_at: new Date().toISOString(),
            })
            .eq("id", decision.matched_player_id);

          if (error) throw error;

          updatedRows += 1;

          historyRows.push({
            row_number: row.row_number,
            imported_name: row.full_name,
            matched_player_id: decision.matched_player_id,
            matched_player_name: decision.matched_player_name,
            confidence_score: decision.confidence_score,
            status: "Updated",
            message: decision.reasons.join(", "),
            row_data: row.raw,
          });

          continue;
        }

        if (decision.action === "create_new") {
          const { data, error } = await supabase
            .from("players")
            .insert({
              full_name: row.full_name,
              chess_sa_id: row.chess_sa_id,
              fide_id: row.fide_id,
              club: row.club,
              province: row.province,
              rating: row.rating,
              date_of_birth: row.date_of_birth,
              title: row.title,
              verification_status: "Verified",
            })
            .select("id, full_name")
            .single();

          if (error || !data) throw error ?? new Error("Could not create player");

          createdRows += 1;

          historyRows.push({
            row_number: row.row_number,
            imported_name: row.full_name,
            matched_player_id: data.id,
            matched_player_name: data.full_name,
            confidence_score: decision.confidence_score,
            status: "Created",
            message: "Created new verified player from Chess SA file.",
            row_data: row.raw,
          });
        }
      } catch (error: any) {
        failedRows += 1;
        historyRows.push({
          row_number: decision.row.row_number,
          imported_name: decision.row.full_name,
          status: "Failed",
          message: error?.message ?? "Unknown error",
          row_data: decision.row.raw,
        });
      }
    }

    const session = await createImportSession({
      import_type: "Chess SA Master Sync",
      source_page: "/admin/players/sync",
      file_name: fileName || null,
      status: failedRows > 0 ? "Completed with errors" : "Completed",
      total_rows: decisions.length,
      matched_rows: updatedRows,
      unmatched_rows: skippedRows,
      created_rows: createdRows,
      updated_rows: updatedRows,
      skipped_rows: skippedRows,
      failed_rows: failedRows,
      summary: {
        version: "PCC v2.1",
        purpose: "Master Chess SA player database synchronization",
      },
    });

    await createImportSessionRows(session.id, historyRows);

    setSummary({
      total_rows: decisions.length,
      matched_rows: updatedRows,
      unmatched_rows: skippedRows,
      created_rows: createdRows,
      updated_rows: updatedRows,
      skipped_rows: skippedRows,
      failed_rows: failedRows,
      file_name: fileName,
      status: failedRows > 0 ? "Completed with errors" : "Completed",
    });

    setMessage("Chess SA synchronization complete.");
    setSyncing(false);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin/players" className="text-sm font-semibold text-red-300 transition hover:text-red-200">
            ← Back to Player Centre
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              PCC v2 — National Player Database
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Chess SA Master Sync
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Upload the latest Chess SA ratings file. PCC will match existing
              players, update ratings and IDs, create missing profiles, verify
              players and save a full import report.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-5">
            <StatCard label="Rows" value={stats.total} />
            <StatCard label="With Chess SA" value={stats.withChessSa} tone="green" />
            <StatCard label="Update Existing" value={stats.updateExisting} tone="green" />
            <StatCard label="Create New" value={stats.createNew} tone="blue" />
            <StatCard label="Review" value={stats.review} tone="yellow" />
          </section>

          <AdminImportSummaryPanel summary={summary} />

          <form
            onSubmit={startSync}
            className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6"
          >
            <h2 className="text-2xl font-black">Upload Chess SA CSV</h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Recommended columns: full_name, chess_sa_id, fide_id, rating,
              province, club, date_of_birth and title.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_160px_160px]">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className={inputClass}
              />

              <button
                type="button"
                onClick={analyseRows}
                disabled={analysing || rows.length === 0}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500 disabled:opacity-60"
              >
                {analysing ? "Analysing..." : "Analyse"}
              </button>

              <button
                type="submit"
                disabled={syncing || decisions.length === 0}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {syncing ? "Syncing..." : "Start Sync"}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <ChessSaSyncReviewTable decisions={decisions} />
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "yellow" | "blue";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "blue"
      ? "text-blue-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}
