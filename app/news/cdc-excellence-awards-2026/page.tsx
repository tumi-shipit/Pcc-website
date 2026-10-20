import type { Metadata } from "next";
import CdcAwardsNewsArticleContent from "@/components/CdcAwardsNewsArticle";

export const metadata: Metadata = {
  title: "Nominate for the 2nd CDC Excellence Awards",
  description:
    "Nominations are open for the 2nd Capricorn District Chess Excellence Awards. Nominate a chess contributor by 23 October 2026.",
  openGraph: {
    title: "Nominate for the 2nd CDC Excellence Awards",
    description:
      "Nominations are open for the 2nd Capricorn District Chess Excellence Awards. Nominate a chess contributor by 23 October 2026.",
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
    title: "Nominate for the 2nd CDC Excellence Awards",
    description:
      "Nominations are open for the 2nd Capricorn District Chess Excellence Awards. Nominate a chess contributor by 23 October 2026.",
    images: ["/images/organisations/capricorn-district-chess.png"],
  },
};

export default function CdcAwardsNewsArticlePage() {
  return <CdcAwardsNewsArticleContent />;
}
