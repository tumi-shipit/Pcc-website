import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "PCC News | Tournament Reports and Club Updates", description: "Read Polokwane Chess Club news, tournament reports, announcements and stories from the chess community.", path: "/news", preview: "news" });
export default function NewsLayout({ children }: LayoutProps<"/news">) { return children; }
