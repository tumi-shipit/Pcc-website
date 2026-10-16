import { canonicalOrganisationName, organisationNameKey } from "./organisationNames";

export type TournamentType =
  | "Club"
  | "District"
  | "Provincial"
  | "National"
  | "Organisation / School";

export type TeamStandingsBasis = "National" | "Club / District";

export function teamStandingsBasisForTournamentType(
  tournamentType: TournamentType
): TeamStandingsBasis {
  return tournamentType === "National" ? "National" : "Club / District";
}

export function hasOfficialTeamStandings(results: readonly unknown[]) {
  return results.length > 0;
}


export type TeamPointsGrouping = "Auto" | "FED" | "TYPE" | "Club / Team" | "Imported";

export const teamPointsGroupingOptions: { value: TeamPointsGrouping; label: string }[] = [
  { value: "Auto", label: "Auto: FED → TYPE → Club/Team" },
  { value: "FED", label: "FED" },
  { value: "TYPE", label: "TYPE (your spreadsheet labels)" },
  { value: "Club / Team", label: "Club / Team" },
  { value: "Imported", label: "Imported team ranking" },
];

export function normalizeTeamPointsGrouping(value: unknown): TeamPointsGrouping {
  return teamPointsGroupingOptions.find((option) => option.value === value)?.value ?? "Auto";
}

export type TeamPointsResult = {
  points: number | null;
  federation?: string | null;
  result_type?: string | null;
  imported_club?: string | null;
  player?: { club?: string | null } | null;
};

export function cleanTeamGroup(value: unknown) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return ["", "-", "n/a", "na", "none", "null", "unknown"].includes(text.toLowerCase())
    ? null : text;
}

function resultTeamName(result: TeamPointsResult, grouping: Exclude<TeamPointsGrouping, "Auto" | "Imported">) {
  if (grouping === "FED") return cleanTeamGroup(result.federation);
  if (grouping === "TYPE") return cleanTeamGroup(result.result_type);
  // Older imports have no saved club. New imports use the tournament snapshot.
  return canonicalOrganisationName(cleanTeamGroup(result.imported_club) ?? result.player?.club);
}

export function calculateTeamPoints(results: readonly TeamPointsResult[], requested: TeamPointsGrouping) {
  const grouping = requested === "Auto"
    ? (["FED", "TYPE"] as const).find((candidate) => {
        const groups = new Set(results.map((result) => resultTeamName(result, candidate)?.toLocaleLowerCase("en-ZA")).filter(Boolean));
        return groups.size > 1;
      }) ?? "Club / Team"
    : requested;
  const teams = new Map<string, { name: string; points: number; playerCount: number; bestPlayerPoints: number }>();
  let unassignedCount = 0;
  if (grouping === "Imported") return { grouping, standings: [...teams.values()], unassignedCount };

  for (const result of results) {
    const name = resultTeamName(result, grouping);
    const key = grouping === "Club / Team" ? organisationNameKey(name) : name?.toLocaleLowerCase("en-ZA");
    if (!name || !key) { unassignedCount += 1; continue; }
    const team = teams.get(key) ?? { name, points: 0, playerCount: 0, bestPlayerPoints: 0 };
    const points = Number.isFinite(result.points) ? result.points! : 0;
    team.points += points;
    team.playerCount += 1;
    team.bestPlayerPoints = Math.max(team.bestPlayerPoints, points);
    teams.set(key, team);
  }
  const standings = [...teams.values()].sort((left, right) =>
    right.points - left.points || right.bestPlayerPoints - left.bestPlayerPoints || left.name.localeCompare(right.name)
  );
  return { grouping, standings, unassignedCount };
}
