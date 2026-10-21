export const cdcServiceAwardCategories = [
  "Coach of the Year",
  "Arbiter of the Year",
  "Upcoming Arbiter of the Year",
  "Organiser of the Year",
  "Administrator of the Year",
  "Team Manager of the Year",
  "Upcoming Manager of the Year",
] as const;

export const cdcAwardsSiteUrl = "https://polokwanechessclub.co.za";

// This is the final approved shortlist supplied for the 2026 awards poster.
// submissionNames maps confirmed spelling/order variants in the nomination sheet
// back to the final name used on the awards page.
export const cdcApprovedNomineeRoster = [
  { name: "Elias", surname: "Mabotja", category: "Administrator of the Year", submissionNames: [["Elias", "Mabotja"]] },
  { name: "Tumelo", surname: "Mmola", category: "Administrator of the Year", submissionNames: [["Tumelo", "Mmola"]] },
  { name: "Elias", surname: "Mabotja", category: "Organiser of the Year", submissionNames: [["Elias", "Mabotja"]] },
  { name: "Tumelo", surname: "Mmola", category: "Organiser of the Year", submissionNames: [["Tumelo", "Mmola"]] },
  { name: "Elias", surname: "Mabotja", category: "Arbiter of the Year", submissionNames: [["Elias", "Mabotja"]] },
  { name: "Tumelo", surname: "Mmola", category: "Arbiter of the Year", submissionNames: [["Tumelo", "Mmola"]] },
  { name: "Kobus", surname: "Verreynne", category: "Arbiter of the Year", submissionNames: [["Kobus", "Verreynne"]] },
  { name: "Tumelo", surname: "Mmola", category: "Upcoming Arbiter of the Year", submissionNames: [["Tumelo", "Mmola"]] },
  { name: "Joe", surname: "Mahomole", category: "Coach of the Year", submissionNames: [["Joe", "Mahomole"]] },
  { name: "Mohololo", surname: "Nkoana", category: "Coach of the Year", submissionNames: [["Mohololo", "Nkoana"], ["Nkoana", "Mohololo"]] },
  { name: "Tumelo", surname: "Mmola", category: "Coach of the Year", submissionNames: [["Tumelo", "Mmola"]] },
  { name: "Anna", surname: "Chipape", category: "Coach of the Year", submissionNames: [["Anna", "Chipape"]] },
  { name: "Thapelo", surname: "Sindani", category: "Upcoming Manager of the Year", submissionNames: [["Thapelo", "Sindani"], ["Thapelo", "Sindane"], ["Sindani", "Thapelo"], ["Sindane", "Thapelo"]] },
  { name: "Disele", surname: "Malope", category: "Team Manager of the Year", submissionNames: [["Disele", "Malope"]] },
  { name: "Elias", surname: "Mabotja", category: "Team Manager of the Year", submissionNames: [["Elias", "Mabotja"]] },
  { name: "Thapelo", surname: "Sindani", category: "Team Manager of the Year", submissionNames: [["Thapelo", "Sindani"], ["Thapelo", "Sindane"], ["Sindani", "Thapelo"], ["Sindane", "Thapelo"]] },
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
    description: "Nominations are closed. Eligible nominees are being invited to accept or decline before the public list is published.",
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
    "Performed chess administration for Capricorn District Chess during 2026.",
  "Team Manager of the Year":
    "Managed a Capricorn District team, school, or club in at least one chess event during 2026.",
  "Upcoming Manager of the Year":
    "Regularly managed a team at Capricorn District Chess tournaments and did a good job overall.",
};
