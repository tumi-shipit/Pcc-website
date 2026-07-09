import {
  IdentityPlayer,
  calculateIdentityScore,
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
  title: string | null;
  raw: Record<string, string>;
};

export type ChessSaSyncDecision = {
  row: ChessSaSyncRow;
  matched_player_id: string | null;
  matched_player_name: string | null;
  confidence_score: number;
  confidence_label: "Exact" | "High" | "Medium" | "Low" | "None";
  action: "update_existing" | "create_new" | "review";
  reasons: string[];
};

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function cleanText(value: string | undefined) {
  const text = String(value ?? "").trim();
  return text || null;
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
      ) ?? "";

    const ratingValue = raw.rating || raw.standard_rating || raw.chessa_rating;

    return {
      row_number: index + 2,
      full_name: fullName,
      chess_sa_id: cleanText(
        raw.chess_sa_id || raw.chessa_id || raw.chesssa_id || raw.member_id
      ),
      fide_id: cleanText(raw.fide_id || raw.fideid),
      rating: ratingValue ? Number(ratingValue) || null : null,
      province: cleanText(raw.province || raw.region),
      club: cleanText(raw.club || raw.club_name),
      date_of_birth: cleanText(raw.date_of_birth || raw.dob || raw.birth_date),
      title: cleanText(raw.title),
      raw,
    };
  });
}

export function analyseChessSaRows(
  rows: ChessSaSyncRow[],
  existingPlayers: IdentityPlayer[]
): ChessSaSyncDecision[] {
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
      email: null,
      phone: null,
    };

    const matches = existingPlayers
      .map((player) => ({
        player,
        match: calculateIdentityScore(importedIdentity, player),
      }))
      .sort((a, b) => b.match.score - a.match.score);

    const best = matches[0];

    if (!row.full_name || !row.chess_sa_id) {
      return {
        row,
        matched_player_id: best?.player.id ?? null,
        matched_player_name: best?.player.full_name ?? null,
        confidence_score: best?.match.score ?? 0,
        confidence_label: "None",
        action: "review",
        reasons: ["Missing full name or Chess SA ID"],
      };
    }

    if (best && best.match.score >= 98) {
      return {
        row,
        matched_player_id: best.player.id,
        matched_player_name: best.player.full_name,
        confidence_score: best.match.score,
        confidence_label: "Exact",
        action: "update_existing",
        reasons: best.match.reasons,
      };
    }

    if (best && best.match.score >= 85) {
      return {
        row,
        matched_player_id: best.player.id,
        matched_player_name: best.player.full_name,
        confidence_score: best.match.score,
        confidence_label: "High",
        action: "update_existing",
        reasons: best.match.reasons,
      };
    }

    if (best && best.match.score >= 65) {
      return {
        row,
        matched_player_id: best.player.id,
        matched_player_name: best.player.full_name,
        confidence_score: best.match.score,
        confidence_label: "Medium",
        action: "review",
        reasons: best.match.reasons,
      };
    }

    return {
      row,
      matched_player_id: null,
      matched_player_name: null,
      confidence_score: best?.match.score ?? 0,
      confidence_label: best ? "Low" : "None",
      action: "create_new",
      reasons: best?.match.reasons ?? ["No matching player found"],
    };
  });
}
