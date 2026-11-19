import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Register for a Chess Event | GambitBase",
  description: "Register for a chess tournament through GambitBase.",
};

export default function GambitBaseRegisterLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
