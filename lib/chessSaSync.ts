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

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      quoted = !quoted;
      continue;
    }

    if (char === "," && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
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

  const validParts = (year: string, month: string, day: string) => {
    const numericMonth = Number(month);
    const numericDay = Number(day);
    if (numericMonth < 1 || numericMonth > 12) return false;
    if (numericDay < 1 || numericDay > 31) return false;
    return true;
  };

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, middle, last] = text.split("-");
    if (validParts(year, middle, last)) return text;
    if (validParts(year, last, middle)) return `${year}-${last}-${middle}`;
    return null;
  }

  const yearFirstSlashMatch = text.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (yearFirstSlashMatch) {
    const [, year, middle, last] = yearFirstSlashMatch;
    const month = middle.padStart(2, "0");
    const day = last.padStart(2, "0");
    if (validParts(year, month, day)) return `${year}-${month}-${day}`;
    if (validParts(year, day, month)) return `${year}-${day}-${month}`;
    return null;
  }

  const yearFirstDashMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yearFirstDashMatch) {
    const [, year, middle, last] = yearFirstDashMatch;
    const month = middle.padStart(2, "0");
    const day = last.padStart(2, "0");
    if (validParts(year, month, day)) return `${year}-${month}-${day}`;
    if (validParts(year, day, month)) return `${year}-${day}-${month}`;
    return null;
  }

  const slashMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, left, right, year] = slashMatch;
    const day = left.padStart(2, "0");
    const month = right.padStart(2, "0");
    if (validParts(year, month, day)) return `${year}-${month}-${day}`;
    if (validParts(year, day, month)) return `${year}-${day}-${month}`;
    return null;
  }

  const dashMatch = text.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (dashMatch) {
    const [, left, right, year] = dashMatch;
    const day = left.padStart(2, "0");
    const month = right.padStart(2, "0");
    if (validParts(year, month, day)) return `${year}-${month}-${day}`;
    if (validParts(year, day, month)) return `${year}-${day}-${month}`;
    return null;
  }

  const excelSerial = Number(text);
  if (Number.isInteger(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const date = new Date(Date.UTC(1899, 11, 30 + excelSerial));
    return date.toISOString().slice(0, 10);
  }

  return null;
}

function normalizeGender(value: string | undefined) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text) return null;
  if (["m", "male", "boy", "boys"].includes(text)) return "Male";
  if (["f", "female", "girl", "girls"].includes(text)) return "Female";
  return String(value ?? "").trim();
}

function sameText(left: string | null | undefined, right: string | null | undefined) {
  return String(left ?? "").trim().toLowerCase() === String(right ?? "").trim().toLowerCase();
}

function sameDate(left: string | null | undefined, right: string | null | undefined) {
  return normalizeDate(String(left ?? "")) === normalizeDate(String(right ?? ""));
}

function sameNumber(left: number | null | undefined, right: number | null | undefined) {
  if (left == null && right == null) return true;
  return Number(left) === Number(right);
}

function syncReasons(row: ChessSaSyncRow, player: IdentityPlayer) {
  const reasons: string[] = [];

  if (!sameText(player.verification_status, "Verified")) {
    reasons.push("Player is not verified yet");
  }

  if (!player.chess_sa_id && row.chess_sa_id) reasons.push("Missing Chess SA ID");
  if (row.fide_id && !sameText(row.fide_id, player.fide_id)) reasons.push("FIDE ID differs");
  if (row.date_of_birth && !sameDate(row.date_of_birth, player.date_of_birth)) {
    reasons.push("Date of birth differs");
  }
  if (row.gender && !sameText(row.gender, player.gender)) reasons.push("Gender differs");
  if (row.rating != null && !sameNumber(row.rating, player.rating)) {
    reasons.push("Rating differs");
  }
  if (!player.club && row.club) reasons.push("Missing club");
  if (!player.province && row.province) reasons.push("Missing province");
  if (row.title && !sameText(row.title, player.title)) reasons.push("Title differs");

  return reasons;
}

export function parseChessSaCsv(text: string): ChessSaSyncRow[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const raw: Record<string, string> = {};

    headers.forEach((header, i) => {
      raw[header] = values[i]?.trim() ?? "";
    });

    const fullName =
      cleanText(
        raw.full_name ||
          raw.name ||
          raw.player ||
          raw.player_name ||
          raw.surname_name ||
          raw.surname_and_names ||
          raw.surname_names ||
          raw.surname_first_names ||
          raw.surname_firstname ||
          raw.names
      ) ??
      joinNameParts(raw.firstname || raw.first_name || raw.names, raw.surname) ??
      joinNameParts(raw.surname, raw.firstname || raw.first_name || raw.names) ??
      "";

    const ratingValue =
      raw.rating ||
      raw.standard_rating ||
      raw.chessa_rating ||
      raw.rtg ||
      raw.rate ||
      raw.national_rating;

    return {
      row_number: index + 2,
      full_name: fullName,
      chess_sa_id: cleanText(
        raw.chess_sa_id ||
          raw.chessa_id ||
          raw.chesssa_id ||
          raw.chess_sa ||
          raw.chessa ||
          raw.idnumber ||
          raw.id_number ||
          raw.member_id ||
          raw.sa_id ||
          raw.said ||
          raw.unique_no ||
          raw.uniqueno ||
          raw.player_no ||
          raw.playerno
      ),
      fide_id: cleanText(raw.fide_id || raw.fideid || raw.fide_no || raw.fide_number),
      rating: ratingValue ? Number(ratingValue) || null : null,
      province: cleanText(raw.province || raw.region || raw.fed || raw.federation),
      club: cleanText(raw.club || raw.club_name),
      date_of_birth: normalizeDate(raw.date_of_birth || raw.dob || raw.birth_date || raw.bdate),
      gender: normalizeGender(raw.gender || raw.sex),
      title: cleanText(raw.title),
      raw,
    };
  });
}

export function analyseChessSaRows(
  rows: ChessSaSyncRow[],
  existingPlayers: IdentityPlayer[]
): ChessSaSyncDecision[] {
  const importedIdCounts = rows.reduce<Record<string, number>>((counts, row) => {
    const id = normalizeId(row.chess_sa_id);
    if (!id) return counts;
    counts[id] = (counts[id] ?? 0) + 1;
    return counts;
  }, {});

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
        action: "skip",
        reasons: ["Missing Chess SA ID"],
        matched_player: null,
      };
    }

    const normalizedChessSaId = normalizeId(row.chess_sa_id);

    const exactChessSaMatches = playersByChessSaId[normalizedChessSaId] ?? [];

    if ((importedIdCounts[normalizedChessSaId] ?? 0) > 1) {
      return {
        row,
        matched_player_id: exactChessSaMatches[0]?.id ?? null,
        matched_player_name:
          exactChessSaMatches.map((player) => player.full_name).join(", ") || null,
        confidence_score: 0,
        confidence_label: "None",
        action: "review",
        reasons: ["Duplicate Chess SA ID appears more than once in the uploaded file"],
        matched_player: exactChessSaMatches[0] ?? null,
      };
    }

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

      if (row.full_name && nameOnlyScore < 35 && match.score < 100) {
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

      const reasons = syncReasons(row, player);

      return {
        row,
        matched_player_id: player.id,
        matched_player_name: player.full_name,
        confidence_score: 100,
        confidence_label: "Exact",
        action: reasons.length > 0 ? "update_existing" : "skip",
        reasons:
          reasons.length > 0
            ? ["Exact Chess SA ID match", ...reasons]
            : ["Already synced"],
        matched_player: player,
      };
    }

    const candidateMatches = existingPlayers
      .filter((player) => !normalizeId(player.chess_sa_id))
      .map((player) => ({
        player,
        match: calculateIdentityScore(importedIdentity, player),
      }))
      .sort((left, right) => right.match.score - left.match.score);

    const bestCandidate = candidateMatches[0] ?? null;
    const tiedBestCandidates = bestCandidate
      ? candidateMatches.filter((candidate) => candidate.match.score === bestCandidate.match.score)
      : [];

    if (bestCandidate && bestCandidate.match.score >= 100) {
      if (tiedBestCandidates.length > 1) {
        return {
          row,
          matched_player_id: bestCandidate.player.id,
          matched_player_name: tiedBestCandidates.map((candidate) => candidate.player.full_name).join(", "),
          confidence_score: bestCandidate.match.score,
          confidence_label: "Exact",
          action: "review",
          reasons: ["Multiple Player Centre records safely match this Chess SA row"],
          matched_player: bestCandidate.player,
        };
      }

      return {
        row,
        matched_player_id: bestCandidate.player.id,
        matched_player_name: bestCandidate.player.full_name,
        confidence_score: bestCandidate.match.score,
        confidence_label: "Exact",
        action: "update_existing",
        reasons: ["Safe Chess SA identity match", ...bestCandidate.match.reasons],
        matched_player: bestCandidate.player,
      };
    }

    if (bestCandidate && bestCandidate.match.score >= 85) {
      return {
        row,
        matched_player_id: bestCandidate.player.id,
        matched_player_name: bestCandidate.player.full_name,
        confidence_score: bestCandidate.match.score,
        confidence_label: "High",
        action: "review",
        reasons: ["Strong possible Chess SA identity match", ...bestCandidate.match.reasons],
        matched_player: bestCandidate.player,
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
