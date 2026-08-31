export const verifiedRecords = [
  {
    slug: "chess-limpopo-teacher-training",
    title: "Chess Limpopo teacher training programme",
    label: "Development record",
    summary:
      "PCC leadership contributed to a Chess Limpopo training programme for teachers entering the coaching pathway, with club officials also supporting arbiter development.",
    dateLabel: "8-9 August 2026",
    image_url: null as string | null,
    album_url: null as string | null,
    album_label: "More pictures",
    statusLabel: "PCC record retained",
    organisations: [
      {
        name: "Chess Limpopo",
        role: "Programme organiser",
      },
      {
        name: "Chess South Africa",
        role: "Official source record",
      },
      {
        name: "Polokwane Chess Club",
        role: "Facilitation support",
      },
    ],
    facilitators: [
      {
        name: "Elias Mabotja",
        role: "Coaching facilitator",
      },
      {
        name: "PCC Games Organiser",
        role: "Arbiter development facilitator",
      },
      {
        name: "PCC Club Manager",
        role: "Arbiter development facilitator",
      },
    ],
    sourceLabel: "Chess SA official record",
    sourceUrl: "https://chessa.co.za/news-detail.php?id=436",
    body: [
      "Polokwane Chess Club keeps this record because development work matters as much as tournaments. The programme formed part of Chess Limpopo's work to train teachers and strengthen chess activity in schools.",
      "PCC leadership contributed to the programme through facilitation and support. The coaching side focused on helping teachers move into the coaching pathway, while arbiter development support helped strengthen the people who run games correctly and confidently.",
      "This record is kept on the PCC website so the work remains visible even if an external source changes, moves or removes its page. The external Chess SA page is kept as a supporting source where it remains available.",
    ],
  },
];

export type VerifiedRecord = (typeof verifiedRecords)[number];
export type VerifiedRecordOverride = {
  title?: string | null;
  summary?: string | null;
  content?: string | null;
  image_url?: string | null;
  album_url?: string | null;
  album_label?: string | null;
  date_label?: string | null;
  organisations?: Array<{ name: string; role: string }> | null;
  facilitators?: Array<{ name: string; role: string }> | null;
};

export function applyVerifiedRecordOverride(
  record: VerifiedRecord,
  override?: VerifiedRecordOverride | null
) {
  if (!override) return record;

  return {
    ...record,
    title: override.title?.trim() || record.title,
    summary: override.summary?.trim() || record.summary,
    image_url:
      override.image_url === undefined ? record.image_url : override.image_url,
    album_url:
      override.album_url === undefined ? record.album_url : override.album_url,
    album_label: override.album_label?.trim() || record.album_label,
    dateLabel: override.date_label?.trim() || record.dateLabel,
    organisations:
      Array.isArray(override.organisations) && override.organisations.length > 0
        ? override.organisations
        : record.organisations,
    facilitators:
      Array.isArray(override.facilitators) && override.facilitators.length > 0
        ? override.facilitators
        : record.facilitators,
    body:
      override.content?.trim()
        ? override.content
            .replace(/\r\n?/g, "\n")
            .split(/\n{2,}/)
            .map((paragraph) => paragraph.trim())
            .filter(Boolean)
        : record.body,
  };
}

export function buildVerifiedRecordNewsItems(
  overrides: Array<VerifiedRecordOverride & { slug?: string | null }> = []
) {
  return verifiedRecords.map((record) => {
    const override = overrides.find((item) => item.slug === record.slug);
    const mergedRecord = applyVerifiedRecordOverride(record, override);

    return {
      id: `verified-${record.slug}`,
      title: mergedRecord.title,
      excerpt: mergedRecord.summary,
      image_url: mergedRecord.image_url,
      category: "PCC Archive",
      published_at: null as string | null,
      display_date: mergedRecord.dateLabel,
      href: `/verified-records/${record.slug}`,
      protected: true,
    };
  });
}

export const verifiedRecordNewsItems = buildVerifiedRecordNewsItems();
