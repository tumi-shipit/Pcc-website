import {
  IdentityPlayer,
  calculateIdentityScore,
  normalizeId,
  tokenSimilarity,
} from "@/lib/identityResolver";

export type ChessSaSyncRow = {
  row_number: number;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  rating: number | null;
  province: string | null;
  club: string | null;
  date_of_birth: string | null;
  gender: string | null;
  title: string | null;
  raw: Record<string, string>;
};

export type ChessSaSyncDecision = {
  row: ChessSaSyncRow;
  matched_player_id: string | null;
  matched_player_name: string | null;
  confidence_score: number;
  confidence_label: "Exact" | "High" | "Medium" | "Low" | "None";
  action: "update_existing" | "create_new" | "review" | "skip";
  reasons: string[];
  matched_player?: IdentityPlayer | null;
};

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function cleanText(value: string | undefined) {
  const text = String(value ?? "").trim();
  return text || null;
}

function joinNameParts(...parts: Array<string | undefined>) {
  const name = parts
    .map((part) => String(part ?? "").trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return name || null;
}

function normalizeDate(value: string | undefined) {
  const text = String(value ?? "").trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return text;
}

export function parseChessSaCsv(text: string): ChessSaSyncRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(normalizeHeader);

  return lines.slice(1).map((line, index) => {
    const values = line.split(",");
    const raw: Record<string, string> = {};

    headers.forEach((header, i) => {
      raw[header] = values[i]?.trim() ?? "";
    });

    const fullName =
      cleanText(
        raw.full_name ||
          raw.name ||
          raw.player_name ||
          raw.surname_and_names ||
          raw.names
      ) ??
      joinNameParts(raw.firstname || raw.first_name || raw.names, raw.surname) ??
      joinNameParts(raw.surname, raw.firstname || raw.first_name || raw.names) ??
      "";

    const ratingValue = raw.rating || raw.standard_rating || raw.chessa_rating;

    return {
      row_number: index + 2,
      full_name: fullName,
      chess_sa_id: cleanText(
        raw.chess_sa_id ||
          raw.chessa_id ||
          raw.chesssa_id ||
          raw.member_id ||
          raw.unique_no ||
          raw.uniqueno ||
          raw.player_no ||
          raw.playerno
      ),
      fide_id: cleanText(raw.fide_id || raw.fideid),
      rating: ratingValue ? Number(ratingValue) || null : null,
      province: cleanText(raw.province || raw.region || raw.fed || raw.federation),
      club: cleanText(raw.club || raw.club_name),
      date_of_birth: normalizeDate(raw.date_of_birth || raw.dob || raw.birth_date || raw.bdate),
      gender: cleanText(raw.gender || raw.sex),
      title: cleanText(raw.title),
      raw,
    };
  });
}

export function analyseChessSaRows(
  rows: ChessSaSyncRow[],
  existingPlayers: IdentityPlayer[]
): ChessSaSyncDecision[] {
  const playersByChessSaId = existingPlayers.reduce<Record<string, IdentityPlayer[]>>(
    (groups, player) => {
      const id = normalizeId(player.chess_sa_id);
      if (!id) return groups;
      groups[id] = groups[id] ?? [];
      groups[id].push(player);
      return groups;
    },
    {}
  );

  return rows.map((row) => {
    const importedIdentity: IdentityPlayer = {
      id: `chessa-${row.row_number}`,
      full_name: row.full_name,
      chess_sa_id: row.chess_sa_id,
      fide_id: row.fide_id,
      date_of_birth: row.date_of_birth,
      club: row.club,
      province: row.province,
      rating: row.rating,
      gender: row.gender,
      email: null,
      phone: null,
    };

    if (!row.chess_sa_id) {
      return {
        row,
        matched_player_id: null,
        matched_player_name: null,
        confidence_score: 0,
        confidence_label: "None",
        action: "review",
        reasons: ["Missing Chess SA ID"],
        matched_player: null,
      };
    }

    const exactChessSaMatches = playersByChessSaId[normalizeId(row.chess_sa_id)] ?? [];

    if (exactChessSaMatches.length > 1) {
      return {
        row,
        matched_player_id: exactChessSaMatches[0].id,
        matched_player_name: exactChessSaMatches
          .map((player) => player.full_name)
          .join(", "),
        confidence_score: 100,
        confidence_label: "Exact",
        action: "review",
        reasons: ["Multiple Player Centre records already use this Chess SA ID"],
        matched_player: exactChessSaMatches[0],
      };
    }

    if (exactChessSaMatches.length === 1) {
      const player = exactChessSaMatches[0];
      const match = calculateIdentityScore(importedIdentity, player);
      const nameOnlyScore = tokenSimilarity(row.full_name, player.full_name);

      if (row.full_name && nameOnlyScore < 35) {
        return {
          row,
          matched_player_id: player.id,
          matched_player_name: player.full_name,
          confidence_score: match.score,
          confidence_label: "Exact",
          action: "review",
          reasons: [
            "Chess SA ID matches, but the imported name is very different from the Player Centre name",
          ],
          matched_player: player,
        };
      }

      return {
        row,
        matched_player_id: player.id,
        matched_player_name: player.full_name,
        confidence_score: 100,
        confidence_label: "Exact",
        action: "update_existing",
        reasons: ["Exact Chess SA ID match"],
        matched_player: player,
      };
    }

    return {
      row,
      matched_player_id: null,
      matched_player_name: null,
      confidence_score: 0,
      confidence_label: "None",
      action: "skip",
      reasons: ["Not in Player Centre"],
      matched_player: null,
    };

  });
}
