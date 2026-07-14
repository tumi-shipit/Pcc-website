"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as XLSX from "xlsx";
import AdminGuard from "@/components/AdminGuard";
import AdminTournamentTabs from "@/components/admin/AdminTournamentTabs";
import AdminImportSummaryPanel from "@/components/admin/AdminImportSummaryPanel";
import { createImportSession, createImportSessionRows } from "@/lib/importSummary";
import { supabase } from "@/lib/supabase";

type ParsedStanding = {
  rank: number | null;
  name: string;
  rating: number | null;
  points: number | null;
  tieBreak: string | null;
  matchedPlayerId: string | null;
  matchedPlayerName: string | null;
  status: "Matched" | "Unmatched";
};

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  rating: number | null;
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(String(value).replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function findHeaderRow(rows: unknown[][]) {
  return rows.findIndex((row) => {
    const values = row.map((cell) => String(cell ?? "").trim().toLowerCase());
    return values.includes("rank") && values.includes("name") && values.includes("pts");
  });
}

function getColumnIndex(headers: string[], possibleNames: string[]) {
  const lowerHeaders = headers.map((header) => header.toLowerCase().trim());

  return lowerHeaders.findIndex((header) =>
    possibleNames.some((name) => header === name.toLowerCase())
  );
}

export default function ImportTournamentResultsPage() {
  const params = useParams();
  const tournamentId = String(params.id ?? "");

  const [fileName, setFileName] = useState("");
  const [parsedRows, setParsedRows] = useState<ParsedStanding[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loadingPlayers, setLoadingPlayers] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const [lastImportSummary, setLastImportSummary] = useState<null | {
    total_rows: number;
    matched_rows: number;
    unmatched_rows: number;
    created_rows: number;
    updated_rows: number;
    skipped_rows: number;
    failed_rows: number;
    file_name: string | null;
    status: string;
  }>(null);

  const stats = useMemo(() => {
    return {
      total: parsedRows.length,
      matched: parsedRows.filter((row) => row.status === "Matched").length,
      unmatched: parsedRows.filter((row) => row.status === "Unmatched").length,
    };
  }, [parsedRows]);

  async function loadTournamentPlayers() {
    setLoadingPlayers(true);
    setMessage("");

    const { data: registrationData, error: registrationError } = await supabase
      .from("registrations")
      .select("player_id")
      .eq("tournament_id", tournamentId);

    if (registrationError) {
      setMessage(`Could not load registrations: ${registrationError.message}`);
      setLoadingPlayers(false);
      return [];
    }

    const playerIds = [
      ...new Set(
        ((registrationData ?? []) as { player_id: string | null }[])
          .map((row) => row.player_id)
          .filter(Boolean) as string[]
      ),
    ];

    if (playerIds.length === 0) {
      setMessage("No registered players found for this tournament.");
      setPlayers([]);
      setLoadingPlayers(false);
      return [];
    }

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("id, full_name, chess_sa_id, rating")
      .in("id", playerIds)
      .order("full_name", { ascending: true });

    if (playerError) {
      setMessage(`Could not load players: ${playerError.message}`);
      setLoadingPlayers(false);
      return [];
    }

    const playerRows = (playerData ?? []) as Player[];
    setPlayers(playerRows);
    setLoadingPlayers(false);

    return playerRows;
  }

  async function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsedRows([]);
    setMessage("Reading standings file...");

    const tournamentPlayers =
      players.length > 0 ? players : await loadTournamentPlayers();

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet, {
      header: 1,
      defval: "",
    }) as unknown[][];

    const headerRowIndex = findHeaderRow(rows);

    if (headerRowIndex === -1) {
      setMessage("Could not find the standings header row. Expected Rank, Name and Pts columns.");
      event.target.value = "";
      return;
    }

    const headers = rows[headerRowIndex].map((cell) => String(cell ?? "").trim());

    const rankIndex = getColumnIndex(headers, ["Rank"]);
    const nameIndex = getColumnIndex(headers, ["Name"]);
    const ratingIndex = getColumnIndex(headers, ["Rtg", "Rating"]);
    const pointsIndex = getColumnIndex(headers, ["Pts", "Points"]);
    const tieBreakIndex = headers.findIndex((header) =>
      header.toLowerCase().includes("bh")
    );

    if (rankIndex === -1 || nameIndex === -1 || pointsIndex === -1) {
      setMessage("Missing required columns. The file must include Rank, Name and Pts.");
      event.target.value = "";
      return;
    }

    const playerMap = new Map(
      tournamentPlayers.map((player) => [normalizeName(player.full_name), player])
    );

    const parsed = rows
      .slice(headerRowIndex + 1)
      .map((row) => {
        const name = String(row[nameIndex] ?? "").trim();
        if (!name) return null;

        const matchedPlayer = playerMap.get(normalizeName(name)) ?? null;

        return {
          rank: toNumber(row[rankIndex]),
          name,
          rating: ratingIndex >= 0 ? toNumber(row[ratingIndex]) : null,
          points: toNumber(row[pointsIndex]),
          tieBreak:
            tieBreakIndex >= 0 && row[tieBreakIndex] !== ""
              ? String(row[tieBreakIndex])
              : null,
          matchedPlayerId: matchedPlayer?.id ?? null,
          matchedPlayerName: matchedPlayer?.full_name ?? null,
          status: matchedPlayer ? "Matched" : "Unmatched",
        } as ParsedStanding;
      })
      .filter(Boolean) as ParsedStanding[];

    setParsedRows(parsed);
    setMessage(
      `Parsed ${parsed.length} standings rows. ${parsed.filter((row) => row.status === "Matched").length} matched to registered players.`
    );

    event.target.value = "";
  }

  async function importResults() {
    const matchedRows = parsedRows.filter((row) => row.matchedPlayerId);

    if (matchedRows.length === 0) {
      setMessage("No matched rows to import.");
      return;
    }

    const confirmed = window.confirm(
      `Import ${matchedRows.length} matched results? Existing results for this tournament will be deleted first.`
    );

    if (!confirmed) return;

    setImporting(true);
    setMessage("");

    const { error: deleteError } = await supabase
      .from("tournament_results")
      .delete()
      .eq("tournament_id", tournamentId);

    if (deleteError) {
      setMessage(`Could not clear old results: ${deleteError.message}`);
      setImporting(false);
      return;
    }

    const payload = matchedRows.map((row) => ({
      tournament_id: tournamentId,
      player_id: row.matchedPlayerId,
      section_id: null,
      final_position: row.rank,
      points: row.points,
      tie_break: row.tieBreak,
      award_title:
        row.rank === 1
          ? "Champion"
          : row.rank === 2
          ? "Runner-up"
          : row.rank === 3
          ? "Third Place"
          : null,
      notes: `Imported from ${fileName || "Swiss Manager standings"}`,
      updated_at: new Date().toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("tournament_results")
      .insert(payload);

    if (insertError) {
      setMessage(`Could not import results: ${insertError.message}`);
      setImporting(false);
      return;
    }

    try {
      const importSession = await createImportSession({
        import_type: "Tournament Results",
        source_page: "/admin/tournaments/[id]/import-results",
        tournament_id: tournamentId,
        file_name: fileName || null,
        status: "Completed",
        total_rows: parsedRows.length,
        matched_rows: matchedRows.length,
        unmatched_rows: parsedRows.length - matchedRows.length,
        created_rows: matchedRows.length,
        updated_rows: 0,
        skipped_rows: parsedRows.length - matchedRows.length,
        failed_rows: 0,
        summary: {
          note: "Imported matched Swiss Manager standings rows into tournament_results.",
        },
      });

      await createImportSessionRows(
        importSession.id,
        parsedRows.map((row, index) => ({
          row_number: index + 1,
          imported_name: row.name,
          matched_player_id: row.matchedPlayerId,
          matched_player_name: row.matchedPlayerName,
          confidence_score: row.matchedPlayerId ? 100 : 0,
          status: row.matchedPlayerId ? "Imported" : "Skipped",
          message: row.matchedPlayerId
            ? "Imported into tournament results"
            : "Skipped because no matching registered player was found",
          row_data: {
            rank: row.rank,
            rating: row.rating,
            points: row.points,
            tieBreak: row.tieBreak,
          },
        }))
      );
    } catch (summaryError) {
      console.error(summaryError);
    }

    setLastImportSummary({
      total_rows: parsedRows.length,
      matched_rows: matchedRows.length,
      unmatched_rows: parsedRows.length - matchedRows.length,
      created_rows: matchedRows.length,
      updated_rows: 0,
      skipped_rows: parsedRows.length - matchedRows.length,
      failed_rows: 0,
      file_name: fileName || null,
      status: "Completed",
    });

    setMessage(`Imported ${matchedRows.length} results successfully.`);
    setImporting(false);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href={`/admin/tournaments/${tournamentId}/results`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Results Centre
          </Link>

          <AdminTournamentTabs id={tournamentId} />

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Phase 1 Results Engine
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Import Swiss Manager Standings
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Upload a Swiss Manager ranking list. The system reads Rank, Name,
              Points and Tie-breaks, matches players to tournament registrations
              and imports final standings into Tournament Results.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <AdminImportSummaryPanel summary={lastImportSummary} />

          <section className="mt-8 grid gap-6 lg:grid-cols-[420px_1fr]">
            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Upload File
              </p>

              <h2 className="mt-3 text-2xl font-black">Ranking list</h2>

              <div className="mt-6 space-y-4">
                <button
                  type="button"
                  onClick={loadTournamentPlayers}
                  disabled={loadingPlayers}
                  className="w-full rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500 disabled:opacity-60"
                >
                  {loadingPlayers ? "Loading players..." : "Load tournament players"}
                </button>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Swiss Manager ranking file
                  </label>

                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={handleFileUpload}
                    className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white"
                  />
                </div>

                <button
                  type="button"
                  onClick={importResults}
                  disabled={importing || stats.matched === 0}
                  className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {importing ? "Importing..." : "Import Matched Results"}
                </button>
              </div>

              <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                <MiniStat label="Rows" value={stats.total} />
                <MiniStat label="Matched" value={stats.matched} valueClass="text-green-300" />
                <MiniStat label="Unmatched" value={stats.unmatched} valueClass="text-yellow-300" />
              </div>
            </section>

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Preview
              </p>

              <h2 className="mt-3 text-2xl font-black">Parsed standings</h2>

              {parsedRows.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  Upload a ranking list to preview results before importing.
                </p>
              ) : (
                <div className="mt-6 max-h-[650px] overflow-auto rounded-2xl border border-white/10">
                  <table className="w-full min-w-[780px] text-left text-sm">
                    <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="p-3">Rank</th>
                        <th className="p-3">Name</th>
                        <th className="p-3">Points</th>
                        <th className="p-3">Tie-break</th>
                        <th className="p-3">Matched Player</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>

                    <tbody>
                      {parsedRows.map((row, index) => (
                        <tr
                          key={`${row.name}-${index}`}
                          className="border-t border-white/10"
                        >
                          <td className="p-3 font-bold text-white">
                            {row.rank ?? "-"}
                          </td>
                          <td className="p-3 text-gray-300">{row.name}</td>
                          <td className="p-3 text-gray-300">{row.points ?? "-"}</td>
                          <td className="p-3 text-gray-300">{row.tieBreak ?? "-"}</td>
                          <td className="p-3 text-gray-300">
                            {row.matchedPlayerName ?? "Not matched"}
                          </td>
                          <td className="p-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${
                                row.status === "Matched"
                                  ? "bg-green-500/10 text-green-300"
                                  : "bg-yellow-500/10 text-yellow-300"
                              }`}
                            >
                              {row.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function MiniStat({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

