import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chess Tournaments | GambitBase",
  description:
    "Browse published chess tournaments and register through GambitBase.",
};

export default function GambitBaseTournamentsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
