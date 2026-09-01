import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "PCC Tournament Registration Platform", description: "A friendly chess-registration platform for individuals, schools, organisations, districts, provinces and national federations.", path: "/platform", preview: "platform" });
export default function PlatformLayout({ children }: LayoutProps<"/platform">) { return children; }
