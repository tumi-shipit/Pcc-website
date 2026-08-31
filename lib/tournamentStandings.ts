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
