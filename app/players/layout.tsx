import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "PCC Player Profiles", description: "Find Polokwane Chess Club player profiles, ratings and verified tournament records.", path: "/players", preview: "players" });
export default function PlayersLayout({ children }: LayoutProps<"/players">) { return children; }
