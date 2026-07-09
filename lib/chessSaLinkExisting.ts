import type { IdentityPlayer } from "@/lib/identityResolver";

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
  return value
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

export function cleanText(value: string | number | undefined | null) {
  const text = String(value ?? "").trim();
  if (!text || text.toLowerCase() === "nan") return null;
  return text;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && next === '"') {
      current += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  values.push(current.trim());
  return values;
}

function normalizeId(value: string | null) {
  if (!value) return null;
  return String(value).trim().replace(/\.0$/, "") || null;
}

function normalizeDate(value: string | null) {
  if (!value) return null;
  return value.replaceAll("/", "-").trim() || null;
}

function normalizeName(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function initialsFromName(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("");
}

function tokenSimilarity(a: string, b: string) {
  const aTokens = new Set(a.split(" ").filter(Boolean));
  const bTokens = new Set(b.split(" ").filter(Boolean));

  if (aTokens.size === 0 || bTokens.size === 0) return 0;

  let shared = 0;
  aTokens.forEach((token) => {
    if (bTokens.has(token)) shared += 1;
  });

  return (shared * 2) / (aTokens.size + bTokens.size);
}

function parsePccPlayerName(name: string) {
  const raw = String(name ?? "").trim();
  const normal = normalizeName(raw);
  const tokens = normal.split(" ").filter(Boolean);
  const bracket = normalizeName(raw.match(/\(([^)]+)\)/)?.[1] ?? "");

  const surnameCandidates = new Set<string>();
  const givenCandidates = new Set<string>();
  const initialCandidates = new Set<string>();

  if (raw.includes(",")) {
    const [surnamePart, restPart] = raw.split(",", 2);
    const surname = normalizeName(surnamePart);
    const rest = normalizeName(restPart ?? "");

    if (surname) surnameCandidates.add(surname);

    const restTokens = rest.split(" ").filter(Boolean);

    if (restTokens[0]) initialCandidates.add(restTokens[0]);
  }

  if (tokens[0]) surnameCandidates.add(tokens[0]);
  if (tokens.at(-1)) surnameCandidates.add(tokens.at(-1) ?? "");

  tokens.forEach((token) => {
    if (token.length === 1 || token.length === 2) initialCandidates.add(token);
    if (token.length > 2) givenCandidates.add(token);
  });

  if (bracket) {
    bracket.split(" ").forEach((token) => {
      if (token) givenCandidates.add(token);
    });
    initialCandidates.add(initialsFromName(bracket));
  }

  return {
    normal,
    surnameCandidates: Array.from(surnameCandidates).filter(Boolean),
    givenCandidates: Array.from(givenCandidates).filter(Boolean),
    initialCandidates: Array.from(initialCandidates).filter(Boolean),
  };
}

function scoreMatch(player: IdentityPlayer, row: ChessSaDatabaseRow) {
  const reasons: string[] = [];
  let score = 0;

  const playerChessId = normalizeId(player.chess_sa_id);
  const rowChessId = normalizeId(row.chess_sa_id);

  if (playerChessId && rowChessId && playerChessId === rowChessId) {
    return { score: 100, reasons: ["Exact Chess SA ID match"] };
  }

  const playerFideId = normalizeId(player.fide_id);
  const rowFideId = normalizeId(row.fide_id);

  if (playerFideId && rowFideId && playerFideId === rowFideId) {
    return { score: 100, reasons: ["Exact FIDE ID match"] };
  }

  const pcc = parsePccPlayerName(player.full_name);

  const chessSurname = normalizeName(
    row.raw.surname || row.raw.last_name || row.raw.family_name || ""
  );

  const chessFirstName = normalizeName(
    row.raw.firstname ||
      row.raw.first_name ||
      row.raw.firstnames ||
      row.raw.names ||
      row.raw.given_names ||
      ""
  );

  const chessInitials = initialsFromName(chessFirstName);
  const chessFullSurnameFirst = normalizeName(`${chessSurname} ${chessFirstName}`);
  const chessFullFirstSurname = normalizeName(`${chessFirstName} ${chessSurname}`);

  const surnameMatches = pcc.surnameCandidates.includes(chessSurname);

  const givenMatches =
    pcc.givenCandidates.some((name) => chessFirstName.includes(name)) ||
    pcc.givenCandidates.some((name) => name.includes(chessFirstName));

  const initialsMatch =
    pcc.initialCandidates.some((initials) =>
      chessInitials.startsWith(initials)
    ) ||
    pcc.initialCandidates.some((initials) =>
      initials.startsWith(chessInitials)
    );

  if (surnameMatches && givenMatches) {
    score += 90;
    reasons.push("Same surname and given name matches Chess SA first name");
  } else if (surnameMatches && initialsMatch) {
    score += 78;
    reasons.push("Same surname and initials match Chess SA first name");
  } else if (surnameMatches) {
    score += 50;
    reasons.push("Same surname");
  } else {
    const normalChess = normalizeName(row.full_name);
    const similarity = Math.max(
      tokenSimilarity(pcc.normal, normalChess),
      tokenSimilarity(pcc.normal, chessFullSurnameFirst),
      tokenSimilarity(pcc.normal, chessFullFirstSurname)
    );

    if (pcc.normal && normalChess && pcc.normal === normalChess) {
      score += 90;
      reasons.push("Exact normalized name match");
    } else if (similarity >= 0.8) {
      score += 70;
      reasons.push(`Strong similar name match (${Math.round(similarity * 100)}%)`);
    } else if (similarity >= 0.5) {
      score += 45;
      reasons.push(`Partial similar name match (${Math.round(similarity * 100)}%)`);
    }
  }

  if (
    player.rating !== null &&
    player.rating !== undefined &&
    row.rating !== null &&
    row.rating !== undefined
  ) {
    const diff = Math.abs(Number(player.rating) - Number(row.rating));

    if (diff === 0) {
      score += 10;
      reasons.push("Same rating");
    } else if (diff <= 20) {
      score += 8;
      reasons.push(`Rating close: ${diff} point difference`);
    } else if (diff <= 75) {
      score += 4;
      reasons.push(`Rating reasonably close: ${diff} point difference`);
    }
  }

  if (
    player.club &&
    row.club &&
    normalizeName(player.club) === normalizeName(row.club)
  ) {
    score += 5;
    reasons.push("Same club");
  }

  if (
    player.province &&
    row.province &&
    normalizeName(player.province) === normalizeName(row.province)
  ) {
    score += 5;
    reasons.push("Same province/federation");
  }

  return {
    score: Math.min(score, 100),
    reasons: reasons.length ? reasons : ["No useful match evidence"],
  };
}

export function parseChessSaDatabaseCsv(text: string): ChessSaDatabaseRow[] {
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

    const surname = cleanText(raw.surname || raw.last_name || raw.family_name);
    const firstName = cleanText(
      raw.firstname ||
        raw.first_name ||
        raw.firstnames ||
        raw.names ||
        raw.given_names
    );

    const fullName =
      cleanText(
        raw.full_name ||
          raw.name ||
          raw.player_name ||
          raw.surname_and_names
      ) ?? (surname && firstName ? `${surname} ${firstName}` : "");

    const ratingValue = raw.rating || raw.standard_rating || raw.chessa_rating;

    return {
      row_number: index + 2,
      full_name: fullName,
      chess_sa_id: normalizeId(
        cleanText(
          raw.chess_sa_id ||
            raw.chessa_id ||
            raw.chesssa_id ||
            raw.member_id ||
            raw.unique_no ||
            raw.unique_number
        )
      ),
      fide_id: normalizeId(cleanText(raw.fide_id || raw.fideid)),
      rating: ratingValue ? Number(ratingValue) || null : null,
      province: cleanText(raw.province || raw.region || raw.fed),
      club: cleanText(raw.club || raw.club_name),
      date_of_birth: normalizeDate(
        cleanText(raw.date_of_birth || raw.dob || raw.birth_date || raw.bdate)
      ),
      title: cleanText(raw.title),
      raw,
    };
  });
}

export function analyseExistingPlayersAgainstChessSa(
  existingPlayers: IdentityPlayer[],
  chessSaRows: ChessSaDatabaseRow[]
): ExistingPlayerLinkDecision[] {
  return existingPlayers.map((player) => {
    const matches = chessSaRows
      .map((row) => ({
        row,
        scored: scoreMatch(player, row),
      }))
      .sort((a, b) => b.scored.score - a.scored.score);

    const best = matches[0];

    if (!best || best.scored.score < 40) {
      return {
        player,
        match: best?.row ?? null,
        confidence_score: best?.scored.score ?? 0,
        confidence_label: "None",
        action: "no_match",
        reasons: best?.scored.reasons ?? ["No reliable Chess SA match found"],
      };
    }

    if (best.scored.score >= 85) {
      return {
        player,
        match: best.row,
        confidence_score: best.scored.score,
        confidence_label: "Exact",
        action: "link",
        reasons: best.scored.reasons,
      };
    }

    if (best.scored.score >= 70) {
      return {
        player,
        match: best.row,
        confidence_score: best.scored.score,
        confidence_label: "High",
        action: "link",
        reasons: best.scored.reasons,
      };
    }

    if (best.scored.score >= 50) {
      return {
        player,
        match: best.row,
        confidence_score: best.scored.score,
        confidence_label: "Medium",
        action: "review",
        reasons: best.scored.reasons,
      };
    }

    return {
      player,
      match: best.row,
      confidence_score: best.scored.score,
      confidence_label: "Low",
      action: "review",
      reasons: best.scored.reasons,
    };
  });
}
