"use client";

import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import AdminGuard from "@/components/AdminGuard";
import AdminImportSummaryPanel from "@/components/admin/AdminImportSummaryPanel";
import { createImportSession, createImportSessionRows } from "@/lib/importSummary";
import { supabase } from "@/lib/supabase";

type TournamentForm = {
  tournament_name: string;
  description: string;
  start_date: string;
  end_date: string;
  venue: string;
  province: string;
  entry_fee: string;
  poster_image_url: string;
  registration_status: string;
  sections: string;
};

type CreatedTournament = {
  id: string;
  tournament_name: string;
};

type ImportedPlayer = {
  name: string;
  rating: number | null;
  federation: string | null;
  club: string | null;
  chess_sa_id: string | null;
  fide_id: string | null;
  player_id: string | null;
  status: "Ready" | "Imported" | "Failed";
  message: string;
};

type ImportedStanding = {
  rank: number | null;
  name: string;
  rating: number | null;
  points: number | null;
  tieBreak: string | null;
  player_id: string | null;
  matchedPlayerName: string | null;
  status: "Ready" | "Imported" | "Failed" | "Unmatched";
  message: string;
};

type DetectedFileType = "starting_rank" | "final_ranking" | "unknown";

const emptyForm: TournamentForm = {
  tournament_name: "",
  description: "",
  start_date: "",
  end_date: "",
  venue: "",
  province: "Limpopo",
  entry_fee: "0",
  poster_image_url: "",
  registration_status: "Completed",
  sections: "Open",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

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

function cleanOptionalText(value: unknown) {
  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  return text ? text : null;
}

function normalizeHeaderName(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/^\ufeff/, "")
    .replace(/[^a-z0-9]/g, "");
}

function cleanImportedId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  const text = String(value).trim();

  if (!text || text.toLowerCase() === "nan") return null;

  return text.replace(/\.0$/, "");
}

function getColumnIndex(headers: string[], possibleNames: string[]) {
  const lowerHeaders = headers.map((header) => header.toLowerCase().trim());

  return lowerHeaders.findIndex((header) =>
    possibleNames.some((name) => header === name.toLowerCase())
  );
}

function getFlexibleColumnIndex(headers: string[], possibleNames: string[]) {
  const normalizedHeaders = headers.map(normalizeHeaderName);
  const normalizedPossibleNames = possibleNames.map(normalizeHeaderName);

  return normalizedHeaders.findIndex((header) =>
    normalizedPossibleNames.some(
      (name) => header === name || header.includes(name) || name.includes(header)
    )
  );
}

function findTieBreakIndex(headers: string[]) {
  return headers.findIndex((header) => {
    const lower = header.toLowerCase();
    return lower.includes("bh") || lower.includes("buchholz") || lower.includes("tie");
  });
}

function findHeaderRow(rows: unknown[][], required: string[]) {
  return rows.findIndex((row) => {
    const values = row.map((cell) => String(cell ?? "").trim().toLowerCase());
    return required.every((item) => values.includes(item.toLowerCase()));
  });
}

function detectFileType(rows: unknown[][]): DetectedFileType {
  const searchableText = rows
    .slice(0, 12)
    .flat()
    .map((cell) => String(cell ?? "").toLowerCase())
    .join(" ");

  if (
    searchableText.includes("starting rank") ||
    findHeaderRow(rows, ["sno.", "name"]) !== -1 ||
    findHeaderRow(rows, ["sno", "name"]) !== -1
  ) {
    return "starting_rank";
  }

  if (
    searchableText.includes("ranking") ||
    searchableText.includes("final ranking") ||
    findHeaderRow(rows, ["rank", "name", "pts"]) !== -1
  ) {
    return "final_ranking";
  }

  return "unknown";
}

async function readExcelRows(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: "",
  }) as unknown[][];
}

function parseStartingRankRows(rows: unknown[][]) {
  let headerRowIndex = findHeaderRow(rows, ["sno.", "name"]);

  if (headerRowIndex === -1) {
    headerRowIndex = findHeaderRow(rows, ["sno", "name"]);
  }

  if (headerRowIndex === -1) {
    headerRowIndex = rows.findIndex((row) =>
      row.some((cell) => String(cell ?? "").trim().toLowerCase() === "name")
    );
  }

  if (headerRowIndex === -1) {
    throw new Error("Could not find a player list header. Expected Name column.");
  }

  const headers = rows[headerRowIndex].map((cell) => String(cell ?? "").trim());

  const nameIndex = getFlexibleColumnIndex(headers, [
    "Name",
    "Player",
    "Full Name",
    "Surname and Names",
  ]);

  const ratingIndex = getFlexibleColumnIndex(headers, [
    "NRtg",
    "Rtg",
    "Rating",
    "Chess SA Rating",
    "CHESSA Rating",
  ]);

  const federationIndex = getFlexibleColumnIndex(headers, [
    "FED",
    "Federation",
    "Province",
    "Region",
  ]);

  const clubIndex = getFlexibleColumnIndex(headers, ["Club", "Team", "School"]);

  const chessSaIdIndex = getFlexibleColumnIndex(headers, [
    "Chess SA ID",
    "ChessSA ID",
    "ChessSAID",
    "CHESS SA ID",
    "Chessa ID",
    "ChessSA",
    "Chess SA",
    "CSA ID",
    "CSAID",
    "CHESSA",
    "Unique No",
    "UNIQUE_NO",
    "Unique Number",
    "Member ID",
    "Membership Number",
    "Player ID",
    "ID",
    "Code",
  ]);

  const fideIdIndex = getFlexibleColumnIndex(headers, [
    "FIDE ID",
    "FideID",
    "FIDEID",
    "FIDE",
    "FIDE No",
    "FIDE Number",
    "FIDE-No",
  ]);

  if (nameIndex === -1) {
    throw new Error("Missing required column: Name.");
  }

  return rows
    .slice(headerRowIndex + 1)
    .map((row) => {
      const name = String(row[nameIndex] ?? "").trim();
      if (!name) return null;

      return {
        name,
        rating: ratingIndex >= 0 ? toNumber(row[ratingIndex]) : null,
        federation:
          federationIndex >= 0 && row[federationIndex]
            ? String(row[federationIndex]).trim()
            : null,
        club:
          clubIndex >= 0 && row[clubIndex]
            ? String(row[clubIndex]).trim()
            : null,
        chess_sa_id:
          chessSaIdIndex >= 0 ? cleanImportedId(row[chessSaIdIndex]) : null,
        fide_id: fideIdIndex >= 0 ? cleanImportedId(row[fideIdIndex]) : null,
        player_id: null,
        status: "Ready",
        message: "Ready to import",
      } as ImportedPlayer;
    })
    .filter(Boolean) as ImportedPlayer[];
}

function parseFinalRankingRows(
  rows: unknown[][],
  currentImportedPlayers: ImportedPlayer[]
) {
  const headerRowIndex = findHeaderRow(rows, ["Rank", "Name", "Pts"]);

  if (headerRowIndex === -1) {
    throw new Error(
      "Could not find ranking list header. Expected Rank, Name and Pts columns."
    );
  }

  const headers = rows[headerRowIndex].map((cell) => String(cell ?? "").trim());

  const rankIndex = getColumnIndex(headers, ["Rank"]);
  const nameIndex = getColumnIndex(headers, ["Name"]);
  const ratingIndex = getColumnIndex(headers, ["NRtg", "Rtg", "Rating"]);
  const pointsIndex = getColumnIndex(headers, ["Pts", "Points"]);
  const tieBreakIndex = findTieBreakIndex(headers);

  const currentPlayerMap = new Map(
    currentImportedPlayers
      .filter((row) => row.player_id)
      .map((row) => [normalizeName(row.name), row])
  );

  return rows
    .slice(headerRowIndex + 1)
    .map((row) => {
      const name = String(row[nameIndex] ?? "").trim();
      if (!name) return null;

      const matchedPlayer = currentPlayerMap.get(normalizeName(name));

      return {
        rank: toNumber(row[rankIndex]),
        name,
        rating: ratingIndex >= 0 ? toNumber(row[ratingIndex]) : null,
        points: toNumber(row[pointsIndex]),
        tieBreak:
          tieBreakIndex >= 0 && row[tieBreakIndex] !== ""
            ? String(row[tieBreakIndex])
            : null,
        player_id: matchedPlayer?.player_id ?? null,
        matchedPlayerName: matchedPlayer?.name ?? null,
        status: matchedPlayer?.player_id ? "Ready" : "Unmatched",
        message: matchedPlayer?.player_id
          ? "Ready to import"
          : "Import players first or check name spelling",
      } as ImportedStanding;
    })
    .filter(Boolean) as ImportedStanding[];
}

export default function ImportOldTournamentPage() {
  const [form, setForm] = useState<TournamentForm>(emptyForm);
  const [createdTournament, setCreatedTournament] =
    useState<CreatedTournament | null>(null);
  const [createdSectionIds, setCreatedSectionIds] = useState<string[]>([]);
  const [createdSections, setCreatedSections] = useState<
    { id: string; section_name: string }[]
  >([]);
  const [selectedImportSectionId, setSelectedImportSectionId] = useState("");

  const [playerRows, setPlayerRows] = useState<ImportedPlayer[]>([]);
  const [rankingRows, setRankingRows] = useState<ImportedStanding[]>([]);

  const [playerFileName, setPlayerFileName] = useState("");
  const [rankingFileName, setRankingFileName] = useState("");
  const [detectedType, setDetectedType] = useState<DetectedFileType>("unknown");

  const [creatingTournament, setCreatingTournament] = useState(false);
  const [importingPlayers, setImportingPlayers] = useState(false);
  const [importingRankings, setImportingRankings] = useState(false);
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

  const playerStats = useMemo(() => {
    return {
      rows: playerRows.length,
      imported: playerRows.filter((row) => row.status === "Imported").length,
      failed: playerRows.filter((row) => row.status === "Failed").length,
    };
  }, [playerRows]);

  const rankingStats = useMemo(() => {
    return {
      rows: rankingRows.length,
      imported: rankingRows.filter((row) => row.status === "Imported").length,
      failed: rankingRows.filter((row) => row.status === "Failed").length,
      unmatched: rankingRows.filter((row) => row.status === "Unmatched").length,
    };
  }, [rankingRows]);

  function updateField(field: keyof TournamentForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createTournament(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.tournament_name.trim() || !form.start_date || !form.venue.trim()) {
      setMessage("Tournament name, start date and venue are required.");
      return;
    }

    setCreatingTournament(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .insert({
        tournament_name: form.tournament_name.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date || null,
        venue: form.venue.trim(),
        province: form.province.trim() || null,
        entry_fee: Number(form.entry_fee || 0),
        poster_image_url: form.poster_image_url.trim() || null,
        registration_status: form.registration_status,
        registration_open_date: form.start_date,
        registration_close_date: form.end_date || form.start_date,
      })
      .select("id, tournament_name")
      .single();

    if (tournamentError || !tournamentData) {
      setMessage(
        `Could not create tournament: ${
          tournamentError?.message ?? "Unknown error"
        }`
      );
      setCreatingTournament(false);
      return;
    }

    const sectionNames = form.sections
      .split(",")
      .map((section) => section.trim())
      .filter(Boolean);

    const finalSectionNames = sectionNames.length > 0 ? sectionNames : ["Open"];

    const { data: sectionData, error: sectionError } = await supabase
      .from("tournament_sections")
      .insert(
        finalSectionNames.map((sectionName) => ({
          tournament_id: tournamentData.id,
          section_name: sectionName,
          minimum_birth_year: null,
          maximum_birth_year: null,
          gender_restriction: "All",
          entry_fee_override: null,
          maximum_players: null,
        }))
      )
      .select("id, section_name");

    if (sectionError) {
      setMessage(
        `Tournament created, but sections could not be created: ${sectionError.message}`
      );
      setCreatedTournament(tournamentData as CreatedTournament);
      setCreatingTournament(false);
      return;
    }

    const createdSectionRows = (sectionData ?? []) as {
      id: string;
      section_name: string;
    }[];

    setCreatedTournament(tournamentData as CreatedTournament);
    setCreatedSectionIds(createdSectionRows.map((row) => row.id));
    setCreatedSections(createdSectionRows);
    setSelectedImportSectionId(createdSectionRows[0]?.id ?? "");
    setMessage(
      "Tournament archive created. Select a section and import a Starting Rank List next."
    );
    setCreatingTournament(false);
  }

  async function handleSmartImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setMessage("Reading Swiss Manager Excel file...");
    setDetectedType("unknown");

    try {
      const rows = await readExcelRows(file);
      const type = detectFileType(rows);

      setDetectedType(type);

      if (type === "starting_rank") {
        const parsedPlayers = parseStartingRankRows(rows);
        setPlayerFileName(file.name);
        setPlayerRows(parsedPlayers);
        setMessage(
          `Detected Starting Rank List. Parsed ${parsedPlayers.length} players from ${file.name}.`
        );
      } else if (type === "final_ranking") {
        const parsedRankings = parseFinalRankingRows(rows, playerRows);
        setRankingFileName(file.name);
        setRankingRows(parsedRankings);
        setMessage(
          `Detected Final Ranking List. Parsed ${parsedRankings.length} standings rows from ${file.name}.`
        );
      } else {
        setMessage(
          "Could not detect this file type. Please use a Swiss Manager Starting Rank List or Final Ranking List Excel export."
        );
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read file.");
    }

    event.target.value = "";
  }

  async function parsePlayerFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPlayerFileName(file.name);
    setPlayerRows([]);
    setMessage("Reading player file...");

    try {
      const rows = await readExcelRows(file);
      const parsed = parseStartingRankRows(rows);

      setPlayerRows(parsed);
      setMessage(`Parsed ${parsed.length} player rows from ${file.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read player file.");
    }

    event.target.value = "";
  }

  async function parseRankingFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setRankingFileName(file.name);
    setRankingRows([]);
    setMessage("Reading final ranking file...");

    try {
      const rows = await readExcelRows(file);
      const parsed = parseFinalRankingRows(rows, playerRows);

      setRankingRows(parsed);
      setMessage(`Parsed ${parsed.length} ranking rows from ${file.name}.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not read ranking file.");
    }

    event.target.value = "";
  }

  async function findOrCreatePlayer(row: ImportedPlayer) {
    const normalizedName = normalizeName(row.name);
    const cleanChessSaId = row.chess_sa_id?.trim() || null;
    const cleanFideId = row.fide_id?.trim() || null;

    if (cleanChessSaId) {
      const { data: chessSaPlayer, error: chessSaError } = await supabase
        .from("players")
        .select("id")
        .eq("chess_sa_id", cleanChessSaId)
        .maybeSingle();

      if (chessSaError) throw new Error(chessSaError.message);
      if (chessSaPlayer) return (chessSaPlayer as { id: string }).id;
    }

    if (cleanFideId) {
      const { data: fidePlayer, error: fideError } = await supabase
        .from("players")
        .select("id")
        .eq("fide_id", cleanFideId)
        .maybeSingle();

      if (fideError) throw new Error(fideError.message);
      if (fidePlayer) return (fidePlayer as { id: string }).id;
    }

    const { data: existingPlayers, error: searchError } = await supabase
      .from("players")
      .select("id, full_name")
      .limit(10000);

    if (searchError) throw new Error(searchError.message);

    const existingPlayer = (
      (existingPlayers ?? []) as { id: string; full_name: string }[]
    ).find((player) => normalizeName(player.full_name) === normalizedName);

    if (existingPlayer) {
      const updatePayload: Record<string, unknown> = {
        rating: row.rating,
        club: row.club,
        province: row.federation || form.province || null,
        updated_at: new Date().toISOString(),
      };

      if (cleanChessSaId) {
        updatePayload.chess_sa_id = cleanChessSaId;
        updatePayload.verification_status = "Verified";
      }

      if (cleanFideId) {
        updatePayload.fide_id = cleanFideId;
      }

      const { error: updateError } = await supabase
        .from("players")
        .update(updatePayload)
        .eq("id", existingPlayer.id);

      if (updateError) throw new Error(updateError.message);
      return existingPlayer.id;
    }

    const { data: newPlayer, error: insertError } = await supabase
      .from("players")
      .insert({
        full_name: row.name,
        fide_id: cleanFideId,
        chess_sa_id: cleanChessSaId,
        date_of_birth: null,
        gender: "Not supplied",
        club: row.club,
        province: row.federation || form.province || null,
        rating: row.rating,
        email: null,
        phone: null,
        verification_status: cleanChessSaId ? "Verified" : "Pending",
      })
      .select("id")
      .single();

    if (insertError) throw new Error(insertError.message);
    if (!newPlayer) throw new Error("Player was not returned after insert.");

    return (newPlayer as { id: string }).id;
  }

  async function importPlayers() {
    if (!createdTournament) {
      setMessage("Create the tournament first.");
      return;
    }

    if (playerRows.length === 0) {
      setMessage("Upload a player file first.");
      return;
    }

    setImportingPlayers(true);
    setMessage("");

    const defaultSectionId = selectedImportSectionId || createdSectionIds[0] || null;
    const updatedRows: ImportedPlayer[] = [];

    for (const row of playerRows) {
      try {
        const playerId = await findOrCreatePlayer(row);

        const { data: existingRegistration, error: existingRegistrationError } =
          await supabase
            .from("registrations")
            .select("id")
            .eq("player_id", playerId)
            .eq("tournament_id", createdTournament.id)
            .maybeSingle();

        if (existingRegistrationError) throw existingRegistrationError;

        if (existingRegistration) {
          const { error: updateRegistrationError } = await supabase
            .from("registrations")
            .update({
              section_id: defaultSectionId,
              payment_status: "Paid",
              proof_of_payment_url: null,
              registration_status: "Approved",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRegistration.id);

          if (updateRegistrationError) throw updateRegistrationError;
        } else {
          const { error: registrationError } = await supabase
            .from("registrations")
            .insert({
              player_id: playerId,
              tournament_id: createdTournament.id,
              section_id: defaultSectionId,
              payment_status: "Paid",
              proof_of_payment_url: null,
              registration_status: "Approved",
            });

          if (registrationError) throw registrationError;
        }

        updatedRows.push({
          ...row,
          player_id: playerId,
          status: "Imported",
          message: "Player and registration imported",
        });
      } catch (error) {
        updatedRows.push({
          ...row,
          status: "Failed",
          message:
            error instanceof Error
              ? error.message
              : typeof error === "object"
              ? JSON.stringify(error)
              : "Unknown error",
        });
      }

      setPlayerRows([...updatedRows, ...playerRows.slice(updatedRows.length)]);
    }

    const importedCount = updatedRows.filter((row) => row.status === "Imported").length;
    const failedCount = updatedRows.filter((row) => row.status === "Failed").length;

    try {
      const importSession = await createImportSession({
        import_type: "Tournament Players",
        source_page: "/admin/import-tournament",
        tournament_id: createdTournament.id,
        file_name: playerFileName || null,
        status: failedCount > 0 ? "Completed with errors" : "Completed",
        total_rows: playerRows.length,
        matched_rows: importedCount,
        unmatched_rows: 0,
        created_rows: importedCount,
        updated_rows: 0,
        skipped_rows: 0,
        failed_rows: failedCount,
        summary: {
          section_id: defaultSectionId,
          note: "Imported players and created or updated tournament registrations.",
        },
      });

      await createImportSessionRows(
        importSession.id,
        updatedRows.map((row, index) => ({
          row_number: index + 1,
          imported_name: row.name,
          matched_player_id: row.player_id,
          matched_player_name: row.player_id ? row.name : null,
          confidence_score: row.player_id ? 100 : 0,
          status: row.status,
          message: row.message,
          row_data: {
            rating: row.rating,
            federation: row.federation,
            club: row.club,
            chess_sa_id: row.chess_sa_id,
            fide_id: row.fide_id,
          },
        }))
      );
    } catch (summaryError) {
      console.error(summaryError);
    }

    setLastImportSummary({
      total_rows: playerRows.length,
      matched_rows: importedCount,
      unmatched_rows: 0,
      created_rows: importedCount,
      updated_rows: 0,
      skipped_rows: 0,
      failed_rows: failedCount,
      file_name: playerFileName || null,
      status: failedCount > 0 ? "Completed with errors" : "Completed",
    });

    setImportingPlayers(false);
    setMessage("Player import completed. You can now import the Final Ranking List.");
  }

  async function importRankings() {
    if (!createdTournament) {
      setMessage("Create the tournament first.");
      return;
    }

    const rowsToImport = rankingRows.filter((row) => row.player_id);

    if (rowsToImport.length === 0) {
      setMessage("No matched ranking rows to import. Import players first.");
      return;
    }

    const confirmed = window.confirm(
      `Import ${rowsToImport.length} final rankings? Existing results for the selected section will be deleted first.`
    );

    if (!confirmed) return;

    setImportingRankings(true);
    setMessage("");

    const defaultSectionId = selectedImportSectionId || createdSectionIds[0] || null;

    let deleteQuery = supabase
      .from("tournament_results")
      .delete()
      .eq("tournament_id", createdTournament.id);

    if (defaultSectionId) {
      deleteQuery = deleteQuery.eq("section_id", defaultSectionId);
    } else {
      deleteQuery = deleteQuery.is("section_id", null);
    }

    const { error: deleteError } = await deleteQuery;

    if (deleteError) {
      setMessage(`Could not clear old results for this section: ${deleteError.message}`);
      setImportingRankings(false);
      return;
    }

    const updatedRows: ImportedStanding[] = [];

    for (const row of rankingRows) {
      if (!row.player_id) {
        updatedRows.push(row);
        continue;
      }

      try {
        const { error } = await supabase.from("tournament_results").insert({
          tournament_id: createdTournament.id,
          player_id: row.player_id,
          section_id: defaultSectionId,
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
          notes: `Imported from final ranking list: ${
            rankingFileName || "Swiss Manager file"
          }`,
        });

        if (error) throw error;

        updatedRows.push({
          ...row,
          status: "Imported",
          message: "Ranking imported",
        });
      } catch (error) {
        updatedRows.push({
          ...row,
          status: "Failed",
          message:
            error instanceof Error
              ? error.message
              : typeof error === "object"
              ? JSON.stringify(error)
              : "Unknown error",
        });
      }

      setRankingRows([...updatedRows, ...rankingRows.slice(updatedRows.length)]);
    }

    const importedCount = updatedRows.filter((row) => row.status === "Imported").length;
    const failedCount = updatedRows.filter((row) => row.status === "Failed").length;
    const unmatchedCount = updatedRows.filter((row) => row.status === "Unmatched").length;

    try {
      const importSession = await createImportSession({
        import_type: "Tournament Final Rankings",
        source_page: "/admin/import-tournament",
        tournament_id: createdTournament.id,
        file_name: rankingFileName || null,
        status: failedCount > 0 ? "Completed with errors" : "Completed",
        total_rows: rankingRows.length,
        matched_rows: importedCount,
        unmatched_rows: unmatchedCount,
        created_rows: importedCount,
        updated_rows: 0,
        skipped_rows: unmatchedCount,
        failed_rows: failedCount,
        summary: {
          section_id: defaultSectionId,
          note: "Imported final ranking rows into tournament_results.",
        },
      });

      await createImportSessionRows(
        importSession.id,
        updatedRows.map((row, index) => ({
          row_number: index + 1,
          imported_name: row.name,
          matched_player_id: row.player_id,
          matched_player_name: row.matchedPlayerName,
          confidence_score: row.player_id ? 100 : 0,
          status: row.status,
          message: row.message,
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
      total_rows: rankingRows.length,
      matched_rows: importedCount,
      unmatched_rows: unmatchedCount,
      created_rows: importedCount,
      updated_rows: 0,
      skipped_rows: unmatchedCount,
      failed_rows: failedCount,
      file_name: rankingFileName || null,
      status: failedCount > 0 ? "Completed with errors" : "Completed",
    });

    setImportingRankings(false);
    setMessage("Final ranking import completed.");
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Command Centre
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Tournament Archive Wizard
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Smart Swiss Manager Import
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Import historical tournaments using Swiss Manager Excel exports.
              The wizard detects Starting Rank Lists and Final Ranking Lists
              automatically.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <AdminImportSummaryPanel summary={lastImportSummary} />

          <section className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Step 1
              </p>

              <h2 className="mt-3 text-2xl font-black">Tournament details</h2>

              <form onSubmit={createTournament} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Tournament name
                  </label>
                  <input
                    value={form.tournament_name}
                    onChange={(event) =>
                      updateField("tournament_name", event.target.value)
                    }
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Start date
                    </label>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(event) =>
                        updateField("start_date", event.target.value)
                      }
                      className={inputClass}
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      End date
                    </label>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(event) =>
                        updateField("end_date", event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">Venue</label>
                  <input
                    value={form.venue}
                    onChange={(event) => updateField("venue", event.target.value)}
                    className={inputClass}
                    required
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Province
                    </label>
                    <input
                      value={form.province}
                      onChange={(event) =>
                        updateField("province", event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Entry fee
                    </label>
                    <input
                      type="number"
                      value={form.entry_fee}
                      onChange={(event) =>
                        updateField("entry_fee", event.target.value)
                      }
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Sections
                  </label>
                  <input
                    value={form.sections}
                    onChange={(event) =>
                      updateField("sections", event.target.value)
                    }
                    placeholder="Open, U18, U14"
                    className={inputClass}
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Separate multiple sections with commas.
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Poster image URL
                  </label>
                  <input
                    value={form.poster_image_url}
                    onChange={(event) =>
                      updateField("poster_image_url", event.target.value)
                    }
                    placeholder="Optional"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Description
                  </label>
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={4}
                    className={inputClass}
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingTournament || Boolean(createdTournament)}
                  className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {createdTournament
                    ? "Tournament Created"
                    : creatingTournament
                    ? "Creating..."
                    : "Create Tournament Archive"}
                </button>
              </form>

              {createdTournament && (
                <div className="mt-6 rounded-2xl border border-green-500/30 bg-green-500/10 p-5">
                  <p className="font-bold text-green-200">
                    {createdTournament.tournament_name}
                  </p>
                  <p className="mt-2 text-sm text-green-100/80">
                    Archive event created. Upload a Swiss Manager file next.
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-8">
              <section className="rounded-3xl border border-red-500/20 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Smart Import
                </p>

                <h2 className="mt-3 text-2xl font-black">Upload Swiss Manager Excel</h2>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Upload either a Starting Rank List or a Final Ranking List.
                  The system detects the file type automatically.
                </p>

                <div className="mt-6">
                  <label className="mb-2 block text-sm font-semibold">
                    Section for this import
                  </label>

                  <select
                    value={selectedImportSectionId}
                    onChange={(event) => setSelectedImportSectionId(event.target.value)}
                    disabled={!createdTournament || createdSections.length === 0}
                    className={inputClass}
                  >
                    {createdSections.length === 0 ? (
                      <option value="">Create tournament first</option>
                    ) : (
                      createdSections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.section_name}
                        </option>
                      ))
                    )}
                  </select>

                  <p className="mt-2 text-xs leading-5 text-gray-500">
                    For multi-section tournaments, import each section separately using the same tournament archive.
                  </p>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={handleSmartImport}
                    disabled={!createdTournament || !selectedImportSectionId}
                    className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                  />

                  <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-gray-500">
                      Detected
                    </p>
                    <p className="mt-2 font-bold text-white">
                      {detectedType === "starting_rank"
                        ? "Starting Rank List"
                        : detectedType === "final_ranking"
                        ? "Final Ranking List"
                        : "Waiting for file"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Step 2
                </p>

                <h2 className="mt-3 text-2xl font-black">Player import</h2>

                <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={parsePlayerFile}
                    disabled={!createdTournament}
                    className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={importPlayers}
                    disabled={
                      !createdTournament ||
                      !selectedImportSectionId ||
                      playerRows.length === 0 ||
                      importingPlayers
                    }
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {importingPlayers ? "Importing..." : "Import Players"}
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <MiniStat label="Rows" value={playerStats.rows} />
                  <MiniStat
                    label="Imported"
                    value={playerStats.imported}
                    valueClass="text-green-300"
                  />
                  <MiniStat
                    label="Failed"
                    value={playerStats.failed}
                    valueClass="text-red-300"
                  />
                </div>

                <PreviewTable
                  emptyText="Upload a Starting Rank List to preview player rows."
                  headers={[
                    "Name",
                    "Rating",
                    "Chess SA ID",
                    "FIDE ID",
                    "FED",
                    "Club",
                    "Status",
                    "Message",
                  ]}
                  rows={playerRows.map((row) => [
                    row.name,
                    row.rating ?? "-",
                    row.chess_sa_id ?? "-",
                    row.fide_id ?? "-",
                    row.federation ?? "-",
                    row.club ?? "-",
                    row.status,
                    row.message,
                  ])}
                />
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Step 3
                </p>

                <h2 className="mt-3 text-2xl font-black">Final ranking import</h2>

                <div className="mt-6 grid gap-4 md:grid-cols-[1fr_220px]">
                  <input
                    type="file"
                    accept=".xls,.xlsx,.csv"
                    onChange={parseRankingFile}
                    disabled={!createdTournament}
                    className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                  />

                  <button
                    type="button"
                    onClick={importRankings}
                    disabled={
                      !createdTournament ||
                      !selectedImportSectionId ||
                      rankingRows.length === 0 ||
                      importingRankings
                    }
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {importingRankings ? "Importing..." : "Import Rankings"}
                  </button>
                </div>

                <div className="mt-6 grid grid-cols-4 gap-3">
                  <MiniStat label="Rows" value={rankingStats.rows} />
                  <MiniStat
                    label="Imported"
                    value={rankingStats.imported}
                    valueClass="text-green-300"
                  />
                  <MiniStat
                    label="Unmatched"
                    value={rankingStats.unmatched}
                    valueClass="text-yellow-300"
                  />
                  <MiniStat
                    label="Failed"
                    value={rankingStats.failed}
                    valueClass="text-red-300"
                  />
                </div>

                <PreviewTable
                  emptyText="Upload a Final Ranking List to preview standings."
                  headers={["Rank", "Name", "Points", "Tie-break", "Status", "Message"]}
                  rows={rankingRows.map((row) => [
                    row.rank ?? "-",
                    row.name,
                    row.points ?? "-",
                    row.tieBreak ?? "-",
                    row.status,
                    row.message,
                  ])}
                />

                {createdTournament && (
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link
                      href={`/admin/tournaments/${createdTournament.id}`}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                    >
                      Open Tournament Dashboard
                    </Link>

                    <Link
                      href={`/admin/tournaments/${createdTournament.id}/results`}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                    >
                      Open Results Centre
                    </Link>
                  </div>
                )}
              </section>
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
    <div className="rounded-xl bg-zinc-950 p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function PreviewTable({
  emptyText,
  headers,
  rows,
}: {
  emptyText: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
        {emptyText}
      </p>
    );
  }

  return (
    <div className="mt-6 max-h-[360px] overflow-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="p-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-t border-white/10">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="p-3 text-gray-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
