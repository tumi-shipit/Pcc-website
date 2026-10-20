export const cdcServiceAwardCategories = [
  "Coach of the Year",
  "Arbiter of the Year",
  "Upcoming Arbiter of the Year",
  "Organiser of the Year",
  "Administrator of the Year",
  "Team Manager of the Year",
  "Upcoming Manager of the Year",
] as const;

export const cdcAwardGroups = [
  {
    title: "Player awards",
    description: "Based on overall results from the 2026 chess year.",
    categories: [
      ...["U8", "U10", "U12", "U14", "U16", "U18", "U20"].flatMap((age) => [
        `Best Male Player — ${age}`,
        `Best Female Player — ${age}`,
      ]),
      "Upcoming Player of the Year",
    ],
    mode: "results" as const,
  },
  {
    title: "Chess service and contribution awards",
    description: "Nominations are open for these seven awards. The public vote will follow.",
    categories: [...cdcServiceAwardCategories],
    mode: "nominations" as const,
  },
  {
    title: "Team and organisational awards",
    description: "Based on overall results from the 2026 chess year.",
    categories: ["Team of the Year — Primary", "Team of the Year — High School"],
    mode: "results" as const,
  },
  {
    title: "Recognition awards",
    description: "Based on the year's results and verified records.",
    categories: ["International Recognitions", "Long Service Awards"],
    mode: "results" as const,
  },
] as const;

export const cdcNominationEligibility: Record<
  (typeof cdcServiceAwardCategories)[number],
  string
> = {
  "Coach of the Year":
    "Coached Capricorn District players or teams during 2026, or coached at a school within Capricorn District.",
  "Arbiter of the Year":
    "Served as an arbiter at a Capricorn District chess event during 2026.",
  "Upcoming Arbiter of the Year":
    "Qualified as an arbiter recently and officiated at least one Capricorn District Chess tournament.",
  "Organiser of the Year":
    "Organised a chess tournament in Capricorn District or helped organise at least one Capricorn District chess event during 2026.",
  "Administrator of the Year":
    "Performed chess administration within Capricorn District during 2026.",
  "Team Manager of the Year":
    "Managed a Capricorn District team, school, or club in at least one chess event during 2026.",
  "Upcoming Manager of the Year":
    "Regularly managed a team at Capricorn District Chess tournaments and did a good job overall.",
};
