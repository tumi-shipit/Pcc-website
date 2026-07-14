// Path: lib/identityResolver.ts

export type IdentityPlayer = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  date_of_birth?: string | null;
  email?: string | null;
  phone?: string | null;
  club?: string | null;
  province?: string | null;
  rating?: number | null;
  gender?: string | null;
};

export type IdentityMatch = {
  playerA: IdentityPlayer;
  playerB: IdentityPlayer;
  score: number;
  reasons: string[];
  confidence: "High" | "Medium" | "Low";
};

export function normalizeText(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

export function normalizeId(value: string | null | undefined) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function normalizePhone(value: string | null | undefined) {
  return String(value ?? "").replace(/\D/g, "");
}

export function makePairKey(a: string, b: string) {
  return [a, b].sort().join(":");
}

export function tokenSimilarity(a: string, b: string) {
  const left = new Set(normalizeText(a).split(" ").filter(Boolean));
  const right = new Set(normalizeText(b).split(" ").filter(Boolean));

  if (left.size === 0 || right.size === 0) return 0;

  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;

  return Math.round((intersection / union) * 100);
}

export function calculateIdentityScore(
  playerA: IdentityPlayer,
  playerB: IdentityPlayer
): IdentityMatch {
  const reasons: string[] = [];
  let score = 0;

  const chessA = normalizeId(playerA.chess_sa_id);
  const chessB = normalizeId(playerB.chess_sa_id);
  const fideA = normalizeId(playerA.fide_id);
  const fideB = normalizeId(playerB.fide_id);
  const emailA = normalizeText(playerA.email);
  const emailB = normalizeText(playerB.email);
  const phoneA = normalizePhone(playerA.phone);
  const phoneB = normalizePhone(playerB.phone);
  const nameScore = tokenSimilarity(playerA.full_name, playerB.full_name);

  if (chessA && chessB && chessA === chessB) {
    score += 100;
    reasons.push("Exact Chess SA ID match");
  }

  if (fideA && fideB && fideA === fideB) {
    score += 100;
    reasons.push("Exact FIDE ID match");
  }

  if (emailA && emailB && emailA === emailB) {
    score += 95;
    reasons.push("Exact email match");
  }

  if (phoneA && phoneB && phoneA === phoneB) {
    score += 90;
    reasons.push("Exact phone match");
  }

  if (
    playerA.date_of_birth &&
    playerB.date_of_birth &&
    playerA.date_of_birth === playerB.date_of_birth &&
    nameScore >= 60
  ) {
    score += 85;
    reasons.push("Name and date of birth match");
  }

  if (nameScore >= 90) {
    score += 75;
    reasons.push("Very similar name");
  } else if (nameScore >= 70) {
    score += 55;
    reasons.push("Similar name");
  } else if (nameScore >= 50) {
    score += 35;
    reasons.push("Partly similar name");
  }

  if (
    normalizeText(playerA.province) &&
    normalizeText(playerA.province) === normalizeText(playerB.province)
  ) {
    score += 10;
    reasons.push("Same province");
  }

  if (
    normalizeText(playerA.club) &&
    normalizeText(playerA.club) === normalizeText(playerB.club)
  ) {
    score += 10;
    reasons.push("Same club");
  }

  const finalScore = Math.min(score, 100);

  return {
    playerA,
    playerB,
    score: finalScore,
    reasons,
    confidence: finalScore >= 90 ? "High" : finalScore >= 70 ? "Medium" : "Low",
  };
}

export function buildDuplicateMatches(
  players: IdentityPlayer[],
  ignoredPairs: Set<string> = new Set(),
  minimumScore = 70
) {
  const matches: IdentityMatch[] = [];

  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const playerA = players[i];
      const playerB = players[j];
      const pairKey = makePairKey(playerA.id, playerB.id);

      if (ignoredPairs.has(pairKey)) continue;

      const match = calculateIdentityScore(playerA, playerB);

      if (match.score >= minimumScore) matches.push(match);
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
