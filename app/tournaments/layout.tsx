import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "Chess Tournaments | Polokwane Chess Club", description: "Find upcoming, live and completed chess tournaments with event information and online registration.", path: "/tournaments", preview: "tournaments" });
export default function TournamentsLayout({ children }: LayoutProps<"/tournaments">) { return children; }
