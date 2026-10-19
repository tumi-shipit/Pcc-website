import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CDC Excellence Awards 2026",
  description:
    "Celebrate the people and achievements of Capricorn District Chess at the 2026 CDC Excellence Awards.",
  openGraph: {
    title: "CDC Excellence Awards 2026",
    description:
      "Nominate a Capricorn District Chess contributor and celebrate excellence across the district.",
    type: "website",
  },
};

export default function CdcAwardsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
