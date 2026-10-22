import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Verify Email · 2nd CDC Excellence Awards",
  description: "Verify your email address for the 2nd Capricorn District Chess Excellence Awards voting process.",
  robots: { index: false, follow: false },
};

export default function CdcAwardsVotePage() {
  redirect("https://docs.google.com/forms/d/e/1FAIpQLSeuW1rjhAcZIchq1OybxYlwfDr2qTQN5bsO_zZwW769WJEAzw/viewform?usp=publish-editor");
}
