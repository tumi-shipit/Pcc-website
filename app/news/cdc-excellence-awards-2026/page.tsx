import type { Metadata } from "next";
import CdcAwardsNewsArticleContent from "@/components/CdcAwardsNewsArticle";

export const metadata: Metadata = {
  title: "CDC Excellence Awards 2026",
  description:
    "See the 2026 CDC Excellence Awards Player Awards, Officials and Teams, and recognition winners in the annual archive.",
  openGraph: {
    title: "CDC Excellence Awards 2026",
    description:
      "See the 2026 CDC Excellence Awards Player Awards, Officials and Teams, and recognition winners in the annual archive.",
    type: "article",
    images: [
      {
        url: "/images/organisations/capricorn-district-chess.png",
        width: 500,
        height: 500,
        alt: "Capricorn District Chess crest",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "CDC Excellence Awards 2026",
    description:
      "See the 2026 CDC Excellence Awards Player Awards, Officials and Teams, and recognition winners in the annual archive.",
    images: ["/images/organisations/capricorn-district-chess.png"],
  },
};

export default function CdcAwardsNewsArticlePage() {
  return <CdcAwardsNewsArticleContent />;
}
