import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "PCC Player Rankings", description: "Access player-ranking information from PCC and its recognised chess partners.", path: "/players/rankings", preview: "rankings" });
export default function RankingsLayout({ children }: LayoutProps<"/players/rankings">) { return children; }
