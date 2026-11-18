import photoRecipients from "./cdcAwardWinnerPhotos.json";
import awardRecords from "./cdcAwardWinnerRecords.json";

export type CdcAwardWinner = {
  name: string;
  awards: string[];
  photo?: string;
};

export type CdcAwardAgeGroup = {
  key: string;
  label: string;
  winners: CdcAwardWinner[];
};

function placeForWinner(winner: CdcAwardWinner) {
  if (winner.awards.some((award) => /\bfemale\b/i.test(award))) return 2;
  const explicitPlaces = winner.awards
    .map((award) => award.match(/^(\d+)(?:st|nd|rd|th)\b/i))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => Number(match[1]));
  if (explicitPlaces.length) return Math.min(...explicitPlaces);
  if (winner.awards.some((award) => /\bmale\b|outstanding.*player/i.test(award))) return 1;
  return null;
}

const ageGroups = [
  { key: "u08", label: "Under 8" },
  { key: "u10", label: "Under 10" },
  { key: "u12", label: "Under 12" },
  { key: "u14", label: "Under 14" },
  { key: "u16", label: "Under 16" },
  { key: "u18", label: "Under 18" },
  { key: "u20", label: "Under 20" },
] as const;

const normalizeName = (name: string) => name.toLocaleLowerCase().replace(/[^a-z0-9]/g, "");
const photoByName = new Map(
  photoRecipients.map((recipient) => [`${recipient.ageGroup}:${normalizeName(recipient.name)}`, recipient.src]),
);

export const cdcAwardWinnerGroups: CdcAwardAgeGroup[] = ageGroups.map((group) => {
  const recipients = new Map<string, CdcAwardWinner>();
  for (const record of awardRecords.filter((entry) => entry.ageGroup === group.key)) {
    const key = normalizeName(record.name);
    const existing = recipients.get(key);
    if (existing) {
      if (!existing.awards.includes(record.award)) existing.awards.push(record.award);
      continue;
    }
    recipients.set(key, {
      name: record.name,
      awards: [record.award],
      photo: photoByName.get(`${group.key}:${key}`),
    });
  }
  return {
    ...group,
    winners: [...recipients.values()].sort((a, b) => {
      const placeA = placeForWinner(a) ?? Number.MAX_SAFE_INTEGER;
      const placeB = placeForWinner(b) ?? Number.MAX_SAFE_INTEGER;
      return placeA - placeB || a.name.localeCompare(b.name);
    }),
  };
});

export function winnerPlace(winner: CdcAwardWinner) {
  return placeForWinner(winner);
}

export function winnerSpecialAwardLabel(award: string) {
  if (/commonwealth/i.test(award)) return "Represented South Africa at the 2026 Commonwealth Chess Championships";
  if (/upcoming player/i.test(award)) return "Upcoming player of the year";
  if (/overall outstanding player/i.test(award)) return "Overall outstanding player of the year";
  return null;
}
