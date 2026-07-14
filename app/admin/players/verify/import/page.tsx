"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminImportSummaryPanel from "@/components/admin/AdminImportSummaryPanel";
import {
  createImportSession,
  createImportSessionRows,
} from "@/lib/importSummary";
import {
  calculateIdentityScore,
  IdentityPlayer,
} from "@/lib/identityResolver";
import { supabase } from "@/lib/supabase";

type ImportedVerificationRow = {
  row_number: number;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  date_of_birth: string | null;
  province: string | null;
  club: string | null;
  rating: number | null;
  raw: Record<string, string>;
};

type ExistingPlayer = IdentityPlayer & {
  verification_status?: string | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function clean(value: string | undefined) {
  const text = String(value ?? "").trim();
  return text || null;
}

function parseCsv(text: string): ImportedVerificationRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(normalizeHeader);

  return lines.slice(1).map((line, index) => {
    const values = line.split(",");
    const row: Record<string, string> = {};

    headers.forEach((header, i) => {
      row[header] = values[i]?.trim() ?? "";
    });

    return {
      row_number: index + 2,
      full_name: clean(row.full_name || row.name || row.player_name) ?? "",
      chess_sa_id: clean(row.chess_sa_id || row.chessa_id || row.chesssa_id),
      fide_id: clean(row.fide_id),
      date_of_birth: clean(row.date_of_birth || row.dob),
      province: clean(row.province),
      club: clean(row.club),
      rating: row.rating ? Number(row.rating) || null : null,
      raw: row,
    };
  });
}

function findBestPlayerMatch(
  imported: ImportedVerificationRow,
  players: ExistingPlayer[]
) {
  const importedIdentity: IdentityPlayer = {
    id: `import-${imported.row_number}`,
    full_name: imported.full_name,
    chess_sa_id: imported.chess_sa_id,
    fide_id: imported.fide_id,
    date_of_birth: imported.date_of_birth,
    province: imported.province,
    club: imported.club,
    rating: imported.rating,
    email: null,
    phone: null,
  };

  return players
    .map((player) => ({
      player,
      match: calculateIdentityScore(importedIdentity, player),
    }))
    .sort((a, b) => b.match.score - a.match.score)[0] ?? null;
}

export default function AdminChessSaVerificationImportPage() {
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportedVerificationRow[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    setFileName(file.name);
    setSummary(null);
    setMessage("");

    const text = await file.text();
    const parsed = parseCsv(text);

    if (parsed.length === 0) {
      setMessage("No rows found. Use a CSV file with headers.");
      return;
    }

    setRows(parsed);
    setMessage(`${parsed.length} row(s) loaded.`);
  }

  const stats = useMemo(() => {
    return {
      total: rows.length,
      withChessSa: rows.filter((row) => row.chess_sa_id).length,
      missingName: rows.filter((row) => !row.full_name).length,
    };
  }, [rows]);

  async function importVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (rows.length === 0) {
      setMessage("Upload a CSV file first.");
      return;
    }

    setImporting(true);
    setMessage("");

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, date_of_birth, email, phone, club, province, rating, verification_status"
      )
      .limit(10000);

    if (playerError) {
      setMessage(`Could not load players: ${playerError.message}`);
      setImporting(false);
      return;
    }

    const players = (playerData ?? []) as ExistingPlayer[];

    let matchedRows = 0;
    let updatedRows = 0;
    let skippedRows = 0;
    let failedRows = 0;

    const historyRows: any[] = [];

    for (const row of rows) {
      try {
        if (!row.full_name || !row.chess_sa_id) {
          skippedRows += 1;
          historyRows.push({
            row_number: row.row_number,
            imported_name: row.full_name || "Missing name",
            status: "Skipped",
            message: "Missing full_name or chess_sa_id",
            row_data: row.raw,
          });
          continue;
        }

        const best = findBestPlayerMatch(row, players);

        if (!best || best.match.score < 65) {
          skippedRows += 1;
          historyRows.push({
            row_number: row.row_number,
            imported_name: row.full_name,
            status: "Needs Review",
            message: `No confident match found. Best score: ${best?.match.score ?? 0}%`,
            confidence_score: best?.match.score ?? null,
            row_data: row.raw,
          });
          continue;
        }

        const { error: updateError } = await supabase
          .from("players")
          .update({
            chess_sa_id: row.chess_sa_id,
            fide_id: row.fide_id || best.player.fide_id || null,
            date_of_birth: row.date_of_birth || best.player.date_of_birth || null,
            province: row.province || best.player.province || null,
            club: row.club || best.player.club || null,
            rating: row.rating ?? best.player.rating ?? null,
            verification_status: "Verified",
            updated_at: new Date().toISOString(),
          })
          .eq("id", best.player.id);

        if (updateError) throw updateError;

        matchedRows += 1;
        updatedRows += 1;

        historyRows.push({
          row_number: row.row_number,
          imported_name: row.full_name,
          matched_player_id: best.player.id,
          matched_player_name: best.player.full_name,
          confidence_score: best.match.score,
          status: "Verified",
          message: `Updated Chess SA ID and marked verified. Reasons: ${best.match.reasons.join(", ")}`,
          row_data: row.raw,
        });
      } catch (error: any) {
        failedRows += 1;
        historyRows.push({
          row_number: row.row_number,
          imported_name: row.full_name,
          status: "Failed",
          message: error?.message ?? "Unknown error",
          row_data: row.raw,
        });
      }
    }

    const session = await createImportSession({
      import_type: "Chess SA Bulk Verification",
      source_page: "/admin/players/verify/import",
      file_name: fileName || null,
      status: failedRows > 0 ? "Completed with errors" : "Completed",
      total_rows: rows.length,
      matched_rows: matchedRows,
      unmatched_rows: skippedRows,
      updated_rows: updatedRows,
      failed_rows: failedRows,
      skipped_rows: skippedRows,
      summary: {
        purpose: "Bulk update Chess SA IDs and verify players",
      },
    });

    await createImportSessionRows(session.id, historyRows);

    setSummary({
      total_rows: rows.length,
      matched_rows: matchedRows,
      unmatched_rows: skippedRows,
      created_rows: 0,
      updated_rows: updatedRows,
      skipped_rows: skippedRows,
      failed_rows: failedRows,
      file_name: fileName,
      status: failedRows > 0 ? "Completed with errors" : "Completed",
    });

    setMessage("Bulk verification completed.");
    setImporting(false);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/players/verify"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Verification Queue
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Chess SA Verification
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Bulk Verify Players
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Upload a CSV file containing player names and Chess SA IDs. PCC
              will match existing player profiles, update their Chess SA IDs and
              mark them as verified.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <StatCard label="Rows loaded" value={stats.total} />
            <StatCard label="With Chess SA ID" value={stats.withChessSa} tone="green" />
            <StatCard label="Missing name" value={stats.missingName} tone="red" />
          </section>

          <AdminImportSummaryPanel summary={summary} />

          <form
            onSubmit={importVerification}
            className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6"
          >
            <h2 className="text-2xl font-black">Upload CSV</h2>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              Required columns: <strong>full_name</strong> and{" "}
              <strong>chess_sa_id</strong>. Optional columns: fide_id,
              date_of_birth, province, club, rating.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFile}
                className={inputClass}
              />

              <button
                type="submit"
                disabled={importing || rows.length === 0}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {importing ? "Verifying..." : "Verify Players"}
              </button>
            </div>
          </form>

          {rows.length > 0 && (
            <section className="mt-8 overflow-auto rounded-3xl border border-white/10 bg-zinc-900">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="p-4">Row</th>
                    <th className="p-4">Full name</th>
                    <th className="p-4">Chess SA ID</th>
                    <th className="p-4">FIDE ID</th>
                    <th className="p-4">Province</th>
                    <th className="p-4">Club</th>
                    <th className="p-4">Rating</th>
                  </tr>
                </thead>

                <tbody>
                  {rows.slice(0, 100).map((row) => (
                    <tr key={row.row_number} className="border-t border-white/10">
                      <td className="p-4 text-gray-400">{row.row_number}</td>
                      <td className="p-4 font-bold text-white">{row.full_name}</td>
                      <td className="p-4 text-gray-300">{row.chess_sa_id ?? "-"}</td>
                      <td className="p-4 text-gray-300">{row.fide_id ?? "-"}</td>
                      <td className="p-4 text-gray-300">{row.province ?? "-"}</td>
                      <td className="p-4 text-gray-300">{row.club ?? "-"}</td>
                      <td className="p-4 text-gray-300">{row.rating ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
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
  tone?: "default" | "green" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
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

