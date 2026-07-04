"use client";

import AdminGuard from "@/components/AdminGuard";
import { ChangeEvent, useState } from "react";
import Papa from "papaparse";
import { supabase } from "../../../lib/supabase";

type RatingType = "standard" | "rapid" | "blitz";

type ChessSaCsvRow = {
  UNIQUE_NO?: string;
  SURNAME?: string;
  FIRSTNAME?: string;
  BDATE?: string;
  SEX?: string;
  TITLE?: string;
  RATING?: string;
  FED?: string;
};

type ImportRow = {
  chess_sa_id: string;
  surname: string;
  first_name: string;
  date_of_birth: string | null;
  gender: string | null;
  title: string | null;
  federation: string | null;
  rating: number | null;
};

function formatDate(value?: string) {
  if (!value) return null;

  const cleanValue = value.trim();

  if (/^\d{4}\/\d{2}\/\d{2}$/.test(cleanValue)) {
    const [year, month, day] = cleanValue.split("/");
    return `${year}-${month}-${day}`;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(cleanValue)) return cleanValue;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(cleanValue)) {
    const [day, month, year] = cleanValue.split("/");
    return `${year}-${month}-${day}`;
  }

  return null;
}

export default function ImportRatingsPage() {
  const [ratingType, setRatingType] = useState<RatingType>("standard");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");
  const [importing, setImporting] = useState(false);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMessage("Reading file...");
    setRows([]);

    Papa.parse<ChessSaCsvRow>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (header) =>
        header.replace(/^\uFEFF/, "").trim().toUpperCase(),

      complete: (results) => {
        const cleanedRows = results.data
          .map((row): ImportRow | null => {
            const chessSaId = row.UNIQUE_NO?.trim();
            const surname = row.SURNAME?.trim();
            const firstName = row.FIRSTNAME?.trim();

            if (!chessSaId || !surname || !firstName) return null;

            const ratingText = row.RATING?.trim() ?? "";
            const ratingNumber = Number(ratingText.replace(/[^\d.-]/g, ""));

            return {
              chess_sa_id: chessSaId,
              surname,
              first_name: firstName,
              date_of_birth: formatDate(row.BDATE),
              gender: row.SEX?.trim() || null,
              title: row.TITLE?.trim() || null,
              federation: row.FED?.trim() || null,
              rating: Number.isFinite(ratingNumber) ? ratingNumber : null,
            };
          })
          .filter((row): row is ImportRow => row !== null);

        setRows(cleanedRows);
        setMessage(
          cleanedRows.length === 0
            ? "No valid players were found. Please select the original Chess SA CSV file."
            : `${cleanedRows.length.toLocaleString()} valid players are ready to import from ${file.name}.`
        );
      },

      error: (error) => {
        setMessage(`Could not read the CSV file: ${error.message}`);
      },
    });
  }

  async function importRatings() {
    if (rows.length === 0) {
      setMessage("Choose a valid Chess SA ratings CSV file first.");
      return;
    }

    setImporting(true);

    const batchSize = 500;
    let imported = 0;

    try {
      for (let start = 0; start < rows.length; start += batchSize) {
        const batch = rows.slice(start, start + batchSize);

        setMessage(
          `Importing ${imported.toLocaleString()} of ${rows.length.toLocaleString()} players...`
        );

        const { data, error } = await supabase.rpc(
          "import_chessa_ratings_batch",
          {
            p_players: batch,
            p_rating_type: ratingType,
          }
        );

        if (error) throw new Error(error.message);

        imported += typeof data === "number" ? data : batch.length;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      await supabase.from("chessa_import_history").insert({
        rating_type: ratingType,
        file_name: fileName,
        players_imported: imported,
        imported_by: user?.id ?? null,
      });

      setMessage(
        `Import complete. ${imported.toLocaleString()} Chess SA ${ratingType} ratings were updated safely.`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown import error.";

      setMessage(
        `Import stopped after ${imported.toLocaleString()} players. Error: ${errorMessage}`
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-6 pb-16 pt-28 text-white">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            PCC Admin
          </p>

          <h1 className="mt-3 text-4xl font-bold">Import Chess SA Ratings</h1>

          <p className="mt-4 leading-7 text-gray-300">
            Upload an official Chess SA Standard, Rapid, or Blitz CSV file.
          </p>

          <div className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <div className="grid gap-3 sm:grid-cols-3">
              {(["standard", "rapid", "blitz"] as RatingType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  disabled={importing}
                  onClick={() => {
                    setRatingType(type);
                    setRows([]);
                    setFileName("");
                    setMessage(
                      "Rating type changed. Please choose the matching CSV file."
                    );
                  }}
                  className={`rounded-lg border px-4 py-3 text-sm font-semibold capitalize transition disabled:opacity-60 ${
                    ratingType === type
                      ? "border-red-500 bg-red-600 text-white"
                      : "border-white/10 bg-zinc-950 text-gray-300 hover:border-red-500/60"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            <label className="mt-7 block text-sm font-semibold">
              Chess SA {ratingType} CSV file
            </label>

            <input
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              disabled={importing}
              className="mt-3 block w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
            />

            {fileName && (
              <p className="mt-4 text-sm text-gray-400">
                Selected file: <span className="text-white">{fileName}</span>
              </p>
            )}

            {message && (
              <p className="mt-5 rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-gray-300">
                {message}
              </p>
            )}

            <button
              type="button"
              onClick={importRatings}
              disabled={rows.length === 0 || importing}
              className="mt-6 w-full rounded-lg bg-red-600 px-5 py-4 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {importing
                ? "Importing ratings..."
                : `Import ${ratingType} ratings`}
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm leading-6 text-amber-100">
            Import each file separately: Rapid updates Rapid only, Standard
            updates Standard only, and Blitz updates Blitz only.
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}