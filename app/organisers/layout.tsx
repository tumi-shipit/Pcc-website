import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "PCC Organiser Portal", description: "Secure, tournament-specific access for organisers authorised to manage PCC-supported event entries.", path: "/organisers", preview: "organisers" });
export default function OrganisersLayout({ children }: LayoutProps<"/organisers">) { return children; }
