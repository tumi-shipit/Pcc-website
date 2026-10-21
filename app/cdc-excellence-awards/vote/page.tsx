import type { Metadata } from "next";
import CdcVoterEmailVerification from "@/components/CdcVoterEmailVerification";

export const metadata: Metadata = {
  title: "Verify Email · 2nd CDC Excellence Awards",
  description: "Verify your email address for the 2nd Capricorn District Chess Excellence Awards voting process.",
  robots: { index: false, follow: false },
};

export default function CdcAwardsVotePage() {
  return <CdcVoterEmailVerification />;
}
