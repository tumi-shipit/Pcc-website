"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import {
  normalizeTournamentRatingType,
  tournamentRatingOptions,
  type TournamentRatingType,
} from "@/lib/ratingTypes";
import { supabase } from "@/lib/supabase";

type RatingRow = {
  rowNumber: number;
  fullName: string;
  chessSaId: string;
  rating: number | null;
  club: string | null;
  province: string | null;
  dateOfBirth: string | null;
  raw: Record<string, string>;
  status: "Ready" | "Skipped" | "Imported" | "Failed";
  message: string;
};

type RatingImportRecord = {
  id: string;
  rating_type: string;
  file_name: string | null;
  imported_at: string;
  imported_count: number | null;
  failed_count: number | null;
  import_status: string | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\uFEFF/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"' && quoted && nextCharacter === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

function cleanText(value: string | null | undefined) {
  const cleanValue = String(value ?? "").trim().replace(/\s+/g, " ");
  return cleanValue || null;
}

function cleanNumber(value: string | null | undefined) {
  const cleanValue = String(value ?? "").replace(/[^\d.-]/g, "");
  const numberValue = Number(cleanValue);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeDate(value: string | null | undefined) {
  const cleanValue = String(value ?? "").trim();
  if (!cleanValue) return null;

  const iso = cleanValue.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (iso) {
    const [, year, month, day] = iso;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const dmy = cleanValue.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return null;
}

function firstValue(raw: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const value = cleanText(raw[key]);
    if (value) return value;
  }

  return null;
}

function parseRatingRows(text: string): RatingRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const raw: Record<string, string> = {};

    headers.forEach((header, headerIndex) => {
      raw[header] = values[headerIndex]?.trim() ?? "";
    });

    const firstName = firstValue(raw, ["first_name", "firstname", "names"]);
    const surname = firstValue(raw, ["surname", "last_name", "lastname"]);
    const joinedName =
      firstName && surname ? `${firstName} ${surname}` : surname ?? firstName;
    const fullName =
      firstValue(raw, [
        "full_name",
        "name",
        "player",
        "player_name",
        "surname_name",
        "surname_and_names",
        "surname_names",
      ]) ?? joinedName ?? "";

    const chessSaId =
      firstValue(raw, [
        "chess_sa_id",
        "chessa_id",
        "chesssa_id",
        "chess_sa",
        "chessa",
        "idnumber",
        "id_number",
        "member_id",
        "sa_id",
        "said",
        "unique_no",
        "uniqueno",
        "player_no",
        "playerno",
      ]) ?? "";
    const rating = cleanNumber(
      firstValue(raw, [
        "rating",
        "standard_rating",
        "rapid_rating",
        "blitz_rating",
        "chessa_rating",
        "rtg",
        "rate",
        "national_rating",
      ])
    );

    return {
      rowNumber: index + 2,
      fullName,
      chessSaId,
      rating,
      club: firstValue(raw, ["club", "club_name"]),
      province: firstValue(raw, ["province", "region", "fed", "federation"]),
      dateOfBirth: normalizeDate(
        firstValue(raw, ["date_of_birth", "dob", "birth_date", "bdate"])
      ),
      raw,
      status:
        chessSaId && rating !== null && rating !== undefined ? "Ready" : "Skipped",
      message:
        chessSaId && rating !== null && rating !== undefined
          ? "Ready to import"
          : "Missing Chess SA ID or rating",
    };
  });
}

function ratingLabel(value: TournamentRatingType) {
  return (
    tournamentRatingOptions.find((option) => option.value === value)?.label ??
    "Classical"
  );
}

export default function AdminImportRatingsPage() {
  const [ratingType, setRatingType] = useState<TournamentRatingType>("standard");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<RatingRow[]>([]);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);
  const [lastImport, setLastImport] = useState<RatingImportRecord | null>(null);

  const stats = useMemo(
    () => ({
      total: rows.length,
      ready: rows.filter((row) => row.status === "Ready").length,
      imported: rows.filter((row) => row.status === "Imported").length,
      skipped: rows.filter((row) => row.status === "Skipped").length,
      failed: rows.filter((row) => row.status === "Failed").length,
    }),
    [rows]
  );

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMessage("Reading rating file...");

    const parsedRows = parseRatingRows(await file.text());

    setRows(parsedRows);
    setMessage(
      parsedRows.length > 0
        ? `${parsedRows.length} row(s) loaded for ${ratingLabel(ratingType)} ratings.`
        : "No rows found. Upload a CSV file with headers."
    );
  }

  async function importRatings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const readyRows = rows.filter((row) => row.status === "Ready");
    if (readyRows.length === 0) {
      setMessage("No ready rows to import.");
      return;
    }

    setImporting(true);
    setMessage(`Importing ${ratingLabel(ratingType)} ratings...`);

    const nextRows = [...rows];
    let imported = 0;
    let failed = 0;
    let ratingImportId: string | null = null;

    const { data: importRecord, error: importError } = await supabase
      .from("rating_imports")
      .insert({
        rating_type: ratingType,
        file_name: fileName || null,
        source: `${ratingLabel(ratingType)} rating import${
          fileName ? `: ${fileName}` : ""
        }`,
        row_count: rows.length,
        imported_count: 0,
        failed_count: 0,
        import_status: "Importing",
      })
      .select("id, rating_type, file_name, imported_at, imported_count, failed_count, import_status")
      .single();

    if (importError || !importRecord) {
      setMessage(
        `Could not start rating import: ${
          importError?.message ??
          "Run database/rating_list_snapshot_setup.sql in Supabase first."
        }`
      );
      setImporting(false);
      return;
    }

    ratingImportId = importRecord.id;
    setLastImport(importRecord as RatingImportRecord);

    for (const row of readyRows) {
      const rowIndex = nextRows.findIndex((item) => item.rowNumber === row.rowNumber);

      try {
        const { data: player, error: playerError } = await supabase
          .from("players")
          .select("id, full_name, chess_sa_id, rating, club, province, date_of_birth, verification_status")
          .eq("chess_sa_id", row.chessSaId)
          .maybeSingle();

        if (playerError) throw playerError;

        let playerId = (player as { id: string } | null)?.id ?? null;

        if (playerId) {
          const updatePayload: Record<string, string | number | null> = {
            full_name: player?.full_name || row.fullName || null,
            club: player?.club || row.club || null,
            province: player?.province || row.province || null,
            date_of_birth: player?.date_of_birth || row.dateOfBirth || null,
            verification_status: player?.verification_status ?? "Verified",
            updated_at: new Date().toISOString(),
          };

          if (ratingType === "standard") {
            updatePayload.rating = row.rating;
          }

          const { error } = await supabase
            .from("players")
            .update(updatePayload)
            .eq("id", playerId);

          if (error) throw error;
        } else {
          const { data: createdPlayer, error } = await supabase
            .from("players")
            .insert({
              full_name: row.fullName || `Chess SA ${row.chessSaId}`,
              chess_sa_id: row.chessSaId,
              rating: ratingType === "standard" ? row.rating : null,
              club: row.club,
              province: row.province,
              date_of_birth: row.dateOfBirth,
              verification_status: "Verified",
            })
            .select("id")
            .single();

          if (error) throw error;
          playerId = createdPlayer.id;
        }

        const { error: historyError } = await supabase
          .from("player_rating_history")
          .insert({
            player_id: playerId,
            rating_import_id: ratingImportId,
            rating_type: ratingType,
            rating: row.rating,
            rating_date: new Date().toISOString().slice(0, 10),
            source: `${ratingLabel(ratingType)} rating import${
              fileName ? `: ${fileName}` : ""
            }`,
          });

        if (historyError) throw historyError;

        imported += 1;
        if (rowIndex >= 0) {
          nextRows[rowIndex] = {
            ...nextRows[rowIndex],
            status: "Imported",
            message: "Imported",
          };
        }
      } catch (error: any) {
        failed += 1;
        if (rowIndex >= 0) {
          nextRows[rowIndex] = {
            ...nextRows[rowIndex],
            status: "Failed",
            message: error?.message ?? "Import failed",
          };
        }
      }
    }

    const importStatus = failed > 0 && imported === 0 ? "Failed" : "Completed";
    const { data: completedImport } = await supabase
      .from("rating_imports")
      .update({
        imported_count: imported,
        failed_count: failed,
        import_status: importStatus,
      })
      .eq("id", ratingImportId)
      .select("id, rating_type, file_name, imported_at, imported_count, failed_count, import_status")
      .single();

    if (completedImport) {
      setLastImport(completedImport as RatingImportRecord);
    }

    setRows(nextRows);
    setMessage(
      `${ratingLabel(ratingType)} rating list saved. Imported ${imported}, failed ${failed}. New tournaments using ${ratingLabel(ratingType)} will lock to this file.`
    );
    setImporting(false);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-6xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Admin
          </Link>

          <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Ratings
            </p>
            <h1 className="mt-3 text-4xl font-black">Rating File Import</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              Upload Classical, Rapid or Blitz rating files separately. Tournament
              registration will use the rating list locked on each tournament.
            </p>

            <form onSubmit={importRatings} className="mt-6 grid gap-4 lg:grid-cols-[240px_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Rating type
                </label>
                <select
                  value={ratingType}
                  onChange={(event) =>
                    setRatingType(
                      normalizeTournamentRatingType(
                        event.target.value
                      ) as TournamentRatingType
                    )
                  }
                  disabled={importing}
                  className={inputClass}
                >
                  {tournamentRatingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Upload CSV rating file
                </label>
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleFile}
                  disabled={importing}
                  className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                />
              </div>

              <button
                type="submit"
                disabled={importing || stats.ready === 0}
                className="self-end rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {importing ? "Importing..." : `Import ${ratingLabel(ratingType)}`}
              </button>
            </form>

            {message && (
              <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-gray-300">
                {message}
              </p>
            )}

            {lastImport && (
              <div className="mt-5 rounded-xl border border-green-500/20 bg-green-500/10 p-4 text-sm text-green-100">
                <p className="font-bold">Latest saved list</p>
                <p className="mt-1 text-green-200">
                  {ratingLabel(normalizeTournamentRatingType(lastImport.rating_type))} -{" "}
                  {lastImport.file_name ?? "Rating file"} -{" "}
                  {lastImport.imported_count ?? 0} imported
                </p>
              </div>
            )}

            <div className="mt-6 grid gap-3 sm:grid-cols-5">
              <Stat label="Rows" value={stats.total} />
              <Stat label="Ready" value={stats.ready} />
              <Stat label="Imported" value={stats.imported} tone="green" />
              <Stat label="Skipped" value={stats.skipped} tone="warn" />
              <Stat label="Failed" value={stats.failed} tone="red" />
            </div>
          </div>

          <section className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            <div className="border-b border-white/10 p-4">
              <h2 className="text-xl font-black">Preview</h2>
              <p className="mt-1 text-sm text-gray-400">
                Expected columns include Chess SA ID, name and rating. Optional
                columns: club, province and date of birth.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-[0.18em] text-gray-500">
                  <tr>
                    <th className="p-4">Row</th>
                    <th className="p-4">Player</th>
                    <th className="p-4">Chess SA</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Club</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Message</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {rows.slice(0, 200).map((row) => (
                    <tr key={row.rowNumber}>
                      <td className="p-4 text-gray-500">{row.rowNumber}</td>
                      <td className="p-4 font-semibold text-white">
                        {row.fullName || "-"}
                      </td>
                      <td className="p-4 text-gray-300">{row.chessSaId || "-"}</td>
                      <td className="p-4 text-gray-300">{row.rating ?? "-"}</td>
                      <td className="p-4 text-gray-300">{row.club ?? "-"}</td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            row.status === "Imported"
                              ? "bg-green-500/10 text-green-300"
                              : row.status === "Failed"
                                ? "bg-red-500/10 text-red-300"
                                : row.status === "Skipped"
                                  ? "bg-yellow-500/10 text-yellow-300"
                                  : "bg-blue-500/10 text-blue-300"
                          }`}
                        >
                          {row.status}
                        </span>
                      </td>
                      <td className="p-4 text-gray-400">{row.message}</td>
                    </tr>
                  ))}

                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-gray-500">
                        Upload a rating CSV to preview rows.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "warn" | "red";
}) {
  const toneClass =
    tone === "green"
      ? "text-green-300"
      : tone === "warn"
        ? "text-yellow-300"
        : tone === "red"
          ? "text-red-300"
          : "text-white";

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
        {label}
      </p>
      <p className={`mt-2 text-2xl font-black ${toneClass}`}>{value}</p>
    </div>
  );
}
