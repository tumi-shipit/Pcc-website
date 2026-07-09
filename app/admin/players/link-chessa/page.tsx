"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminImportSummaryPanel from "@/components/admin/AdminImportSummaryPanel";
import ChessSaLinkExistingTable from "@/components/admin/ChessSaLinkExistingTable";
import {
  analyseExistingPlayersAgainstChessSa,
  ChessSaDatabaseRow,
  ExistingPlayerLinkDecision,
  parseChessSaDatabaseCsv,
} from "@/lib/chessSaLinkExisting";
import { createImportSession, createImportSessionRows } from "@/lib/importSummary";
import type { IdentityPlayer } from "@/lib/identityResolver";
import { supabase } from "@/lib/supabase";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

export default function LinkExistingChessSaPage() {
  const [fileName, setFileName] = useState("");
  const [chessSaRows, setChessSaRows] = useState<ChessSaDatabaseRow[]>([]);
  const [decisions, setDecisions] = useState<ExistingPlayerLinkDecision[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [analysing, setAnalysing] = useState(false);
  const [linking, setLinking] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setSummary(null);
    setMessage("");
    setDecisions([]);

    const text = await file.text();
    const parsed = parseChessSaDatabaseCsv(text);

    if (parsed.length === 0) {
      setMessage("No rows found. Upload a CSV file with headers.");
      return;
    }

    setChessSaRows(parsed);
    setMessage(`${parsed.length} Chess SA row(s) loaded. Click Analyse.`);
  }

  async function analysePlayers() {
    if (chessSaRows.length === 0) {
      setMessage("Upload a Chess SA CSV first.");
      return;
    }

    setAnalysing(true);
    setMessage("");

    const { data, error } = await supabase
      .from("players")
      .select("id, full_name, chess_sa_id, fide_id, date_of_birth, email, phone, club, province, rating")
      .or("chess_sa_id.is.null,verification_status.neq.Verified")
      .limit(10000);

    if (error) {
      setMessage(`Could not load existing players: ${error.message}`);
      setAnalysing(false);
      return;
    }

    const existingPlayers = (data ?? []) as IdentityPlayer[];
    const analysed = analyseExistingPlayersAgainstChessSa(existingPlayers, chessSaRows);

    setDecisions(analysed);
    setMessage("Analysis complete. Only high confidence links will be applied.");
    setAnalysing(false);
  }

  const stats = useMemo(() => {
    return {
      chessSaRows: chessSaRows.length,
      existingPlayers: decisions.length,
      link: decisions.filter((item) => item.action === "link").length,
      review: decisions.filter((item) => item.action === "review").length,
      noMatch: decisions.filter((item) => item.action === "no_match").length,
    };
  }, [chessSaRows, decisions]);

  async function linkPlayers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (decisions.length === 0) {
      setMessage("Analyse first.");
      return;
    }

    setLinking(true);
    setMessage("");

    let updatedRows = 0;
    let skippedRows = 0;
    let failedRows = 0;
    const historyRows: any[] = [];

    for (const decision of decisions) {
      try {
        if (decision.action !== "link" || !decision.match) {
          skippedRows += 1;
          historyRows.push({
            row_number: decision.match?.row_number ?? null,
            imported_name: decision.player.full_name,
            matched_player_id: decision.player.id,
            matched_player_name: decision.match?.full_name ?? null,
            confidence_score: decision.confidence_score,
            status: "Skipped",
            message: decision.action === "review" ? "Needs manual review" : "No reliable match",
            row_data: decision.match?.raw ?? {},
          });
          continue;
        }

        const row = decision.match;

        const { error } = await supabase
          .from("players")
          .update({
            chess_sa_id: row.chess_sa_id,
            fide_id: row.fide_id || decision.player.fide_id || null,
            rating: row.rating ?? decision.player.rating ?? null,
            club: row.club || decision.player.club || null,
            province: row.province || decision.player.province || null,
            date_of_birth: row.date_of_birth || decision.player.date_of_birth || null,
            verification_status: "Verified",
            updated_at: new Date().toISOString(),
          })
          .eq("id", decision.player.id);

        if (error) throw error;

        updatedRows += 1;
        historyRows.push({
          row_number: row.row_number,
          imported_name: decision.player.full_name,
          matched_player_id: decision.player.id,
          matched_player_name: row.full_name,
          confidence_score: decision.confidence_score,
          status: "Linked",
          message: `Linked Chess SA ID. Reasons: ${decision.reasons.join(", ")}`,
          row_data: row.raw,
        });
      } catch (error: any) {
        failedRows += 1;
        historyRows.push({
          row_number: decision.match?.row_number ?? null,
          imported_name: decision.player.full_name,
          matched_player_id: decision.player.id,
          matched_player_name: decision.match?.full_name ?? null,
          confidence_score: decision.confidence_score,
          status: "Failed",
          message: error?.message ?? "Unknown error",
          row_data: decision.match?.raw ?? {},
        });
      }
    }

    const session = await createImportSession({
      import_type: "Link Existing Players to Chess SA",
      source_page: "/admin/players/link-chessa",
      file_name: fileName || null,
      status: failedRows > 0 ? "Completed with errors" : "Completed",
      total_rows: decisions.length,
      matched_rows: updatedRows,
      unmatched_rows: skippedRows,
      updated_rows: updatedRows,
      skipped_rows: skippedRows,
      failed_rows: failedRows,
      summary: {
        purpose: "Link imported PCC players to official Chess SA IDs without creating new players",
      },
    });

    await createImportSessionRows(session.id, historyRows);

    setSummary({
      total_rows: decisions.length,
      matched_rows: updatedRows,
      unmatched_rows: skippedRows,
      created_rows: 0,
      updated_rows: updatedRows,
      skipped_rows: skippedRows,
      failed_rows: failedRows,
      file_name: fileName,
      status: failedRows > 0 ? "Completed with errors" : "Completed",
    });

    setMessage("Existing player linking complete.");
    setLinking(false);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin/players" className="text-sm font-semibold text-red-300 transition hover:text-red-200">
            ← Back to Player Centre
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">PCC v2 — Safe Linking</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">Link Existing Players to Chess SA</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Use this for imported tournament players who already exist in PCC but do not have Chess SA IDs. This tool updates existing players only and does not create new profiles.
            </p>
          </section>

          {message && <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">{message}</p>}

          <section className="mt-8 grid gap-4 md:grid-cols-5">
            <StatCard label="Chess SA Rows" value={stats.chessSaRows} />
            <StatCard label="PCC Players Checked" value={stats.existingPlayers} />
            <StatCard label="Will Link" value={stats.link} tone="green" />
            <StatCard label="Needs Review" value={stats.review} tone="yellow" />
            <StatCard label="No Match" value={stats.noMatch} tone="red" />
          </section>

          <AdminImportSummaryPanel summary={summary} />

          <form onSubmit={linkPlayers} className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-black">Upload Chess SA CSV</h2>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              This will only link existing players. It will not create new players. Recommended columns: full_name, chess_sa_id, rating, fide_id, province and club.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_160px_180px]">
              <input type="file" accept=".csv,text/csv" onChange={handleFile} className={inputClass} />
              <button type="button" onClick={analysePlayers} disabled={analysing || chessSaRows.length === 0} className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500 disabled:opacity-60">
                {analysing ? "Analysing..." : "Analyse"}
              </button>
              <button type="submit" disabled={linking || decisions.length === 0} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
                {linking ? "Linking..." : "Link Existing"}
              </button>
            </div>
          </form>

          <div className="mt-8">
            <ChessSaLinkExistingTable decisions={decisions} />
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
  tone?: "default" | "green" | "yellow" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "red"
      ? "text-red-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}
