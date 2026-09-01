import type { Metadata } from "next";

export const metadata: Metadata = { title: { default: "PCC Administration", template: "%s | PCC Administration" }, robots: { index: false, follow: false } };
export default function AdminLayout({ children }: { children: React.ReactNode }) { return children; }
