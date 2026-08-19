export const verifiedRecords = [
  {
    slug: "chess-limpopo-teacher-training",
    title: "Chess Limpopo teacher training programme",
    label: "Development record",
    summary:
      "PCC leadership contributed to a Chess Limpopo training programme for teachers entering the coaching pathway, with club officials also supporting arbiter development.",
    dateLabel: "Provincial development",
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
