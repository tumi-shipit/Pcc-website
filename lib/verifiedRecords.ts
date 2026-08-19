export const verifiedRecords = [
  {
    slug: "chess-limpopo-teacher-training",
    title: "Chess Limpopo teacher training programme",
    label: "Development record",
    summary:
      "PCC leadership contributed to a Chess Limpopo training programme for teachers entering the coaching pathway, with club officials also supporting arbiter development.",
    dateLabel: "2026",
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

export const verifiedRecordNewsItems = verifiedRecords.map((record) => ({
  id: `verified-${record.slug}`,
  title: record.title,
  excerpt: record.summary,
  image_url: null as string | null,
  category: "Verified Record",
  published_at: null as string | null,
  display_date: record.dateLabel,
  href: `/verified-records/${record.slug}`,
  protected: true,
}));
