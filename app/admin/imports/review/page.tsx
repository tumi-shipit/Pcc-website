"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import ImportReviewTable, {
  ImportReviewRow,
} from "@/components/admin/ImportReviewTable";
import AdminImportSummaryPanel from "@/components/admin/AdminImportSummaryPanel";
import {
  ImportedPlayerLike,
  analyseImportIdentities,
} from "@/lib/importIdentityMatcher";
import {
  createImportSession,
  createImportSessionRows,
} from "@/lib/importSummary";
import type { IdentityPlayer } from "@/lib/identityResolver";
import { supabase } from "@/lib/supabase";

type ReviewPayload = {
  import_type: string;
  source_page?: string | null;
  tournament_id?: string | null;
  file_name?: string | null;
  rows: ImportedPlayerLike[];
};

const STORAGE_KEY = "pcc_import_review_payload";

function makeReviewRow(
  decision: ReturnType<typeof analyseImportIdentities>[number],
  index: number
): ImportReviewRow {
  let selected_player_id: string | null = null;
  let resolution: ImportReviewRow["resolution"] = "unresolved";

  if (decision.autoResolution === "use_existing" && decision.bestMatch) {
    const suggested =
      decision.bestMatch.playerA.id.startsWith("import-")
        ? decision.bestMatch.playerB
        : decision.bestMatch.playerA;

    selected_player_id = suggested.id;
    resolution = "use_existing";
  }

  if (decision.autoResolution === "create_new") {
    selected_player_id = "CREATE_NEW";
    resolution = "create_new";
  }

  return {
    id: `row-${index + 1}`,
    row_number: decision.imported.row_number ?? index + 1,
    imported_name: decision.imported_name,
    row_data: decision.imported.raw ?? (decision.imported as Record<string, unknown>),
    match: decision.bestMatch,
    selected_player_id,
    resolution,
  };
}

export default function ImportReviewPage() {
  const [payload, setPayload] = useState<ReviewPayload | null>(null);
  const [players, setPlayers] = useState<IdentityPlayer[]>([]);
  const [rows, setRows] = useState<ImportReviewRow[]>([]);
  const [committing, setCommitting] = useState(false);
  const [summary, setSummary] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadReview() {
    setLoading(true);
    setMessage("");

    const saved = sessionStorage.getItem(STORAGE_KEY);

    if (!saved) {
      setMessage(
        "No import review data found. Go back to the importer and upload a file first."
      );
      setLoading(false);
      return;
    }

    const parsed = JSON.parse(saved) as ReviewPayload;

    const { data, error } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, date_of_birth, email, phone, club, province, rating"
      )
      .order("full_name", { ascending: true })
      .limit(10000);

    if (error) {
      setMessage(`Could not load existing players: ${error.message}`);
      setLoading(false);
      return;
    }

    const existingPlayers = (data ?? []) as IdentityPlayer[];
    const decisions = analyseImportIdentities(parsed.rows, existingPlayers);
    const reviewRows = decisions.map(makeReviewRow);

    setPayload(parsed);
    setPlayers(existingPlayers);
    setRows(reviewRows);
    setLoading(false);
  }

  useEffect(() => {
    loadReview();
  }, []);

  function updateRow(rowId: string, patch: Partial<ImportReviewRow>) {
    setRows((current) =>
      current.map((row) => (row.id === rowId ? { ...row, ...patch } : row))
    );
  }

  const stats = useMemo(() => {
    return {
      total: rows.length,
      useExisting: rows.filter((row) => row.resolution === "use_existing").length,
      createNew: rows.filter((row) => row.resolution === "create_new").length,
      skipped: rows.filter((row) => row.resolution === "skip").length,
      unresolved: rows.filter((row) => row.resolution === "unresolved").length,
      highConfidence: rows.filter((row) => row.match && row.match.score >= 90)
        .length,
    };
  }, [rows]);

  async function commitReview() {
    if (!payload) return;

    if (stats.unresolved > 0) {
      setMessage("Resolve all rows before committing the import.");
      return;
    }

    setCommitting(true);
    setMessage("");

    let createdRows = 0;
    let matchedRows = 0;
    let skippedRows = 0;
    let failedRows = 0;

    const rowHistory: any[] = [];

    for (const row of rows) {
      try {
        if (row.resolution === "skip") {
          skippedRows += 1;
          rowHistory.push({
            row_number: row.row_number,
            imported_name: row.imported_name,
            status: "Skipped",
            message: "Skipped during review",
            row_data: row.row_data,
          });
          continue;
        }

        if (row.resolution === "use_existing") {
          matchedRows += 1;

          const selected = players.find(
            (player) => player.id === row.selected_player_id
          );

          rowHistory.push({
            row_number: row.row_number,
            imported_name: row.imported_name,
            matched_player_id: row.selected_player_id,
            matched_player_name: selected?.full_name ?? null,
            confidence_score: row.match?.score ?? null,
            status: "Matched",
            message: "Linked to existing player",
            row_data: row.row_data,
          });

          continue;
        }

        if (row.resolution === "create_new") {
          const { data: newPlayer, error } = await supabase
            .from("players")
            .insert({
              full_name: row.imported_name,
              chess_sa_id: String(row.row_data.chess_sa_id ?? "").trim() || null,
              fide_id: String(row.row_data.fide_id ?? "").trim() || null,
              club: String(row.row_data.club ?? "").trim() || null,
              province: String(row.row_data.province ?? "").trim() || null,
              rating: Number(row.row_data.rating) || null,
              verification_status: "Pending",
            })
            .select("id, full_name")
            .single();

          if (error || !newPlayer) throw error ?? new Error("Player creation failed");

          createdRows += 1;

          rowHistory.push({
            row_number: row.row_number,
            imported_name: row.imported_name,
            matched_player_id: newPlayer.id,
            matched_player_name: newPlayer.full_name,
            confidence_score: null,
            status: "Created",
            message: "Created new player profile",
            row_data: row.row_data,
          });
        }
      } catch (error: any) {
        failedRows += 1;
        rowHistory.push({
          row_number: row.row_number,
          imported_name: row.imported_name,
          status: "Failed",
          message: error?.message ?? "Unknown error",
          row_data: row.row_data,
        });
      }
    }

    const session = await createImportSession({
      import_type: payload.import_type,
      source_page: payload.source_page ?? "Smart Import Review",
      tournament_id: payload.tournament_id ?? null,
      file_name: payload.file_name ?? null,
      status: failedRows > 0 ? "Completed with errors" : "Completed",
      total_rows: rows.length,
      matched_rows: matchedRows,
      unmatched_rows: stats.unresolved,
      created_rows: createdRows,
      skipped_rows: skippedRows,
      failed_rows: failedRows,
      summary: {
        high_confidence: stats.highConfidence,
        review_version: "Sprint 6",
      },
    });

    await createImportSessionRows(session.id, rowHistory);

    setSummary({
      total_rows: rows.length,
      matched_rows: matchedRows,
      unmatched_rows: stats.unresolved,
      created_rows: createdRows,
      updated_rows: 0,
      skipped_rows: skippedRows,
      failed_rows: failedRows,
      file_name: payload.file_name,
      status: failedRows > 0 ? "Completed with errors" : "Completed",
    });

    sessionStorage.removeItem(STORAGE_KEY);
    setMessage("Smart import review committed.");
    setCommitting(false);
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading smart import review...
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/imports"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Import Centre
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Smart Import Review
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Resolve Player Identity
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Review imported players before creating profiles or linking them
              to existing PCC records.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Rows" value={stats.total} />
            <StatCard label="Use Existing" value={stats.useExisting} tone="green" />
            <StatCard label="Create New" value={stats.createNew} tone="blue" />
            <StatCard label="Skipped" value={stats.skipped} tone="yellow" />
            <StatCard label="Unresolved" value={stats.unresolved} tone="red" />
            <StatCard label="High Confidence" value={stats.highConfidence} tone="green" />
          </section>

          <AdminImportSummaryPanel summary={summary} />

          <section className="mt-8 flex flex-col gap-3 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-black text-white">
                {payload?.file_name ?? "Import review"}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {payload?.import_type ?? "Import"} • {rows.length} rows
              </p>
            </div>

            <button
              type="button"
              onClick={commitReview}
              disabled={committing || stats.unresolved > 0}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {committing ? "Committing..." : "Commit Import"}
            </button>
          </section>

          <div className="mt-8">
            <ImportReviewTable rows={rows} onUpdateRow={updateRow} />
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
  tone?: "default" | "green" | "yellow" | "red" | "blue";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "red"
      ? "text-red-300"
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
