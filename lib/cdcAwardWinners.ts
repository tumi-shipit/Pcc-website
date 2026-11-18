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

const ageGroups = [
  { key: "u08", label: "Under 8" },
  { key: "u10", label: "Under 10" },
  { key: "u12", label: "Under 12" },
  { key: "u14", label: "Under 14" },
  { key: "u16", label: "Under 16" },
  { key: "u18", label: "Under 18" },
  { key: "u20", label: "Under 20" },
] as const;

function awardOrder(award: string) {
  const place = award.match(/^(\d+)(?:st|nd|rd|th)\b/i);
  return place ? Number(place[1]) : 1;
}

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
    winners: [...recipients.values()].sort((a, b) =>
      Math.min(...a.awards.map(awardOrder)) - Math.min(...b.awards.map(awardOrder)) ||
      a.name.localeCompare(b.name),
    ),
  };
});

export function winnerAwardLabel(award: string) {
  const place = award.match(/^(\d+)(st|nd|rd|th)\b/i);
  if (place) return `${place[1]}${place[2].toLowerCase()} place`;
  if (/commonwealth/i.test(award)) return "Represented South Africa at the 2026 Commonwealth Chess Championships";
  if (/upcoming player/i.test(award)) return "Upcoming player of the year";
  if (/overall outstanding player/i.test(award)) return "Overall outstanding player of the year";
  if (/\bfemale\b/i.test(award)) return "Female player of the year";
  if (/\bmale\b/i.test(award)) return "Male player of the year";
  return "Player of the year";
}
