import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "2nd CDC Excellence Awards 2026",
  description:
    "Celebrate the people and achievements of Capricorn District Chess at the 2nd CDC Excellence Awards.",
  openGraph: {
    title: "2nd CDC Excellence Awards 2026",
    description:
      "Celebrating the people, passion and progress behind Capricorn District Chess. Voting has closed.",
    images: [
      {
        url: "/images/organisations/capricorn-district-chess.png",
        width: 500,
        height: 500,
        alt: "Capricorn District Chess crest",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "2nd CDC Excellence Awards 2026",
    description:
      "Celebrating the people, passion and progress behind Capricorn District Chess. Voting has closed.",
    images: ["/images/organisations/capricorn-district-chess.png"],
  },
};

export default function CdcAwardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
