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
  organiser_name: string | null;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
  tournament_report: string | null;
  chess_results_url: string | null;
};

type Section = {
  id: string;
  section_name: string;
  display_order: number | null;
  minimum_birth_year: number | null;
  maximum_birth_year: number | null;
  minimum_rating: number | null;
  maximum_rating: number | null;
};

type ImportedPlayer = {
  starting_number: number | null;
  name: string;
  rating: number | null;
  federation: string | null;
  club: string | null;
  date_of_birth: string | null;
  chess_sa_id: string | null;
  fide_id: string | null;
  assigned_section_id?: string | null;
  assigned_section_name?: string | null;
  player_id: string | null;
  status: "Ready" | "Imported" | "Failed";
  message: string;
};

type ImportedStanding = {
  rank: number | null;
  starting_number: number | null;
  name: string;
  rating: number | null;
  federation: string | null;
  chess_sa_id: string | null;
  points: number | null;
  tieBreak: string | null;
  player_id: string | null;
  matchedPlayerName: string | null;
  matchedRegistrationId: string | null;
  matchedSectionId: string | null;
  matchedSectionName: string | null;
  roundResults: {
    roundNumber: number;
    opponentRank: number;
    color: string;
    result: "win" | "loss" | "draw";
  }[];
  upsetNotes: string[];
  status: "Ready" | "Imported" | "Failed" | "Unmatched";
  message: string;
};

type ImportedTeamStanding = {
  rank: number | null;
  team_name: string;
  federation: string | null;
  match_points: number | null;
  board_points: number | null;
  tieBreak: string | null;
  status: "Ready" | "Imported" | "Failed";
  message: string;
};

type SectionPlayer = {
  registration_id: string | null;
  player_id: string;
  full_name: string;
  chess_sa_id: string | null;
  section_id: string | null;
  section_name: string | null;
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

type ReportResultRow = {
  id: string;
  section_id: string | null;
  final_position: number | null;
  imported_name: string | null;
  imported_rating: number | null;
  points: number | null;
  award_title: string | null;
  notes: string | null;
  players:
    | { full_name: string | null; rating: number | null }
    | { full_name: string | null; rating: number | null }[]
    | null;
};

type ReportTeamResultRow = {
  id: string;
  section_id: string | null;
  final_position: number | null;
  team_name: string;
  match_points: number | null;
  board_points: number | null;
  tie_break: string | null;
};

type ReportOfficialRow = {
  role: string;
  full_name: string | null;
  title: string | null;
};

type ReportOrganisationRow = {
  role: string | null;
  organisation_id: string;
  representative_member_id: string | null;
  representative_name: string | null;
  organisation_name: string | null;
  representative_full_name: string | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";
const UPSET_RATING_DIFFERENCE = 200;

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

function formatDateParts(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function formatReportDate(date: string | null) {
  if (!date) return "the confirmed tournament date";

  return new Intl.DateTimeFormat("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(`${date}T12:00:00+02:00`));
}

function compactList(values: (string | null | undefined)[]) {
  return values
    .map((value) => String(value ?? "").trim())
    .filter(Boolean);
}

function sentenceList(values: string[]) {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  if (values.length === 2) return `${values[0]} and ${values[1]}`;

  return `${values.slice(0, -1).join(", ")} and ${values[values.length - 1]}`;
}

function normalizeImportedDate(value: unknown) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(
      value.getFullYear(),
      value.getMonth() + 1,
      value.getDate()
    );
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    return parsed ? formatDateParts(parsed.y, parsed.m, parsed.d) : null;
  }

  const text = String(value).trim();
  if (!text || text.toLowerCase() === "nan") return null;

  const dateOnly = text.split(/\s+/)[0]?.replace(/[.]/g, "-") ?? "";
  const isoMatch = dateOnly.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
  if (isoMatch) {
    return formatDateParts(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
  }

  const localMatch = dateOnly.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (!localMatch) return null;

  const first = Number(localMatch[1]);
  const second = Number(localMatch[2]);
  const year = Number(localMatch[3]);
  const day = first > 12 ? first : second > 12 ? second : first;
  const month = first > 12 ? second : second > 12 ? first : second;

  return formatDateParts(year, month, day);
}

function getBirthYearFromDate(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;
  const year = Number(dateOfBirth.slice(0, 4));
  return Number.isFinite(year) ? year : null;
}

function sectionHasAgeRule(section: Section) {
  return (
    section.minimum_birth_year !== null ||
    section.maximum_birth_year !== null
  );
}

function sectionHasRatingRule(section: Section) {
  return section.minimum_rating !== null || section.maximum_rating !== null;
}

function importedPlayerQualifiesForSection(
  row: ImportedPlayer,
  section: Section
) {
  const birthYear = getBirthYearFromDate(row.date_of_birth);

  if (sectionHasAgeRule(section)) {
    if (!birthYear) return false;

    if (
      section.minimum_birth_year !== null &&
      section.minimum_birth_year !== undefined &&
      birthYear < section.minimum_birth_year
    ) {
      return false;
    }

    if (
      section.maximum_birth_year !== null &&
      section.maximum_birth_year !== undefined &&
      birthYear > section.maximum_birth_year
    ) {
      return false;
    }
  }

  if (sectionHasRatingRule(section)) {
    if (row.rating === null) return false;

    if (
      section.minimum_rating !== null &&
      section.minimum_rating !== undefined &&
      row.rating < section.minimum_rating
    ) {
      return false;
    }

    if (
      section.maximum_rating !== null &&
      section.maximum_rating !== undefined &&
      row.rating > section.maximum_rating
    ) {
      return false;
    }
  }

  return true;
}

function chooseStartingRankSection(
  row: ImportedPlayer,
  sections: Section[],
  fallbackSectionId: string
) {
  const fallbackSection =
    sections.find((section) => section.id === fallbackSectionId) ??
    sections[0] ??
    null;
  const birthYear = getBirthYearFromDate(row.date_of_birth);

  if (birthYear) {
    const ageSection = sections.find(
      (section) => sectionHasAgeRule(section) && importedPlayerQualifiesForSection(row, section)
    );

    if (ageSection) {
      return {
        section: ageSection,
        reason: `Auto-assigned by DOB to ${ageSection.section_name}`,
      };
    }
  }

  if (row.rating !== null) {
    const ratingSection = sections.find(
      (section) =>
        !sectionHasAgeRule(section) &&
        sectionHasRatingRule(section) &&
        importedPlayerQualifiesForSection(row, section)
    );

    if (ratingSection) {
      return {
        section: ratingSection,
        reason: `Auto-assigned by rating to ${ratingSection.section_name}`,
      };
    }
  }

  const openSection = sections.find(
    (section) =>
      !sectionHasAgeRule(section) &&
      !sectionHasRatingRule(section) &&
      section.section_name.toLowerCase().includes("open")
  );

  if (birthYear && openSection) {
    return {
      section: openSection,
      reason: `Auto-assigned to ${openSection.section_name}`,
    };
  }

  return {
    section: fallbackSection,
    reason: fallbackSection
      ? `Used selected fallback section ${fallbackSection.section_name}`
      : "No tournament section available",
  };
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
  const normalized = text.replace(/\.0$/, "");
  const invalidIds = new Set(["0", "-", "n/a", "na", "none", "null"]);

  return invalidIds.has(normalized.toLowerCase()) ? null : normalized;
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

function findRoundColumnIndexes(headers: string[]) {
  return headers
    .map((header, index) => {
      const normalized = normalizeHeaderName(header);
      const roundMatch =
        normalized.match(/^(\d+)rd$/) ??
        normalized.match(/^round(\d+)$/) ??
        normalized.match(/^rd(\d+)$/);

      return roundMatch
        ? { index, roundNumber: Number(roundMatch[1]) }
        : null;
    })
    .filter(Boolean) as { index: number; roundNumber: number }[];
}

function parseRoundResult(value: unknown, roundNumber: number) {
  const text = String(value ?? "").trim().replace(/\s+/g, "");
  if (!text) return null;

  const match = text.match(/^(\d+)([wb])?([10+\-=½])$/i);
  if (!match) return null;

  const resultCode = match[3];
  const result =
    resultCode === "1" || resultCode === "+"
      ? "win"
      : resultCode === "0" || resultCode === "-"
      ? "loss"
      : "draw";

  return {
    roundNumber,
    opponentRank: Number(match[1]),
    color: match[2]?.toLowerCase() === "b" ? "Black" : "White",
    result,
  };
}

function withUpsetNotes(rows: ImportedStanding[]) {
  const rowsByRank = new Map<number, ImportedStanding>();

  rows.forEach((row) => {
    if (row.rank !== null) rowsByRank.set(row.rank, row);
  });

  return rows.map((row) => {
    if (!row.rating || row.rating <= 0) return row;

    const playerRating = row.rating;
    const upsetNotes = row.upsetNotes.filter(Boolean);

    row.roundResults.forEach((roundResult) => {
      if (roundResult.result !== "win") return;

      const opponent = rowsByRank.get(roundResult.opponentRank);
      if (!opponent?.rating || opponent.rating <= 0) return;

      const ratingGap = opponent.rating - playerRating;
      if (ratingGap < UPSET_RATING_DIFFERENCE) return;

      upsetNotes.push(
        `Upset: Round ${roundResult.roundNumber}, ${row.name} (${playerRating}) beat ${opponent.name} (${opponent.rating}) as ${roundResult.color}, a ${ratingGap}-point rating gap.`
      );
    });

    return { ...row, upsetNotes };
  });
}

function findTieBreakIndexes(headers: string[], excludedIndexes: number[]) {
  const excluded = new Set(excludedIndexes.filter((index) => index >= 0));

  return headers
    .map((header, index) => {
      const normalized = normalizeHeaderName(header);

      if (excluded.has(index)) return -1;
      if (
        normalized.includes("bh") ||
        normalized.includes("buchholz") ||
        normalized.includes("tiebreak") ||
        normalized === "tb1" ||
        normalized === "tb2" ||
        normalized === "tb3" ||
        normalized === "tb4"
      ) {
        return index;
      }

      return -1;
    })
    .filter((index) => index >= 0);
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
    ["Name", "Player", "Full Name", "Surname"],
  ]);

  if (headerRowIndex === -1) {
    throw new Error(
      "Could not find a player list header containing Name or Surname columns."
    );
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

  const surnameIndex = getFlexibleColumnIndex(headers, [
    "Surname",
    "Last Name",
    "Family Name",
  ]);

  const firstNamesIndex = getFlexibleColumnIndex(headers, [
    "First Names",
    "First Name",
    "Given Names",
    "Names",
    "Initials",
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

  const dateOfBirthIndex = getFlexibleColumnIndex(headers, [
    "Date of Birth",
    "DOB",
    "D.O.B.",
    "Birth Date",
    "Birthdate",
    "BDate",
    "B-Date",
    "Birthday",
    "Born",
  ]);

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

  if (nameIndex === -1 && surnameIndex === -1) {
    throw new Error("Missing required column: Name or Surname.");
  }

  return rows
    .slice(headerRowIndex + 1)
    .map((row) => {
      const firstCell = String(row[0] ?? "").trim().toLowerCase();
      if (firstCell.startsWith("total")) return null;

      const directName = nameIndex >= 0 ? String(row[nameIndex] ?? "").trim() : "";
      const surname =
        surnameIndex >= 0 ? String(row[surnameIndex] ?? "").trim() : "";
      const firstNames =
        firstNamesIndex >= 0 ? String(row[firstNamesIndex] ?? "").trim() : "";
      const name = directName || [surname, firstNames].filter(Boolean).join(" ");
      if (!name || /^\d+$/.test(name)) return null;

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
        date_of_birth:
          dateOfBirthIndex >= 0
            ? normalizeImportedDate(row[dateOfBirthIndex])
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
  rankingChessSaId: string | null,
  sectionPlayers: SectionPlayer[],
  tournamentPlayers: SectionPlayer[],
  importedPlayers: ImportedPlayer[]
) {
  const cleanRankingChessSaId = rankingChessSaId?.trim() || null;

  if (cleanRankingChessSaId) {
    const chessSaSectionMatch = sectionPlayers.find(
      (player) => player.chess_sa_id?.trim() === cleanRankingChessSaId
    );

    if (chessSaSectionMatch) {
      return {
        player_id: chessSaSectionMatch.player_id,
        full_name: chessSaSectionMatch.full_name,
        registration_id: chessSaSectionMatch.registration_id,
        section_id: chessSaSectionMatch.section_id,
        section_name: chessSaSectionMatch.section_name,
        confidence: 100,
        reason: "Matched by Chess SA ID",
      };
    }
  }

  if (cleanRankingChessSaId) {
    const chessSaImportMatch = importedPlayers.find(
      (player) =>
        player.chess_sa_id?.trim() === cleanRankingChessSaId && player.player_id
    );

    if (chessSaImportMatch?.player_id) {
      const registrationMatch =
        sectionPlayers.find(
          (player) => player.player_id === chessSaImportMatch.player_id
        ) ??
        tournamentPlayers.find(
          (player) => player.player_id === chessSaImportMatch.player_id
        );

      return {
        player_id: chessSaImportMatch.player_id,
        full_name: chessSaImportMatch.name,
        registration_id: registrationMatch?.registration_id ?? null,
        section_id: registrationMatch?.section_id ?? null,
        section_name: registrationMatch?.section_name ?? null,
        confidence: 100,
        reason: "Matched by Chess SA ID from section player import",
      };
    }
  }

  if (rankingStartingNumber !== null) {
    const startingNumberMatch = importedPlayers.find(
      (player) =>
        player.starting_number === rankingStartingNumber && player.player_id
    );

    if (startingNumberMatch?.player_id) {
      const registrationMatch =
        sectionPlayers.find(
          (player) => player.player_id === startingNumberMatch.player_id
        ) ??
        tournamentPlayers.find(
          (player) => player.player_id === startingNumberMatch.player_id
        );

      return {
        player_id: startingNumberMatch.player_id,
        full_name: startingNumberMatch.name,
        registration_id: registrationMatch?.registration_id ?? null,
        section_id: registrationMatch?.section_id ?? null,
        section_name: registrationMatch?.section_name ?? null,
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
      registration_id: best.registration_id,
      section_id: best.section_id,
      section_name: best.section_name,
      confidence: best.confidence,
      reason: `Matched by name (${best.confidence}%)`,
    };
  }

  if (cleanRankingChessSaId) {
    const chessSaTournamentMatch = tournamentPlayers.find(
      (player) => player.chess_sa_id?.trim() === cleanRankingChessSaId
    );

    if (chessSaTournamentMatch) {
      return {
        player_id: chessSaTournamentMatch.player_id,
        full_name: chessSaTournamentMatch.full_name,
        registration_id: chessSaTournamentMatch.registration_id,
        section_id: chessSaTournamentMatch.section_id,
        section_name: chessSaTournamentMatch.section_name,
        confidence: 100,
        reason: `Matched by Chess SA ID in ${chessSaTournamentMatch.section_name ?? "another section"}`,
      };
    }
  }

  const tournamentCandidates = tournamentPlayers
    .map((player) => ({
      ...player,
      confidence: Math.round(
        nameSimilarity(rankingName, player.full_name) * 100
      ),
    }))
    .sort((a, b) => b.confidence - a.confidence);

  const tournamentBest = tournamentCandidates[0];
  const tournamentSecond = tournamentCandidates[1];

  if (
    tournamentBest &&
    tournamentBest.confidence >= 78 &&
    (!tournamentSecond || tournamentBest.confidence - tournamentSecond.confidence >= 8)
  ) {
    return {
      player_id: tournamentBest.player_id,
      full_name: tournamentBest.full_name,
      registration_id: tournamentBest.registration_id,
      section_id: tournamentBest.section_id,
      section_name: tournamentBest.section_name,
      confidence: tournamentBest.confidence,
      reason: `Matched by name in ${tournamentBest.section_name ?? "another section"} (${tournamentBest.confidence}%)`,
    };
  }

  return null;
}

function parseFinalRankingRows(
  rows: unknown[][],
  sectionPlayers: SectionPlayer[],
  tournamentPlayers: SectionPlayer[],
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

  const federationIndex = getFlexibleColumnIndex(headers, [
    "FED",
    "Federation",
  ]);

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

  const pointsIndex = getFlexibleColumnIndex(headers, [
    "Pts",
    "Pts.",
    "Points",
    "Score",
  ]);

  const tieBreakIndex = findTieBreakIndex(headers);
  const roundColumnIndexes = findRoundColumnIndexes(headers);

  if (rankIndex === -1 || nameIndex === -1 || pointsIndex === -1) {
    throw new Error(
      "Final ranking columns could not be mapped. Required: rank, name and points."
    );
  }

  const parsedRows = rows
    .slice(headerRowIndex + 1)
    .map((row) => {
      const name = String(row[nameIndex] ?? "").trim();
      if (!name) return null;

      const startingNumber =
        startingNumberIndex >= 0 ? toNumber(row[startingNumberIndex]) : null;
      const chessSaId =
        chessSaIdIndex >= 0 ? cleanImportedId(row[chessSaIdIndex]) : null;

      const matchedPlayer = findBestSectionPlayer(
        name,
        startingNumber,
        chessSaId,
        sectionPlayers,
        tournamentPlayers,
        importedPlayers
      );

      return {
        rank: toNumber(row[rankIndex]),
        starting_number: startingNumber,
        name,
        rating: ratingIndex >= 0 ? toNumber(row[ratingIndex]) : null,
        federation:
          federationIndex >= 0 && row[federationIndex] !== ""
            ? String(row[federationIndex]).trim()
            : null,
        chess_sa_id: chessSaId,
        points: toNumber(row[pointsIndex]),
        tieBreak:
          tieBreakIndex >= 0 && row[tieBreakIndex] !== ""
            ? String(row[tieBreakIndex]).trim()
            : null,
        roundResults: roundColumnIndexes
          .map((roundColumn) =>
            parseRoundResult(row[roundColumn.index], roundColumn.roundNumber)
          )
          .filter(Boolean),
        player_id: matchedPlayer?.player_id ?? null,
        matchedPlayerName: matchedPlayer?.full_name ?? null,
        matchedRegistrationId: matchedPlayer?.registration_id ?? null,
        matchedSectionId: matchedPlayer?.section_id ?? null,
        matchedSectionName: matchedPlayer?.section_name ?? null,
        upsetNotes: [],
        status: matchedPlayer?.player_id ? "Ready" : "Unmatched",
        message:
          matchedPlayer?.reason ??
          "Choose the correct section player manually before importing",
      } as ImportedStanding;
    })
    .filter(Boolean) as ImportedStanding[];

  return withUpsetNotes(parsedRows);
}

function parseTeamStandingRows(rows: unknown[][]) {
  let headerRowIndex = findHeaderRowByColumns(rows, [
    ["Rank", "Rk.", "Rk", "Position", "Pos"],
    ["Team", "Team Name", "Club", "School", "Organisation", "Name"],
  ]);

  if (headerRowIndex === -1) {
    headerRowIndex = findHeaderRowByColumns(rows, [
      ["Team", "Team Name", "Club", "School", "Organisation", "Name"],
      ["Pts", "Pts.", "Points", "Score", "Match Points", "MP"],
    ]);
  }

  if (headerRowIndex === -1) {
    return parseHeaderlessChessResultsTeamRows(rows);
  }

  const headers = rows[headerRowIndex].map((cell) => String(cell ?? "").trim());
  const rankIndex = getFlexibleColumnIndex(headers, [
    "Rank",
    "Rk.",
    "Rk",
    "Position",
    "Pos",
  ]);
  const teamNameIndex = getFlexibleColumnIndex(headers, [
    "Team",
    "Team Name",
    "Club",
    "School",
    "Organisation",
    "Organization",
    "Name",
  ]);
  const federationIndex = getFlexibleColumnIndex(headers, [
    "FED",
    "Federation",
    "Province",
    "Region",
  ]);
  const matchPointsIndex = getFlexibleColumnIndex(headers, [
    "MP",
    "Match Points",
    "Pts",
    "Pts.",
    "Points",
    "Score",
  ]);
  const boardPointsIndex = getFlexibleColumnIndex(headers, [
    "BP",
    "Board Points",
    "Game Points",
    "Board Pts",
    "Board Pts.",
  ]);
  const tieBreakIndexes = findTieBreakIndexes(headers, [
    rankIndex,
    teamNameIndex,
    federationIndex,
    matchPointsIndex,
    boardPointsIndex,
  ]);

  if (teamNameIndex === -1) {
    throw new Error("Team results columns could not be mapped. Required: team name.");
  }

  return rows
    .slice(headerRowIndex + 1)
    .map((row) => {
      const firstCell = String(row[0] ?? "").trim().toLowerCase();
      const teamName = String(row[teamNameIndex] ?? "").trim();

      if (!teamName || firstCell.startsWith("total")) return null;

      const tieBreak = tieBreakIndexes
        .map((index) => String(row[index] ?? "").trim())
        .filter(Boolean)
        .join(" / ");

      return {
        rank: rankIndex >= 0 ? toNumber(row[rankIndex]) : null,
        team_name: teamName,
        federation:
          federationIndex >= 0 && row[federationIndex] !== ""
            ? String(row[federationIndex]).trim()
            : null,
        match_points:
          matchPointsIndex >= 0 ? toNumber(row[matchPointsIndex]) : null,
        board_points:
          boardPointsIndex >= 0 ? toNumber(row[boardPointsIndex]) : null,
        tieBreak: tieBreak || null,
        status: "Ready",
        message: "Ready to import",
      } as ImportedTeamStanding;
    })
    .filter(Boolean) as ImportedTeamStanding[];
}

function parseHeaderlessChessResultsTeamRows(rows: unknown[][]) {
  const parsed = rows
    .map((row) => {
      const rank = toNumber(row[0]);
      const teamName = String(row[1] ?? "").trim();
      const lowerTeamName = teamName.toLowerCase();

      if (!rank || !teamName) return null;
      if (teamName.includes(",")) return null;
      if (
        lowerTeamName.includes("http") ||
        lowerTeamName.includes("last update") ||
        lowerTeamName.includes("chess-results")
      ) {
        return null;
      }

      const tieBreak = [row[3], row[4], row[5]]
        .map((value) => String(value ?? "").trim())
        .filter(Boolean)
        .join(" / ");

      return {
        rank,
        team_name: teamName,
        federation: null,
        match_points: toNumber(row[2]),
        board_points: null,
        tieBreak: tieBreak || null,
        status: "Ready",
        message: "Ready to import from Chess-Results team list",
      } as ImportedTeamStanding;
    })
    .filter(Boolean) as ImportedTeamStanding[];

  if (parsed.length === 0) {
    throw new Error(
      'Could not find team results. Expected columns such as "Rk.", "Team" and "Pts.", or a Chess-Results grouped team list.'
    );
  }

  return parsed;
}

function reportResultName(result: ReportResultRow) {
  const player = Array.isArray(result.players)
    ? result.players[0] ?? null
    : result.players;

  return player?.full_name ?? result.imported_name ?? "Unnamed player";
}

function reportResultRating(result: ReportResultRow) {
  const player = Array.isArray(result.players)
    ? result.players[0] ?? null
    : result.players;

  return player?.rating ?? result.imported_rating ?? null;
}

function sectionNameForReport(sectionId: string | null, sections: Section[]) {
  return (
    sections.find((section) => section.id === sectionId)?.section_name ??
    "Overall"
  );
}

function sortReportResults(results: ReportResultRow[]) {
  return [...results].sort((first, second) => {
    const firstPosition = first.final_position ?? 999999;
    const secondPosition = second.final_position ?? 999999;

    if (firstPosition !== secondPosition) return firstPosition - secondPosition;
    return (second.points ?? 0) - (first.points ?? 0);
  });
}

function buildSectionReportLines(
  results: ReportResultRow[],
  sections: Section[]
) {
  const sectionIds =
    sections.length > 0
      ? sections.map((section) => section.id)
      : Array.from(new Set(results.map((result) => result.section_id ?? "overall")));

  return sectionIds
    .map((sectionId) => {
      const sectionResults = sortReportResults(
        results.filter((result) =>
          sectionId === "overall"
            ? result.section_id === null
            : result.section_id === sectionId
        )
      ).slice(0, 3);

      if (sectionResults.length === 0) return null;

      const sectionName = sectionNameForReport(
        sectionId === "overall" ? null : sectionId,
        sections
      );
      const winner = sectionResults[0];
      const winnerText = `${reportResultName(winner)}${
        winner.points !== null ? ` on ${winner.points} points` : ""
      }`;
      const podium = sectionResults
        .slice(1)
        .map((result, index) => {
          const place = index === 0 ? "second" : "third";
          return `${reportResultName(result)} finished ${place}${
            result.points !== null ? ` with ${result.points} points` : ""
          }`;
        })
        .join(", ");

      return podium
        ? `In the ${sectionName} section, ${winnerText} took first place, while ${podium}.`
        : `In the ${sectionName} section, ${winnerText} took first place.`;
    })
    .filter(Boolean) as string[];
}

function buildTeamReportLines(
  teamResults: ReportTeamResultRow[],
  sections: Section[]
) {
  const sectionIds = Array.from(
    new Set(teamResults.map((result) => result.section_id ?? "overall"))
  );

  return sectionIds
    .map((sectionId) => {
      const topTeams = [...teamResults]
        .filter((result) =>
          sectionId === "overall"
            ? result.section_id === null
            : result.section_id === sectionId
        )
        .sort((first, second) => {
          const firstPosition = first.final_position ?? 999999;
          const secondPosition = second.final_position ?? 999999;

          if (firstPosition !== secondPosition) {
            return firstPosition - secondPosition;
          }

          return (second.match_points ?? 0) - (first.match_points ?? 0);
        })
        .slice(0, 3);

      if (topTeams.length === 0) return null;

      const sectionName = sectionNameForReport(
        sectionId === "overall" ? null : sectionId,
        sections
      );
      const topTeam = topTeams[0];
      const otherTeams = topTeams
        .slice(1)
        .map((team) => team.team_name)
        .join(", ");

      return otherTeams
        ? `In the team standings for ${sectionName}, ${topTeam.team_name} led the section${
            topTeam.match_points !== null ? ` with ${topTeam.match_points} points` : ""
          }, followed by ${otherTeams}.`
        : `In the team standings for ${sectionName}, ${topTeam.team_name} led the section${
            topTeam.match_points !== null ? ` with ${topTeam.match_points} points` : ""
          }.`;
    })
    .filter(Boolean) as string[];
}

function buildOrganisationLine(rows: ReportOrganisationRow[]) {
  const organisations = compactList(
    rows.map((row) => {
      const representativeName =
        row.representative_full_name ?? row.representative_name ?? null;

      if (!row.organisation_name) return representativeName;

      return representativeName
        ? `${row.organisation_name}, represented by ${representativeName}`
        : row.organisation_name;
    })
  );

  return organisations.length > 0
    ? `The event was delivered with support from ${sentenceList(organisations)}.`
    : "";
}

function buildOfficialsLine(rows: ReportOfficialRow[]) {
  const officials = compactList(
    rows.map((row) => {
      if (!row.full_name) return null;
      return `${row.role}: ${row.title ? `${row.title} ` : ""}${row.full_name}`;
    })
  ).slice(0, 6);

  return officials.length > 0
    ? `The tournament team included ${sentenceList(officials)}.`
    : "";
}

function buildUpsetLines(results: ReportResultRow[]) {
  return results
    .flatMap((result) =>
      String(result.notes ?? "")
        .split("\n")
        .map((note) => note.trim())
        .filter((note) => note.toLowerCase().includes("upset"))
    )
    .slice(0, 5);
}

function buildTournamentReportDraft({
  tournament,
  sections,
  results,
  teamResults,
  officials,
  organisations,
  registrationCount,
}: {
  tournament: Tournament;
  sections: Section[];
  results: ReportResultRow[];
  teamResults: ReportTeamResultRow[];
  officials: ReportOfficialRow[];
  organisations: ReportOrganisationRow[];
  registrationCount: number | null;
}) {
  const playedCount = results.length;
  const sectionCount = sections.length;
  const reportDate = formatReportDate(tournament.start_date);
  const venue = tournament.venue ?? "the confirmed venue";
  const introParts = [
    `${tournament.tournament_name} was held on ${reportDate} at ${venue}.`,
    playedCount > 0
      ? `The event brought together ${playedCount} player${
          playedCount === 1 ? "" : "s"
        } across ${sectionCount || 1} section${sectionCount === 1 ? "" : "s"}.`
      : `The event report is being prepared from the completed tournament records.`,
    registrationCount !== null && registrationCount !== playedCount
      ? `${registrationCount} registration${
          registrationCount === 1 ? "" : "s"
        } were recorded on the platform.`
      : "",
  ];
  const sectionLines = buildSectionReportLines(results, sections);
  const teamLines = buildTeamReportLines(teamResults, sections);
  const upsetLines = buildUpsetLines(results);
  const organisationLine = buildOrganisationLine(organisations);
  const officialsLine = buildOfficialsLine(officials);
  const chessResultsLine = tournament.chess_results_url
    ? `The full tournament results are available on Chess-Results: ${tournament.chess_results_url}`
    : "";

  return [
    compactList(introParts).join(" "),
    organisationLine,
    officialsLine,
    sectionLines.length > 0 ? sectionLines.join("\n") : "",
    teamLines.length > 0 ? teamLines.join("\n") : "",
    upsetLines.length > 0
      ? `Notable upset highlights included:\n${upsetLines
          .map((line) => `- ${line.replace(/^Upset:\s*/i, "")}`)
          .join("\n")}`
      : "",
    chessResultsLine,
    `Polokwane Chess Club thanks all players, parents, coaches, officials and organisers who contributed to the success of the event.`,
  ]
    .filter((paragraph) => paragraph.trim())
    .join("\n\n");
}

export default function TournamentArchiveContinuationPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = String(params.id ?? "");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState("");

  const [sectionPlayers, setSectionPlayers] = useState<SectionPlayer[]>([]);
  const [tournamentPlayers, setTournamentPlayers] = useState<SectionPlayer[]>([]);
  const [playerRows, setPlayerRows] = useState<ImportedPlayer[]>([]);
  const [rankingRows, setRankingRows] = useState<ImportedStanding[]>([]);
  const [teamRows, setTeamRows] = useState<ImportedTeamStanding[]>([]);

  const [playerFileName, setPlayerFileName] = useState("");
  const [rankingFileName, setRankingFileName] = useState("");
  const [teamFileName, setTeamFileName] = useState("");
  const [message, setMessage] = useState("");
  const [reportText, setReportText] = useState("");
  const [lastImportSummary, setLastImportSummary] = useState<ImportSummary | null>(null);

  const [loading, setLoading] = useState(true);
  const [importingPlayers, setImportingPlayers] = useState(false);
  const [importingRankings, setImportingRankings] = useState(false);
  const [importingTeamResults, setImportingTeamResults] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savingReport, setSavingReport] = useState(false);

  async function loadArchiveData() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, organiser_name, start_date, venue, registration_status, tournament_report, chess_results_url")
      .eq("id", tournamentId)
      .single();

    const { data: sectionData, error: sectionError } = await supabase
      .from("tournament_sections")
      .select("id, section_name, display_order, minimum_birth_year, maximum_birth_year, minimum_rating, maximum_rating")
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("section_name", { ascending: true });

    if (tournamentError || !tournamentData) {
      setMessage("Completed tournament data could not be loaded.");
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

    const loadedTournament = tournamentData as Tournament;

    setTournament(loadedTournament);
    setReportText(loadedTournament.tournament_report ?? "");
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
      .select("id, section_id, player_id, players(id, full_name, chess_sa_id), tournament_sections(id, section_name)")
      .eq("tournament_id", tournamentId)
      .eq("section_id", sectionId)
      .limit(10000);

    if (error) {
      setMessage(`Could not load section players: ${error.message}`);
      return [] as SectionPlayer[];
    }

    const rows = (data ?? []) as unknown as {
      id: string;
      section_id: string | null;
      player_id: string;
      players:
        | { id: string; full_name: string; chess_sa_id: string | null }
        | { id: string; full_name: string; chess_sa_id: string | null }[]
        | null;
      tournament_sections:
        | { id: string; section_name: string }
        | { id: string; section_name: string }[]
        | null;
    }[];

    const loadedPlayers = rows
      .map((row) => {
        const player = Array.isArray(row.players)
          ? row.players[0]
          : row.players;

        if (!row.player_id || !player?.full_name) return null;

        return {
          registration_id: row.id,
          player_id: row.player_id,
          full_name: player.full_name,
          chess_sa_id: player.chess_sa_id ?? null,
          section_id: row.section_id,
          section_name: Array.isArray(row.tournament_sections)
            ? row.tournament_sections[0]?.section_name ?? null
            : row.tournament_sections?.section_name ?? null,
        } as SectionPlayer;
      })
      .filter(Boolean) as SectionPlayer[];

    setSectionPlayers(loadedPlayers);
    return loadedPlayers;
  }

  async function loadTournamentPlayers() {
    const { data, error } = await supabase
      .from("registrations")
      .select("id, section_id, player_id, players(id, full_name, chess_sa_id), tournament_sections(id, section_name)")
      .eq("tournament_id", tournamentId)
      .limit(10000);

    if (error) {
      setMessage(`Could not load tournament players: ${error.message}`);
      setTournamentPlayers([]);
      return [] as SectionPlayer[];
    }

    const rows = (data ?? []) as unknown as {
      id: string;
      section_id: string | null;
      player_id: string;
      players:
        | { id: string; full_name: string; chess_sa_id: string | null }
        | { id: string; full_name: string; chess_sa_id: string | null }[]
        | null;
      tournament_sections:
        | { id: string; section_name: string }
        | { id: string; section_name: string }[]
        | null;
    }[];

    const loadedPlayers = rows
      .map((row) => {
        const player = Array.isArray(row.players)
          ? row.players[0]
          : row.players;

        if (!row.player_id || !player?.full_name) return null;

        return {
          registration_id: row.id,
          player_id: row.player_id,
          full_name: player.full_name,
          chess_sa_id: player.chess_sa_id ?? null,
          section_id: row.section_id,
          section_name: Array.isArray(row.tournament_sections)
            ? row.tournament_sections[0]?.section_name ?? null
            : row.tournament_sections?.section_name ?? null,
        } as SectionPlayer;
      })
      .filter(Boolean) as SectionPlayer[];

    setTournamentPlayers(loadedPlayers);
    return loadedPlayers;
  }

  useEffect(() => {
    loadArchiveData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  useEffect(() => {
    if (selectedSectionId) {
      loadSectionPlayers(selectedSectionId);
      loadTournamentPlayers();
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

  const teamStats = useMemo(() => {
    return {
      rows: teamRows.length,
      imported: teamRows.filter((row) => row.status === "Imported").length,
      failed: teamRows.filter((row) => row.status === "Failed").length,
    };
  }, [teamRows]);

  const rankingMatchPlayers = useMemo(() => {
    const playersByRegistration = new Map<string, SectionPlayer>();

    [...tournamentPlayers, ...sectionPlayers].forEach((player) => {
      const key = player.registration_id ?? player.player_id;
      if (!playersByRegistration.has(key)) {
        playersByRegistration.set(key, player);
      }
    });

    return Array.from(playersByRegistration.values()).sort((a, b) =>
      `${a.section_name ?? ""} ${a.full_name}`.localeCompare(
        `${b.section_name ?? ""} ${b.full_name}`
      )
    );
  }, [sectionPlayers, tournamentPlayers]);

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
      const [freshSectionPlayers, freshTournamentPlayers] = await Promise.all([
        loadSectionPlayers(selectedSectionId),
        loadTournamentPlayers(),
      ]);
      const rows = await readExcelRows(file);
      const parsed = parseFinalRankingRows(
        rows,
        freshSectionPlayers,
        freshTournamentPlayers,
        playerRows
      );

      setRankingRows(parsed);

      const matched = parsed.filter((row) => row.player_id).length;
      const unmatched = parsed.length - matched;
      const upsetCount = parsed.reduce(
        (count, row) => count + row.upsetNotes.length,
        0
      );

      setMessage(
        `Parsed ${parsed.length} ranking rows from ${file.name}. ${matched} matched from registered tournament players${
          playerRows.length > 0 ? " and the optional player list" : ""
        }, ${unmatched} need review. ${upsetCount} automatic upset${
          upsetCount === 1 ? "" : "s"
        } detected.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not read ranking file."
      );
    }

    event.target.value = "";
  }

  async function parseTeamFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!selectedSectionId) {
      setMessage("Select a section first.");
      event.target.value = "";
      return;
    }

    setTeamFileName(file.name);
    setTeamRows([]);
    setLastImportSummary(null);
    setMessage("Reading team standings file...");

    try {
      const rows = await readExcelRows(file);
      const parsed = parseTeamStandingRows(rows);

      setTeamRows(parsed);
      setMessage(`Parsed ${parsed.length} team rows from ${file.name}.`);
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not read team standings file."
      );
    }

    event.target.value = "";
  }

  async function fetchSectionPlayers(sectionId: string) {
    const { data, error } = await supabase
      .from("registrations")
      .select("id, section_id, player_id, players(id, full_name, chess_sa_id), tournament_sections(id, section_name)")
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
          registration_id: row.id ?? null,
          player_id: row.player_id,
          full_name: player.full_name,
          chess_sa_id: player.chess_sa_id ?? null,
          section_id: row.section_id ?? null,
          section_name: Array.isArray(row.tournament_sections)
            ? row.tournament_sections[0]?.section_name ?? null
            : row.tournament_sections?.section_name ?? null,
        } as SectionPlayer;
      })
      .filter(Boolean) as SectionPlayer[];
  }

  async function findOrCreatePlayer(row: ImportedPlayer) {
    const normalizedName = normalizeName(row.name);
    const cleanChessSaId = row.chess_sa_id?.trim() || null;
    const cleanFideId = row.fide_id?.trim() || null;
    const cleanDateOfBirth = row.date_of_birth;

    async function fillMissingDateOfBirth(
      playerId: string,
      existingDateOfBirth: string | null | undefined
    ) {
      if (!cleanDateOfBirth || existingDateOfBirth) return;

      const { error: updateError } = await supabase
        .from("players")
        .update({
          date_of_birth: cleanDateOfBirth,
          updated_at: new Date().toISOString(),
        })
        .eq("id", playerId);

      if (updateError) throw new Error(updateError.message);
    }

    if (cleanChessSaId) {
      const { data: chessSaPlayer, error: chessSaError } = await supabase
        .from("players")
        .select("id, date_of_birth")
        .eq("chess_sa_id", cleanChessSaId)
        .maybeSingle();

      if (chessSaError) throw new Error(chessSaError.message);
      if (chessSaPlayer) {
        const player = chessSaPlayer as { id: string; date_of_birth: string | null };
        await fillMissingDateOfBirth(player.id, player.date_of_birth);
        return player.id;
      }
    }

    if (cleanFideId) {
      const { data: fidePlayer, error: fideError } = await supabase
        .from("players")
        .select("id, date_of_birth")
        .eq("fide_id", cleanFideId)
        .maybeSingle();

      if (fideError) throw new Error(fideError.message);
      if (fidePlayer) {
        const player = fidePlayer as { id: string; date_of_birth: string | null };
        await fillMissingDateOfBirth(player.id, player.date_of_birth);
        return player.id;
      }
    }

    const { data: existingPlayers, error: searchError } = await supabase
      .from("players")
      .select("id, full_name, date_of_birth")
      .limit(10000);

    if (searchError) throw new Error(searchError.message);

    const existingPlayer = (
      (existingPlayers ?? []) as {
        id: string;
        full_name: string;
        date_of_birth: string | null;
      }[]
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

      if (cleanDateOfBirth && !existingPlayer.date_of_birth) {
        updatePayload.date_of_birth = cleanDateOfBirth;
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
        date_of_birth: cleanDateOfBirth,
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

  async function findOrCreatePlayerFromStanding(row: ImportedStanding) {
    const normalizedName = normalizeName(row.name);
    const cleanChessSaId = row.chess_sa_id?.trim() || null;

    if (cleanChessSaId) {
      const { data: chessSaPlayer, error: chessSaError } = await supabase
        .from("players")
        .select("id")
        .eq("chess_sa_id", cleanChessSaId)
        .maybeSingle();

      if (chessSaError) throw new Error(chessSaError.message);
      if (chessSaPlayer) return (chessSaPlayer as { id: string }).id;
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
        province: row.federation || null,
        updated_at: new Date().toISOString(),
      };

      if (cleanChessSaId) {
        updatePayload.chess_sa_id = cleanChessSaId;
        updatePayload.verification_status = "Verified";
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
        chess_sa_id: cleanChessSaId,
        date_of_birth: null,
        gender: "Not supplied",
        club: null,
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

  async function ensureFinalRankingRegistration(
    row: ImportedStanding,
    playerId: string
  ) {
    const selectedSectionName =
      sections.find((section) => section.id === selectedSectionId)?.section_name ??
      null;

    if (row.matchedRegistrationId) {
      const registrationUpdate: {
        section_id?: string;
        payment_status: string;
        registration_status: string;
        updated_at: string;
      } = {
        payment_status: "Paid",
        registration_status: "Approved",
        updated_at: new Date().toISOString(),
      };

      if (row.matchedSectionId !== selectedSectionId) {
        registrationUpdate.section_id = selectedSectionId;
      }

      const { error: updateError } = await supabase
        .from("registrations")
        .update(registrationUpdate)
        .eq("id", row.matchedRegistrationId);

      if (updateError) throw updateError;

      if (row.matchedSectionId !== selectedSectionId) {
        return {
          registrationId: row.matchedRegistrationId,
          moved: true,
          createdLate: false,
          previousSectionName: row.matchedSectionName,
          sectionName: selectedSectionName,
        };
      }

      return {
        registrationId: row.matchedRegistrationId,
        moved: false,
        createdLate: false,
        previousSectionName: row.matchedSectionName,
        sectionName: row.matchedSectionName ?? selectedSectionName,
      };
    }

    const { data: existingRegistration, error: existingRegistrationError } =
      await supabase
        .from("registrations")
        .select("id, section_id, tournament_sections(section_name)")
        .eq("player_id", playerId)
        .eq("tournament_id", tournamentId)
        .maybeSingle();

    if (existingRegistrationError) throw existingRegistrationError;

    const existing = existingRegistration as
      | {
          id: string;
          section_id: string | null;
          tournament_sections:
            | { section_name: string | null }
            | { section_name: string | null }[]
            | null;
        }
      | null;

    if (existing) {
      const previousSectionName = Array.isArray(existing.tournament_sections)
        ? existing.tournament_sections[0]?.section_name ?? null
        : existing.tournament_sections?.section_name ?? null;
      const registrationUpdate: {
        section_id?: string;
        payment_status: string;
        registration_status: string;
        updated_at: string;
      } = {
        payment_status: "Paid",
        registration_status: "Approved",
        updated_at: new Date().toISOString(),
      };

      if (existing.section_id !== selectedSectionId) {
        registrationUpdate.section_id = selectedSectionId;
      }

      const { error: updateError } = await supabase
        .from("registrations")
        .update(registrationUpdate)
        .eq("id", existing.id);

      if (updateError) throw updateError;

      return {
        registrationId: existing.id,
        moved: existing.section_id !== selectedSectionId,
        createdLate: false,
        previousSectionName,
        sectionName: selectedSectionName,
      };
    }

    const { data: newRegistration, error: registrationError } = await supabase
      .from("registrations")
      .insert({
        player_id: playerId,
        tournament_id: tournamentId,
        section_id: selectedSectionId,
        payment_status: "Paid",
        proof_of_payment_url: null,
        registration_status: "Approved",
      })
      .select("id")
      .single();

    if (registrationError) throw registrationError;

    return {
      registrationId: (newRegistration as { id: string }).id,
      moved: false,
      createdLate: true,
      previousSectionName: null,
      sectionName: selectedSectionName,
    };
  }

  async function importPlayersForSection() {
    if (!tournament) {
      setMessage("Completed tournament data not loaded.");
      return;
    }

    if (!selectedSectionId) {
      setMessage("Select a section first.");
      return;
    }

    if (playerRows.length === 0) {
      setMessage("Upload a completed PCC bulk registration template first.");
      return;
    }

    setImportingPlayers(true);
    setMessage("");

    const updatedRows: ImportedPlayer[] = [];

    for (const row of playerRows) {
      try {
        const playerId = await findOrCreatePlayer(row);
        const targetSectionResult = chooseStartingRankSection(
          row,
          sections,
          selectedSectionId
        );
        const targetSection = targetSectionResult.section;

        if (!targetSection) {
          throw new Error("No tournament section could be selected.");
        }

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
              section_id: targetSection.id,
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
              section_id: targetSection.id,
              payment_status: "Paid",
              proof_of_payment_url: null,
              registration_status: "Approved",
            });

          if (registrationError) throw registrationError;
        }

        updatedRows.push({
          ...row,
          assigned_section_id: targetSection.id,
          assigned_section_name: targetSection.section_name,
          player_id: playerId,
          status: "Imported",
          message: `Player registration imported. ${targetSectionResult.reason}.`,
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
    const distributedCount = updatedRows.filter(
      (row) =>
        row.status === "Imported" &&
        row.assigned_section_id &&
        row.assigned_section_id !== selectedSectionId
    ).length;
    const assignedSectionCounts = updatedRows.reduce<Record<string, number>>(
      (counts, row) => {
        if (row.status !== "Imported") return counts;
        const sectionName = row.assigned_section_name ?? "Unknown section";
        counts[sectionName] = (counts[sectionName] ?? 0) + 1;
        return counts;
      },
      {}
    );

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
          distributed_rows: distributedCount,
          assigned_sections: assignedSectionCounts,
          note: "Imported starting rank players and auto-assigned registrations to qualifying sections where possible.",
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
            date_of_birth: row.date_of_birth,
            chess_sa_id: row.chess_sa_id,
            fide_id: row.fide_id,
            selected_fallback_section_id: selectedSectionId,
            assigned_section_id: row.assigned_section_id ?? selectedSectionId,
            assigned_section_name: row.assigned_section_name ?? null,
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
    await loadTournamentPlayers();

    setImportingPlayers(false);
    setMessage(
      distributedCount > 0
        ? `Starting Rank import completed. ${distributedCount} player${
            distributedCount === 1 ? "" : "s"
          } were auto-distributed to qualifying sections.`
        : "Starting Rank import completed. Players were registered in the selected fallback section."
    );
  }

  function assignRankingPlayer(
    rowIndex: number,
    playerKey: string
  ) {
    const selectedPlayer = sectionPlayers.find(
      (player) => (player.registration_id ?? player.player_id) === playerKey
    ) ?? tournamentPlayers.find(
      (player) => (player.registration_id ?? player.player_id) === playerKey
    );

    setRankingRows((current) =>
      current.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              player_id: selectedPlayer?.player_id ?? null,
              matchedPlayerName: selectedPlayer?.full_name ?? null,
              matchedRegistrationId: selectedPlayer?.registration_id ?? null,
              matchedSectionId: selectedPlayer?.section_id ?? null,
              matchedSectionName: selectedPlayer?.section_name ?? null,
              status: selectedPlayer ? "Ready" : "Unmatched",
              message: selectedPlayer
                ? `Manually reviewed and matched${
                    selectedPlayer.section_name
                      ? ` from ${selectedPlayer.section_name}`
                      : ""
                  }`
                : "Choose the correct section player manually before importing",
            }
          : row
      )
    );
  }

  async function importRankingsForSection() {
    if (!tournament) {
      setMessage("Completed tournament data not loaded.");
      return;
    }

    if (!selectedSectionId) {
      setMessage("Select a section first.");
      return;
    }

    const rowsToImport = rankingRows.filter((row) => row.name.trim());

    if (rowsToImport.length === 0) {
      setMessage(
        "No ranking rows to import. Upload this section's Final Ranking List first."
      );
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
      try {
        const playerId =
          row.player_id ?? (await findOrCreatePlayerFromStanding(row));
        const registrationResult = await ensureFinalRankingRegistration(
          row,
          playerId
        );

        const importNote = `Imported from section final ranking list: ${
          rankingFileName || "Swiss Manager file"
        }`;
        const resultNotes =
          row.upsetNotes.length > 0 ? row.upsetNotes.join("\n") : importNote;

        const { error } = await supabase.from("tournament_results").insert({
          tournament_id: tournament.id,
          player_id: playerId,
          section_id: selectedSectionId,
          final_position: row.rank,
          imported_name: row.name,
          imported_rating: row.rating,
          federation: row.federation,
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
          notes: resultNotes,
        });

        if (error) throw error;

        updatedRows.push({
          ...row,
          player_id: playerId,
          matchedRegistrationId: registrationResult.registrationId,
          matchedSectionId: selectedSectionId,
          matchedSectionName: registrationResult.sectionName,
          matchedPlayerName: row.matchedPlayerName ?? row.name,
          status: "Imported",
          message: registrationResult.createdLate
            ? "Section ranking imported and late registration created"
            : registrationResult.moved
            ? `Section ranking imported and registration moved from ${
                registrationResult.previousSectionName ?? "previous section"
              }`
            : "Section ranking imported",
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
    const lateRegistrationCount = updatedRows.filter((row) =>
      row.message.toLowerCase().includes("late registration created")
    ).length;

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
          late_registrations_created: lateRegistrationCount,
          note: "Imported final ranking rows into tournament_results for one section. Ranking-only players were added as late registrations.",
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
            name: row.name,
            rating: row.rating,
            federation: row.federation,
            chess_sa_id: row.chess_sa_id,
            points: row.points,
            tieBreak: row.tieBreak,
            upset_notes: row.upsetNotes,
            section_id: selectedSectionId,
            matched_registration_id: row.matchedRegistrationId,
            matched_section_id: row.matchedSectionId,
            matched_section_name: row.matchedSectionName,
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
    await loadSectionPlayers(selectedSectionId);
    await loadTournamentPlayers();
    setMessage(
      lateRegistrationCount > 0
        ? `Section final ranking import completed. ${lateRegistrationCount} late registration${
            lateRegistrationCount === 1 ? "" : "s"
          } created from the final ranking.`
        : "Section final ranking import completed."
    );
  }

  async function importTeamResultsForSection() {
    if (!tournament) {
      setMessage("Completed tournament data not loaded.");
      return;
    }

    if (!selectedSectionId) {
      setMessage("Select a section first.");
      return;
    }

    const rowsToImport = teamRows.filter((row) => row.team_name.trim());

    if (rowsToImport.length === 0) {
      setMessage("No team rows to import. Upload this section's Team Results file first.");
      return;
    }

    const confirmed = window.confirm(
      `Import ${rowsToImport.length} team result rows for this section? Existing team results for this section will be deleted first.`
    );

    if (!confirmed) return;

    setImportingTeamResults(true);
    setMessage("");

    const { error: deleteError } = await supabase
      .from("tournament_team_results")
      .delete()
      .eq("tournament_id", tournament.id)
      .eq("section_id", selectedSectionId);

    if (deleteError) {
      setMessage(
        `Could not clear old team results for this section: ${deleteError.message}. Run database/tournament_team_results_setup.sql if this is the first team-results import.`
      );
      setImportingTeamResults(false);
      return;
    }

    const updatedRows: ImportedTeamStanding[] = [];

    for (const row of teamRows) {
      try {
        const { error } = await supabase.from("tournament_team_results").insert({
          tournament_id: tournament.id,
          section_id: selectedSectionId,
          final_position: row.rank,
          team_name: row.team_name,
          federation: row.federation,
          match_points: row.match_points,
          board_points: row.board_points,
          tie_break: row.tieBreak,
          notes: `Imported from team results file: ${teamFileName || "Swiss Manager file"}`,
        });

        if (error) throw error;

        updatedRows.push({
          ...row,
          status: "Imported",
          message: "Team result imported",
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

      setTeamRows([...updatedRows, ...teamRows.slice(updatedRows.length)]);
    }

    const importedCount = updatedRows.filter((row) => row.status === "Imported").length;
    const failedCount = updatedRows.filter((row) => row.status === "Failed").length;

    try {
      const importSession = await createImportSession({
        import_type: "Tournament Section Team Results",
        source_page: `/admin/tournaments/${tournament.id}/archive`,
        tournament_id: tournament.id,
        file_name: teamFileName || null,
        status: failedCount > 0 ? "Completed with errors" : "Completed",
        total_rows: teamRows.length,
        matched_rows: importedCount,
        unmatched_rows: 0,
        created_rows: importedCount,
        updated_rows: 0,
        skipped_rows: 0,
        failed_rows: failedCount,
        summary: {
          section_id: selectedSectionId,
          note: "Imported team standings into tournament_team_results for one section.",
        },
      });

      await createImportSessionRows(
        importSession.id,
        updatedRows.map((row, index) => ({
          row_number: index + 1,
          imported_name: row.team_name,
          matched_player_id: null,
          matched_player_name: null,
          confidence_score: row.status === "Imported" ? 100 : 0,
          status: row.status,
          message: row.message,
          row_data: {
            rank: row.rank,
            team_name: row.team_name,
            federation: row.federation,
            match_points: row.match_points,
            board_points: row.board_points,
            tieBreak: row.tieBreak,
            section_id: selectedSectionId,
          },
        }))
      );
    } catch (summaryError) {
      console.error(summaryError);
    }

    setLastImportSummary({
      total_rows: teamRows.length,
      matched_rows: importedCount,
      unmatched_rows: 0,
      created_rows: importedCount,
      updated_rows: 0,
      skipped_rows: 0,
      failed_rows: failedCount,
      file_name: teamFileName || null,
      status: failedCount > 0 ? "Completed with errors" : "Completed",
    });

    setImportingTeamResults(false);
    setMessage("Team standings import completed.");
  }

  async function generateReportDraft() {
    if (!tournament) {
      setMessage("Completed tournament data not loaded.");
      return;
    }

    if (
      reportText.trim() &&
      !window.confirm("Replace the current report text with a generated draft?")
    ) {
      return;
    }

    setGeneratingReport(true);
    setMessage("Generating tournament report draft...");

    try {
      const [
        resultResponse,
        registrationResponse,
        officialResponse,
        assignmentResponse,
        teamResultResponse,
      ] = await Promise.all([
        supabase
          .from("tournament_results")
          .select(
            "id, section_id, final_position, imported_name, imported_rating, points, award_title, notes, players(full_name, rating)"
          )
          .eq("tournament_id", tournament.id)
          .order("section_id", { ascending: true, nullsFirst: true })
          .order("final_position", { ascending: true, nullsFirst: false }),
        supabase
          .from("registrations")
          .select("id", { count: "exact", head: true })
          .eq("tournament_id", tournament.id),
        supabase
          .from("public_tournament_role_profiles")
          .select("role, full_name, title")
          .eq("tournament_id", tournament.id)
          .order("role_group", { ascending: true })
          .order("role", { ascending: true }),
        supabase
          .from("tournament_organisations")
          .select(
            "role, organisation_id, representative_member_id, representative_name"
          )
          .eq("tournament_id", tournament.id)
          .order("display_order", { ascending: true, nullsFirst: false }),
        supabase
          .from("tournament_team_results")
          .select(
            "id, section_id, final_position, team_name, match_points, board_points, tie_break"
          )
          .eq("tournament_id", tournament.id)
          .order("section_id", { ascending: true, nullsFirst: true })
          .order("final_position", { ascending: true, nullsFirst: false }),
      ]);

      if (resultResponse.error) throw resultResponse.error;
      if (assignmentResponse.error) throw assignmentResponse.error;

      const assignments = (assignmentResponse.data ?? []) as {
        role: string | null;
        organisation_id: string;
        representative_member_id: string | null;
        representative_name: string | null;
      }[];
      const organisationIds = Array.from(
        new Set(assignments.map((assignment) => assignment.organisation_id))
      );
      const memberIds = Array.from(
        new Set(
          assignments
            .map((assignment) => assignment.representative_member_id)
            .filter(Boolean)
        )
      ) as string[];
      const [organisationDataResponse, memberDataResponse] = await Promise.all([
        organisationIds.length > 0
          ? supabase
              .from("organisations")
              .select("id, name")
              .in("id", organisationIds)
          : Promise.resolve({ data: [], error: null }),
        memberIds.length > 0
          ? supabase
              .from("organisation_committee_members")
              .select("id, full_name")
              .in("id", memberIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (organisationDataResponse.error) throw organisationDataResponse.error;
      if (memberDataResponse.error) throw memberDataResponse.error;

      const organisations = (organisationDataResponse.data ?? []) as {
        id: string;
        name: string | null;
      }[];
      const members = (memberDataResponse.data ?? []) as {
        id: string;
        full_name: string | null;
      }[];
      const reportOrganisations: ReportOrganisationRow[] = assignments.map(
        (assignment) => ({
          ...assignment,
          organisation_name:
            organisations.find(
              (organisation) => organisation.id === assignment.organisation_id
            )?.name ?? null,
          representative_full_name:
            members.find(
              (member) => member.id === assignment.representative_member_id
            )?.full_name ?? null,
        })
      );

      const draft = buildTournamentReportDraft({
        tournament,
        sections,
        results: (resultResponse.data ?? []) as unknown as ReportResultRow[],
        teamResults: teamResultResponse.error
          ? []
          : ((teamResultResponse.data ?? []) as unknown as ReportTeamResultRow[]),
        officials: officialResponse.error
          ? []
          : ((officialResponse.data ?? []) as unknown as ReportOfficialRow[]),
        organisations: reportOrganisations,
        registrationCount: registrationResponse.count ?? null,
      });

      setReportText(draft);
      setMessage("Tournament report draft generated. Review and edit it before saving.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Could not generate report: ${error.message}`
          : "Could not generate report."
      );
    }

    setGeneratingReport(false);
  }

  async function saveTournamentReport() {
    if (!tournament) {
      setMessage("Completed tournament data not loaded.");
      return;
    }

    setSavingReport(true);
    setMessage("Saving tournament report...");

    const { error } = await supabase
      .from("tournaments")
      .update({
        tournament_report: reportText.trim() || null,
      })
      .eq("id", tournament.id);

    if (error) {
      setMessage(`Could not save tournament report: ${error.message}`);
      setSavingReport(false);
      return;
    }

    setTournament({
      ...tournament,
      tournament_report: reportText.trim() || null,
    });
    setSavingReport(false);
    setMessage("Tournament report saved.");
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading completed tournament importer...
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
              Completed Manager
            </p>

            <div className="mt-3 grid gap-5 lg:grid-cols-[1fr_360px] lg:items-end">
              <div>
                <h1 className="text-4xl font-black md:text-6xl">
                  {tournament?.tournament_name ?? "Completed Tournament"}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base">
                  Build the public completed page one section at a time. For
                  website registrations, import the final ranking directly; use
                  the player list only when you need extra matching help.
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
                  These registered players are used to match the final ranking.
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
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Tournament report
                </p>
                <h2 className="mt-2 text-2xl font-black">Auto draft report</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                  Generate an editable report from imported final rankings,
                  team standings, upsets, organisers and officials. Review the
                  text before saving it to the public tournament page.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={generateReportDraft}
                  disabled={generatingReport || savingReport}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500 disabled:opacity-60"
                >
                  {generatingReport ? "Generating..." : "Generate Draft"}
                </button>

                <button
                  type="button"
                  onClick={saveTournamentReport}
                  disabled={generatingReport || savingReport}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {savingReport ? "Saving..." : "Save Report"}
                </button>
              </div>
            </div>

            <textarea
              value={reportText}
              onChange={(event) => setReportText(event.target.value)}
              rows={12}
              className={`${inputClass} mt-6 leading-7`}
              placeholder="Generate a draft or write the public tournament report here..."
            />

            <p className="mt-3 text-xs leading-5 text-gray-500">
              Saving updates the same public tournament report shown on the
              completed tournament page.
            </p>
          </section>

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
                    setTeamRows([]);
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
                  This section is used as the fallback when an imported row has
                  no DOB/rating match. Registered players currently loaded here:{" "}
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
            <section className="order-2 rounded-xl border border-white/10 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                    Optional
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Player list helper
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Upload the completed PCC bulk registration template.
                    Schools, teachers, coaches, chess clubs and chess
                    organisations can send one list for the organiser to import.
                  </p>

                  <a
                    href="/templates/pcc-bulk-registration-template.xlsx"
                    download
                    className="mt-4 inline-flex rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Download Excel template
                  </a>
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
                emptyText="Optional: upload the completed PCC bulk registration template to register and distribute players."
                headers={[
                  "SNo",
                  "Name",
                  "Rating",
                  "DOB",
                  "Target section",
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
                  row.date_of_birth ?? "-",
                  row.assigned_section_name ??
                    chooseStartingRankSection(
                      row,
                      sections,
                      selectedSectionId
                    ).section?.section_name ??
                    "-",
                  row.chess_sa_id ?? "-",
                  row.fide_id ?? "-",
                  row.federation ?? "-",
                  row.club ?? "-",
                  row.status,
                  row.message,
                ])}
              />
            </section>

            <section className="order-1 rounded-xl border border-white/10 bg-zinc-900 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                    Main import
                  </p>

                  <h2 className="mt-2 text-2xl font-black">
                    Final ranking
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-gray-400">
                    Upload the Final Ranking List for the selected section.
                    Existing results for this section will be replaced.
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
                sectionPlayers={rankingMatchPlayers}
                onAssign={assignRankingPlayer}
              />
            </section>
          </section>

          <section className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Swiss team tiebreaks
                </p>

                <h2 className="mt-2 text-2xl font-black">Team standings</h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                  Upload the team results for the selected section when the
                  event uses Swiss system with team tiebreaks. This is separate
                  from individual standings and does not create player records.
                </p>
              </div>

              <span className="w-fit rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {teamRows.length} rows
              </span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-[1fr_180px]">
              <input
                type="file"
                accept=".xls,.xlsx,.csv"
                onChange={parseTeamFile}
                disabled={!selectedSectionId}
                className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
              />

              <button
                type="button"
                onClick={importTeamResultsForSection}
                disabled={
                  !selectedSectionId ||
                  teamRows.length === 0 ||
                  importingTeamResults
                }
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {importingTeamResults ? "Importing..." : "Import Teams"}
              </button>
            </div>

            <div className="mt-6 grid grid-cols-3 gap-3">
              <MiniStat label="Rows" value={teamStats.rows} />
              <MiniStat
                label="Imported"
                value={teamStats.imported}
                valueClass="text-green-300"
              />
              <MiniStat
                label="Failed"
                value={teamStats.failed}
                valueClass="text-red-300"
              />
            </div>

            <PreviewTable
              emptyText="Upload the Team Results file only for Swiss system with team tiebreaks."
              headers={["Rank", "Team", "FED", "Pts", "Board pts", "Tie-break", "Status", "Message"]}
              rows={teamRows.map((row) => [
                row.rank ?? "-",
                row.team_name,
                row.federation ?? "-",
                row.match_points ?? "-",
                row.board_points ?? "-",
                row.tieBreak ?? "-",
                row.status,
                row.message,
              ])}
            />
          </section>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href={`/admin/tournaments/${tournamentId}/archive`}
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
      <table className="w-full min-w-[1350px] text-left text-sm">
        <thead className="sticky top-0 bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="p-3">Rank</th>
            <th className="p-3">SNo</th>
            <th className="p-3">Imported name</th>
            <th className="p-3">Rtg</th>
            <th className="p-3">FED</th>
            <th className="p-3">Chess SA ID</th>
            <th className="p-3">Matched PCC player</th>
            <th className="p-3">Registered section</th>
            <th className="p-3">Points</th>
            <th className="p-3">Tie-break</th>
            <th className="p-3">Auto upsets</th>
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
              <td className="p-3 text-gray-300">{row.rating ?? "-"}</td>
              <td className="p-3 text-gray-300">{row.federation ?? "-"}</td>
              <td className="p-3 text-gray-300">{row.chess_sa_id ?? "-"}</td>
              <td className="p-3">
                <select
                  value={row.matchedRegistrationId ?? row.player_id ?? ""}
                  onChange={(event) =>
                    onAssign(rowIndex, event.target.value)
                  }
                  className="min-w-[250px] rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-red-500"
                >
                  <option value="">Select player...</option>
                  {sectionPlayers.map((player) => (
                    <option
                      key={player.registration_id ?? player.player_id}
                      value={player.registration_id ?? player.player_id}
                    >
                      {player.full_name}
                      {player.section_name ? ` - ${player.section_name}` : ""}
                    </option>
                  ))}
                </select>
              </td>
              <td className="p-3 text-gray-300">
                {row.matchedSectionName ?? "-"}
              </td>
              <td className="p-3 text-gray-300">{row.points ?? "-"}</td>
              <td className="p-3 text-gray-300">{row.tieBreak ?? "-"}</td>
              <td className="max-w-[320px] p-3 text-xs text-yellow-200">
                {row.upsetNotes.length > 0 ? row.upsetNotes.join(" ") : "-"}
              </td>
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

