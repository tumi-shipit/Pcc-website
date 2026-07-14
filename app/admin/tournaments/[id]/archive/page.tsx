"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as XLSX from "xlsx";
import AdminGuard from "@/components/AdminGuard";
import AdminImportSummaryPanel from "@/components/admin/AdminImportSummaryPanel";
import { createImportSession, createImportSessionRows } from "@/lib/importSummary";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
};

type Section = {
  id: string;
  section_name: string;
};

type ImportedPlayer = {
  starting_number: number | null;
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
  starting_number: number | null;
  name: string;
  rating: number | null;
  points: number | null;
  tieBreak: string | null;
  player_id: string | null;
  matchedPlayerName: string | null;
  status: "Ready" | "Imported" | "Failed" | "Unmatched";
  message: string;
};

type SectionPlayer = {
  player_id: string;
  full_name: string;
};

type ImportSummary = {
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  created_rows: number;
  updated_rows: number;
  skipped_rows: number;
  failed_rows: number;
  file_name: string | null;
  status: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameAliases(value: string) {
  const raw = String(value ?? "").trim();
  const aliases = new Set<string>();
  const bracketName = raw.match(/\(([^)]+)\)/)?.[1]?.trim() ?? "";

  const add = (name: string) => {
    const normalized = normalizeName(name);
    if (normalized) aliases.add(normalized);
  };

  add(raw);

  if (raw.includes(",")) {
    const [surname, remainder = ""] = raw.split(",", 2);
    const withoutBrackets = remainder.replace(/\([^)]*\)/g, " ").trim();

    add(`${surname} ${withoutBrackets}`);
    add(`${withoutBrackets} ${surname}`);

    if (bracketName) {
      add(`${surname} ${bracketName}`);
      add(`${bracketName} ${surname}`);
    }
  }

  if (bracketName) add(bracketName);

  return Array.from(aliases);
}

function levenshteinDistance(a: string, b: string) {
  const matrix = Array.from({ length: b.length + 1 }, () =>
    Array<number>(a.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i += 1) matrix[0][i] = i;
  for (let j = 0; j <= b.length; j += 1) matrix[j][0] = j;

  for (let j = 1; j <= b.length; j += 1) {
    for (let i = 1; i <= a.length; i += 1) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;

      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + substitutionCost
      );
    }
  }

  return matrix[b.length][a.length];
}

function nameSimilarity(left: string, right: string) {
  const leftAliases = nameAliases(left);
  const rightAliases = nameAliases(right);
  let best = 0;

  for (const a of leftAliases) {
    for (const b of rightAliases) {
      if (a === b) return 1;

      const aTokens = new Set(a.split(" ").filter(Boolean));
      const bTokens = new Set(b.split(" ").filter(Boolean));
      const shared = [...aTokens].filter((token) => bTokens.has(token)).length;
      const tokenScore =
        aTokens.size + bTokens.size > 0
          ? (shared * 2) / (aTokens.size + bTokens.size)
          : 0;

      const maximumLength = Math.max(a.length, b.length);
      const editScore =
        maximumLength > 0
          ? 1 - levenshteinDistance(a, b) / maximumLength
          : 0;

      best = Math.max(best, tokenScore, editScore);
    }
  }

  return best;
}

function toNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(String(value).trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}

function normalizeHeaderName(value: string) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/^\ufeff/, "")
    .replace(/[^a-z0-9]/g, "");
}

function getFlexibleColumnIndex(headers: string[], possibleNames: string[]) {
  const normalizedHeaders = headers.map(normalizeHeaderName);
  const normalizedPossibleNames = possibleNames.map(normalizeHeaderName);

  return normalizedHeaders.findIndex((header) =>
    normalizedPossibleNames.some((name) => header === name)
  );
}

function cleanImportedId(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "nan") return null;
  return text.replace(/\.0$/, "");
}

function findHeaderRowByColumns(
  rows: unknown[][],
  requiredColumnGroups: string[][]
) {
  return rows.findIndex((row) => {
    const normalizedCells = row.map((cell) =>
      normalizeHeaderName(String(cell ?? ""))
    );

    return requiredColumnGroups.every((group) =>
      group.some((candidate) =>
        normalizedCells.includes(normalizeHeaderName(candidate))
      )
    );
  });
}

function findTieBreakIndex(headers: string[]) {
  return headers.findIndex((header) => {
    const normalized = normalizeHeaderName(header);

    return (
      normalized.includes("bh") ||
      normalized.includes("buchholz") ||
      normalized.includes("tiebreak") ||
      normalized === "tb1" ||
      normalized === "tb2"
    );
  });
}

async function readExcelRows(file: File) {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, {
    type: "array",
    cellDates: false,
    raw: false,
  });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

  return XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];
}

function parseStartingRankRows(rows: unknown[][]) {
  const headerRowIndex = findHeaderRowByColumns(rows, [
    ["Name", "Player", "Full Name"],
  ]);

  if (headerRowIndex === -1) {
    throw new Error("Could not find a player list header containing a Name column.");
  }

  const headers = rows[headerRowIndex].map((cell) => String(cell ?? "").trim());

  const startingNumberIndex = getFlexibleColumnIndex(headers, [
    "SNo.",
    "SNo",
    "Starting Number",
    "Start No",
    "No.",
    "#",
  ]);

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
    "Chessa ID",
    "ChessSA",
    "CSA ID",
    "CSAID",
    "CHESSA",
    "Unique No",
    "UNIQUE_NO",
    "Unique Number",
    "Member ID",
    "Membership Number",
    "Player ID",
    "Code",
  ]);

  const fideIdIndex = getFlexibleColumnIndex(headers, [
    "FIDE ID",
    "FideID",
    "FIDEID",
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
        starting_number:
          startingNumberIndex >= 0 ? toNumber(row[startingNumberIndex]) : null,
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

function findBestSectionPlayer(
  rankingName: string,
  rankingStartingNumber: number | null,
  sectionPlayers: SectionPlayer[],
  importedPlayers: ImportedPlayer[]
) {
  if (rankingStartingNumber !== null) {
    const startingNumberMatch = importedPlayers.find(
      (player) =>
        player.starting_number === rankingStartingNumber && player.player_id
    );

    if (startingNumberMatch?.player_id) {
      return {
        player_id: startingNumberMatch.player_id,
        full_name: startingNumberMatch.name,
        confidence: 100,
        reason: "Matched by Swiss Manager starting number",
      };
    }
  }

  const candidates = sectionPlayers
    .map((player) => ({
      ...player,
      confidence: Math.round(
        nameSimilarity(rankingName, player.full_name) * 100
      ),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const best = candidates[0];
  const second = candidates[1];

  if (
    best &&
    best.confidence >= 72 &&
    (!second || best.confidence - second.confidence >= 5)
  ) {
    return {
      player_id: best.player_id,
      full_name: best.full_name,
      confidence: best.confidence,
      reason: `Matched by name (${best.confidence}%)`,
    };
  }

  return null;
}

function parseFinalRankingRows(
  rows: unknown[][],
  sectionPlayers: SectionPlayer[],
  importedPlayers: ImportedPlayer[]
) {
  const headerRowIndex = findHeaderRowByColumns(rows, [
    ["Rank", "Rk.", "Rk", "Position", "Pos"],
    ["Name", "Player", "Full Name"],
    ["Pts", "Pts.", "Points", "Score"],
  ]);

  if (headerRowIndex === -1) {
    throw new Error(
      'Could not find the final ranking header. Expected columns such as "Rk.", "Name" and "Pts.".'
    );
  }

  const headers = rows[headerRowIndex].map((cell) => String(cell ?? "").trim());

  const rankIndex = getFlexibleColumnIndex(headers, [
    "Rank",
    "Rk.",
    "Rk",
    "Position",
    "Pos",
  ]);

  const startingNumberIndex = getFlexibleColumnIndex(headers, [
    "SNo.",
    "SNo",
    "Starting Number",
    "Start No",
    "No.",
    "#",
  ]);

  const nameIndex = getFlexibleColumnIndex(headers, [
    "Name",
    "Player",
    "Full Name",
  ]);

  const ratingIndex = getFlexibleColumnIndex(headers, [
    "NRtg",
    "Rtg",
    "Rating",
  ]);

  const pointsIndex = getFlexibleColumnIndex(headers, [
    "Pts",
    "Pts.",
    "Points",
    "Score",
  ]);

  const tieBreakIndex = findTieBreakIndex(headers);

  if (rankIndex === -1 || nameIndex === -1 || pointsIndex === -1) {
    throw new Error(
      "Final ranking columns could not be mapped. Required: rank, name and points."
    );
  }

  return rows
    .slice(headerRowIndex + 1)
    .map((row) => {
      const name = String(row[nameIndex] ?? "").trim();
      if (!name) return null;

      const startingNumber =
        startingNumberIndex >= 0 ? toNumber(row[startingNumberIndex]) : null;

      const matchedPlayer = findBestSectionPlayer(
        name,
        startingNumber,
        sectionPlayers,
        importedPlayers
      );

      return {
        rank: toNumber(row[rankIndex]),
        starting_number: startingNumber,
        name,
        rating: ratingIndex >= 0 ? toNumber(row[ratingIndex]) : null,
        points: toNumber(row[pointsIndex]),
        tieBreak:
          tieBreakIndex >= 0 && row[tieBreakIndex] !== ""
            ? String(row[tieBreakIndex]).trim()
            : null,
        player_id: matchedPlayer?.player_id ?? null,
        matchedPlayerName: matchedPlayer?.full_name ?? null,
        status: matchedPlayer?.player_id ? "Ready" : "Unmatched",
        message:
          matchedPlayer?.reason ??
          "Choose the correct section player manually before importing",
      } as ImportedStanding;
    })
    .filter(Boolean) as ImportedStanding[];
}

export default function TournamentArchiveContinuationPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = String(params.id ?? "");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [sectionPlayers, setSectionPlayers] = useState<SectionPlayer[]>([]);
  const [playerRows, setPlayerRows] = useState<ImportedPlayer[]>([]);
  const [rankingRows, setRankingRows] = useState<ImportedStanding[]>([]);

  const [playerFileName, setPlayerFileName] = useState("");
  const [rankingFileName, setRankingFileName] = useState("");
  const [message, setMessage] = useState("");
  const [lastImportSummary, setLastImportSummary] = useState<ImportSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [importingPlayers, setImportingPlayers] = useState(false);
  const [importingRankings, setImportingRankings] = useState(false);

  async function loadArchiveData() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status")
      .eq("id", tournamentId)
      .single();

    const { data: sectionData, error: sectionError } = await supabase
      .from("tournament_sections")
      .select("id, section_name")
      .eq("tournament_id", tournamentId)
      .order("section_name", { ascending: true });

    if (tournamentError || !tournamentData) {
      setMessage("Tournament archive could not be loaded.");
      setLoading(false);
      return;
    }

    if (sectionError) {
      setMessage(`Could not load sections: ${sectionError.message}`);
      setLoading(false);
      return;
    }

    const loadedSections = (sectionData ?? []) as Section[];

    const requestedSectionId =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("section")
        : null;
    const validRequestedSection = loadedSections.some(
      (section) => section.id === requestedSectionId
    );

    setTournament(tournamentData as Tournament);
    setSections(loadedSections);
    setSelectedSectionId((current) =>
      current ||
      (validRequestedSection ? requestedSectionId ?? "" : "") ||
      loadedSections[0]?.id ||
      ""
    );
    setLoading(false);
  }

  async function loadSectionPlayers(sectionId = selectedSectionId) {
    if (!sectionId) {
      setSectionPlayers([]);
      return [] as SectionPlayer[];
    }

    const { data, error } = await supabase
      .from("registrations")
      .select("player_id, players(id, full_name)")
      .eq("tournament_id", tournamentId)
      .eq("section_id", sectionId)
      .limit(10000);

    if (error) {
      setMessage(`Could not load section players: ${error.message}`);
      return [] as SectionPlayer[];
    }

    const rows = (data ?? []) as unknown as {
      player_id: string;
      players:
        | { id: string; full_name: string }
        | { id: string; full_name: string }[]
        | null;
    }[];

    const loadedPlayers = rows
      .map((row) => {
        const player = Array.isArray(row.players)
          ? row.players[0]
          : row.players;

        if (!row.player_id || !player?.full_name) return null;

        return {
          player_id: row.player_id,
          full_name: player.full_name,
        } as SectionPlayer;
      })
      .filter(Boolean) as SectionPlayer[];

    setSectionPlayers(loadedPlayers);
    return loadedPlayers;
  }

  useEffect(() => {
    loadArchiveData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    if (selectedSectionId) {
      loadSectionPlayers(selectedSectionId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSectionId]);

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

  async function parsePlayerFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setPlayerFileName(file.name);
    setPlayerRows([]);
    setLastImportSummary(null);
    setMessage("Reading section player file...");

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

    if (!selectedSectionId) {
      setMessage("Select a section first.");
      event.target.value = "";
      return;
    }

    setRankingFileName(file.name);
    setRankingRows([]);
    setLastImportSummary(null);
    setMessage("Reading final ranking file...");

    try {
      const freshSectionPlayers = await loadSectionPlayers(selectedSectionId);
      const rows = await readExcelRows(file);
      const parsed = parseFinalRankingRows(
        rows,
        freshSectionPlayers,
        playerRows
      );

      setRankingRows(parsed);

      const matched = parsed.filter((row) => row.player_id).length;
      const unmatched = parsed.length - matched;

      setMessage(
        `Parsed ${parsed.length} ranking rows from ${file.name}. ${matched} matched, ${unmatched} need review.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not read ranking file."
      );
    }

    event.target.value = "";
  }

  async function fetchSectionPlayers(sectionId: string) {
    const { data, error } = await supabase
      .from("registrations")
      .select("player_id, players(id, full_name)")
      .eq("tournament_id", tournamentId)
      .eq("section_id", sectionId)
      .limit(10000);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as any[];

    return rows
      .map((row) => {
        const player = Array.isArray(row.players) ? row.players[0] : row.players;
        if (!row.player_id || !player?.full_name) return null;

        return {
          player_id: row.player_id,
          full_name: player.full_name,
        } as SectionPlayer;
      })
      .filter(Boolean) as SectionPlayer[];
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
        province: row.federation || null,
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
        province: row.federation || null,
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

  async function importPlayersForSection() {
    if (!tournament) {
      setMessage("Tournament archive not loaded.");
      return;
    }

    if (!selectedSectionId) {
      setMessage("Select a section first.");
      return;
    }

    if (playerRows.length === 0) {
      setMessage("Upload a Starting Rank List first.");
      return;
    }

    setImportingPlayers(true);
    setMessage("");

    const updatedRows: ImportedPlayer[] = [];

    for (const row of playerRows) {
      try {
        const playerId = await findOrCreatePlayer(row);

        const { data: existingRegistration, error: existingRegistrationError } =
          await supabase
            .from("registrations")
            .select("id")
            .eq("player_id", playerId)
            .eq("tournament_id", tournament.id)
            .maybeSingle();

        if (existingRegistrationError) throw existingRegistrationError;

        if (existingRegistration) {
          const { error: updateRegistrationError } = await supabase
            .from("registrations")
            .update({
              section_id: selectedSectionId,
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
              tournament_id: tournament.id,
              section_id: selectedSectionId,
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
          message: "Player and section registration imported",
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
        import_type: "Tournament Section Players",
        source_page: `/admin/tournaments/${tournament.id}/archive`,
        tournament_id: tournament.id,
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
          section_id: selectedSectionId,
          note: "Imported section players and created or updated tournament registrations.",
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
            starting_number: row.starting_number,
            rating: row.rating,
            federation: row.federation,
            club: row.club,
            chess_sa_id: row.chess_sa_id,
            fide_id: row.fide_id,
            section_id: selectedSectionId,
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

    await loadSectionPlayers(selectedSectionId);

    setImportingPlayers(false);
    setMessage("Section player import completed. You can now import this section's final ranking.");
  }

  function assignRankingPlayer(
    rowIndex: number,
    playerId: string
  ) {
    const selectedPlayer = sectionPlayers.find(
      (player) => player.player_id === playerId
    );

    setRankingRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              player_id: selectedPlayer?.player_id ?? null,
              matchedPlayerName: selectedPlayer?.full_name ?? null,
              status: selectedPlayer ? "Ready" : "Unmatched",
              message: selectedPlayer
                ? "Manually reviewed and matched"
                : "Choose the correct section player manually before importing",
            }
          : row
      )
    );
  }

  async function importRankingsForSection() {
    if (!tournament) {
      setMessage("Tournament archive not loaded.");
      return;
    }

    if (!selectedSectionId) {
      setMessage("Select a section first.");
      return;
    }

    const rowsToImport = rankingRows.filter((row) => row.player_id);

    if (rowsToImport.length === 0) {
      setMessage("No matched ranking rows to import. Import this section's players first.");
      return;
    }

    const confirmed = window.confirm(
      `Import ${rowsToImport.length} final rankings for this section? Existing results for this section will be deleted first.`
    );

    if (!confirmed) return;

    setImportingRankings(true);
    setMessage("");

    const { error: deleteError } = await supabase
      .from("tournament_results")
      .delete()
      .eq("tournament_id", tournament.id)
      .eq("section_id", selectedSectionId);

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
          tournament_id: tournament.id,
          player_id: row.player_id,
          section_id: selectedSectionId,
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
          notes: `Imported from section final ranking list: ${
            rankingFileName || "Swiss Manager file"
          }`,
        });

        if (error) throw error;

        updatedRows.push({
          ...row,
          status: "Imported",
          message: "Section ranking imported",
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
        import_type: "Tournament Section Final Rankings",
        source_page: `/admin/tournaments/${tournament.id}/archive`,
        tournament_id: tournament.id,
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
          section_id: selectedSectionId,
          note: "Imported final ranking rows into tournament_results for one section.",
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
            starting_number: row.starting_number,
            rating: row.rating,
            points: row.points,
            tieBreak: row.tieBreak,
            section_id: selectedSectionId,
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
    setMessage("Section final ranking import completed.");
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading archive importer...
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
            href={`/admin/tournaments/${tournamentId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Tournament Dashboard
          </Link>

          <section className="mt-6 border-b border-white/10 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
              Archive Manager
            </p>

            <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <h1 className="text-4xl font-black md:text-6xl">
                  {tournament?.tournament_name ?? "Tournament Archive"}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base">
                  Build the public archive one section at a time. Load the
                  player list first, then import the final ranking for that same
                  section.
                </p>
              </div>

              <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
                <p className="text-xs uppercase tracking-wide text-gray-500">
                  Current section players
                </p>
                <p className="mt-2 text-3xl font-black text-white">
                  {sectionPlayers.length}
                </p>
                <p className="mt-2 text-xs leading-5 text-gray-400">
                  Refresh after changing section or after importing players.
                </p>
              </div>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <AdminImportSummaryPanel summary={lastImportSummary} />

          <section className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-5">
            <div className="grid gap-4 md:grid-cols-[1fr_220px]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Section to import
                </label>

                <select
                  value={selectedSectionId}
                  onChange={(event) => {
                    setSelectedSectionId(event.target.value);
                    setPlayerRows([]);
                    setRankingRows([]);
                    setLastImportSummary(null);
                  }}
                  className={inputClass}
                >
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.section_name}
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-gray-500">
                  Registered players currently loaded in this section:{" "}
                  {sectionPlayers.length}
                </p>
              </div>

              <button
                type="button"
                onClick={() => loadSectionPlayers(selectedSectionId)}
                className="self-end rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
              >
                Refresh Section
              </button>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <section className="rounded-xl border border-white/10 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                    Step 1
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Section players
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Upload the Starting Rank List for the selected section.
                  </p>
                </div>

                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                  {playerRows.length} rows
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_180px]">
                <input
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={parsePlayerFile}
                  disabled={!selectedSectionId}
                  className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={importPlayersForSection}
                  disabled={!selectedSectionId || playerRows.length === 0 || importingPlayers}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
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
                emptyText="Upload this section's Starting Rank List."
                headers={[
                  "SNo",
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
                  row.starting_number ?? "-",
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

            <section className="rounded-xl border border-white/10 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                    Step 2
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Final ranking
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Upload the Final Ranking List. Existing results for this
                    section will be replaced.
                  </p>
                </div>

                <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                  {rankingRows.length} rows
                </span>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-[1fr_180px]">
                <input
                  type="file"
                  accept=".xls,.xlsx,.csv"
                  onChange={parseRankingFile}
                  disabled={!selectedSectionId}
                  className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                />

                <button
                  type="button"
                  onClick={importRankingsForSection}
                  disabled={
                    !selectedSectionId ||
                    rankingRows.length === 0 ||
                    importingRankings
                  }
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {importingRankings ? "Importing..." : "Import Results"}
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

              <RankingReviewTable
                rows={rankingRows}
                sectionPlayers={sectionPlayers}
                onAssign={assignRankingPlayer}
              />
            </section>
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/admin/tournaments/${tournamentId}/results`}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
            >
              Open Results Centre
            </Link>

            <Link
              href={`/admin/tournaments/${tournamentId}`}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Open Tournament Dashboard
            </Link>
          </div>
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

function RankingReviewTable({
  rows,
  sectionPlayers,
  onAssign,
}: {
  rows: ImportedStanding[];
  sectionPlayers: SectionPlayer[];
  onAssign: (rowIndex: number, playerId: string) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
        Upload this section&apos;s Final Ranking List.
      </p>
    );
  }

  return (
    <div className="mt-6 max-h-[520px] overflow-auto rounded-2xl border border-white/10">
      <table className="w-full min-w-[1050px] text-left text-sm">
        <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="p-3">Rank</th>
            <th className="p-3">SNo</th>
            <th className="p-3">Imported name</th>
            <th className="p-3">Matched PCC player</th>
            <th className="p-3">Points</th>
            <th className="p-3">Tie-break</th>
            <th className="p-3">Status</th>
            <th className="p-3">Reason</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${row.rank}-${row.name}-${rowIndex}`} className="border-t border-white/10">
              <td className="p-3 text-gray-300">{row.rank ?? "-"}</td>
              <td className="p-3 text-gray-300">
                {row.starting_number ?? "-"}
              </td>
              <td className="p-3 font-semibold text-white">{row.name}</td>
              <td className="p-3">
                <select
                  value={row.player_id ?? ""}
                  onChange={(event) =>
                    onAssign(rowIndex, event.target.value)
                  }
                  className="min-w-[250px] rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                >
                  <option value="">Select player...</option>
                  {sectionPlayers.map((player) => (
                    <option key={player.player_id} value={player.player_id}>
                      {player.full_name}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-3 text-gray-300">{row.points ?? "-"}</td>
              <td className="p-3 text-gray-300">{row.tieBreak ?? "-"}</td>
              <td className="p-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    row.player_id
                      ? "bg-green-500/15 text-green-300"
                      : "bg-yellow-500/15 text-yellow-300"
                  }`}
                >
                  {row.player_id ? "Ready" : "Review"}
                </span>
              </td>
              <td className="p-3 text-xs text-gray-400">{row.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
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

