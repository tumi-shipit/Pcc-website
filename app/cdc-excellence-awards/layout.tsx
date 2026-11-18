import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CDC Excellence Awards | Annual Archive",
  description:
    "The continuing official record of Capricorn District Chess Excellence Awards, with annual event information, Player Awards, and Officials and Teams.",
  openGraph: {
    title: "CDC Excellence Awards | Annual Archive",
    description:
      "The official annual record of Capricorn District Chess Excellence Awards, Player Awards, Officials and Teams.",
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
    description: "Annual Player Awards, Officials and Teams records from Capricorn District Chess.",
    images: ["/images/organisations/capricorn-district-chess.png"],
  },
};

export default function CdcAwardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
