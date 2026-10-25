import type { Metadata } from "next";
import CdcAwardsNewsArticleContent from "@/components/CdcAwardsNewsArticle";

export const metadata: Metadata = {
  title: "2nd CDC Excellence Awards 2026",
  description:
    "Nominations and voting have closed for the 2nd Capricorn District Chess Excellence Awards. Results will be announced soon.",
  openGraph: {
    title: "2nd CDC Excellence Awards 2026",
    description:
      "Nominations and voting have closed for the 2nd Capricorn District Chess Excellence Awards. Results will be announced soon.",
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
    title: "2nd CDC Excellence Awards 2026",
    description:
      "Nominations and voting have closed for the 2nd Capricorn District Chess Excellence Awards. Results will be announced soon.",
    images: ["/images/organisations/capricorn-district-chess.png"],
  },
};

export default function CdcAwardsNewsArticlePage() {
  return <CdcAwardsNewsArticleContent />;
}
