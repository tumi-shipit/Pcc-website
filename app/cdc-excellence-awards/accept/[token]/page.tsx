import type { Metadata } from "next";
import CdcNomineeAcceptance from "@/components/CdcNomineeAcceptance";

export const metadata: Metadata = {
  title: "Nominee Response | 2nd CDC Excellence Awards",
  robots: { index: false, follow: false },
};

export default async function CdcNomineeResponsePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <CdcNomineeAcceptance token={token} />;
}
