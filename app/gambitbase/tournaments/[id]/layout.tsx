import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tournament | GambitBase",
  description:
    "View chess event details, entry information and results on GambitBase.",
};

export default function GambitBaseTournamentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
