export type TournamentRatingType = "standard" | "rapid" | "blitz";

export const tournamentRatingOptions: Array<{
  value: TournamentRatingType;
  label: string;
  helper: string;
}> = [
  {
    value: "standard",
    label: "Classical",
    helper: "Use Chess SA classical or standard ratings.",
  },
  {
    value: "rapid",
    label: "Rapid",
    helper: "Use Chess SA rapid ratings.",
  },
  {
    value: "blitz",
    label: "Blitz",
    helper: "Use Chess SA blitz ratings.",
  },
];

export function normalizeTournamentRatingType(
  value: string | null | undefined
): TournamentRatingType {
  const cleanValue = String(value ?? "").trim().toLowerCase();

  if (cleanValue === "rapid") return "rapid";
  if (cleanValue === "blitz") return "blitz";

  return "standard";
}

export function tournamentRatingLabel(value: string | null | undefined) {
  const ratingType = normalizeTournamentRatingType(value);

  return (
    tournamentRatingOptions.find((option) => option.value === ratingType)
      ?.label ?? "Classical"
  );
}
