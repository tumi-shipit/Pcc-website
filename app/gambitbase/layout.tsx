import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "GambitBase | Chess events, connected",
  description:
    "Find chess tournaments, register online and follow event information with GambitBase.",
};

export default function GambitBaseLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
