import {
  IdentityMatch,
  IdentityPlayer,
  calculateIdentityScore,
} from "@/lib/identityResolver";

export type ImportedPlayerLike = {
  id?: string;
  row_number?: number;
  full_name?: string;
  name?: string;
  chess_sa_id?: string | null;
  fide_id?: string | null;
  date_of_birth?: string | null;
  email?: string | null;
  phone?: string | null;
  club?: string | null;
  province?: string | null;
  rating?: number | null;
  raw?: Record<string, unknown>;
};

export type ImportIdentityDecision = {
  imported: ImportedPlayerLike;
  imported_name: string;
  bestMatch: IdentityMatch | null;
  autoResolution: "use_existing" | "review" | "create_new";
};

export function getImportedName(row: ImportedPlayerLike) {
  return String(row.full_name ?? row.name ?? "").trim();
}

export function buildImportedIdentity(row: ImportedPlayerLike): IdentityPlayer {
  return {
    id: row.id ?? `import-${row.row_number ?? crypto.randomUUID()}`,
    full_name: getImportedName(row),
    chess_sa_id: row.chess_sa_id ?? null,
    fide_id: row.fide_id ?? null,
    date_of_birth: row.date_of_birth ?? null,
    email: row.email ?? null,
    phone: row.phone ?? null,
    club: row.club ?? null,
    province: row.province ?? null,
    rating: row.rating ?? null,
  };
}

export function findBestIdentityMatch(
  importedRow: ImportedPlayerLike,
  existingPlayers: IdentityPlayer[]
): IdentityMatch | null {
  const importedPlayer = buildImportedIdentity(importedRow);

  const matches = existingPlayers
    .map((player) => calculateIdentityScore(importedPlayer, player))
    .filter((match) => match.score >= 55)
    .sort((a, b) => b.score - a.score);

  return matches[0] ?? null;
}

export function analyseImportIdentities(
  importedRows: ImportedPlayerLike[],
  existingPlayers: IdentityPlayer[]
): ImportIdentityDecision[] {
  return importedRows.map((row) => {
    const bestMatch = findBestIdentityMatch(row, existingPlayers);
    const imported_name = getImportedName(row);

    let autoResolution: ImportIdentityDecision["autoResolution"] = "create_new";

    if (bestMatch && bestMatch.score >= 90) {
      autoResolution = "use_existing";
    } else if (bestMatch && bestMatch.score >= 65) {
      autoResolution = "review";
    }

    return {
      imported: row,
      imported_name,
      bestMatch,
      autoResolution,
    };
  });
}
