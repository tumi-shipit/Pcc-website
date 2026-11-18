import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CDC Excellence Awards | Annual Archive",
  description:
    "The continuing official record of Capricorn District Chess Excellence Awards, with annual event information and award recipients.",
  openGraph: {
    title: "CDC Excellence Awards | Annual Archive",
    description:
      "The official annual record of Capricorn District Chess Excellence Awards and recipients.",
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
    title: "CDC Excellence Awards | Annual Archive",
    description: "Annual award records and recipients from Capricorn District Chess.",
    images: ["/images/organisations/capricorn-district-chess.png"],
  },
};

export default function CdcAwardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
