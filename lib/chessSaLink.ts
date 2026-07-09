import {
  IdentityPlayer,
  calculateIdentityScore,
} from "@/lib/identityResolver";

export type ChessSaDatabaseRow = {
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

export type ExistingPlayerLinkDecision = {
  player: IdentityPlayer;
  match: ChessSaDatabaseRow | null;
  confidence_score: number;
  confidence_label: "Exact" | "High" | "Medium" | "Low" | "None";
  action: "link" | "review" | "no_match";
  reasons: string[];
};

export function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
}

export function cleanText(value: string | undefined) {
  const text = String(value ?? "").trim();
  return text || null;
}

export function parseChessSaDatabaseCsv(text: string): ChessSaDatabaseRow[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map(normalizeHeader);

  return lines.slice(1).map((line, index) => {
    const values = line.split(",");
    const raw: Record<string, string> = {};

    headers.forEach((header, i) => {
      raw[header] = values[i]?.trim() ?? "";
    });

    const fullName =
      cleanText(raw.full_name || raw.name || raw.player_name || raw.surname_and_names || raw.names) ?? "";

    const ratingValue = raw.rating || raw.standard_rating || raw.chessa_rating;

    return {
      row_number: index + 2,
      full_name: fullName,
      chess_sa_id: cleanText(raw.chess_sa_id || raw.chessa_id || raw.chesssa_id || raw.member_id),
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

function chessSaRowToIdentity(row: ChessSaDatabaseRow): IdentityPlayer {
  return {
    id: `chessa-row-${row.row_number}`,
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
}

export function analyseExistingPlayersAgainstChessSa(
  existingPlayers: IdentityPlayer[],
  chessSaRows: ChessSaDatabaseRow[]
): ExistingPlayerLinkDecision[] {
  const chessSaIdentities = chessSaRows.map((row) => ({ row, identity: chessSaRowToIdentity(row) }));

  return existingPlayers.map((player) => {
    const matches = chessSaIdentities
      .map((item) => ({ row: item.row, match: calculateIdentityScore(player, item.identity) }))
      .sort((a, b) => b.match.score - a.match.score);

    const best = matches[0];

    if (!best || best.match.score < 55) {
      return {
        player,
        match: null,
        confidence_score: best?.match.score ?? 0,
        confidence_label: "None",
        action: "no_match",
        reasons: ["No reliable Chess SA match found"],
      };
    }

    if (best.match.score >= 85) {
      return {
        player,
        match: best.row,
        confidence_score: best.match.score,
        confidence_label: best.match.score >= 98 ? "Exact" : "High",
        action: "link",
        reasons: best.match.reasons,
      };
    }

    return {
      player,
      match: best.row,
      confidence_score: best.match.score,
      confidence_label: best.match.score >= 65 ? "Medium" : "Low",
      action: "review",
      reasons: best.match.reasons,
    };
  });
}
