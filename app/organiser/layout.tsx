import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "Organiser Access | Polokwane Chess Club", template: "%s | PCC Organiser Access" }, description: "Secure organiser access to PCC tournament registration tools.", robots: { index: false, follow: false } };
export default function OrganiserLayout({ children }: { children: React.ReactNode }) { return children; }
