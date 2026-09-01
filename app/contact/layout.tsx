import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "Contact Polokwane Chess Club", description: "Contact PCC for membership, tournament registration, player profiles, organiser access and general assistance.", path: "/contact", preview: "contact" });
export default function ContactLayout({ children }: LayoutProps<"/contact">) { return children; }
