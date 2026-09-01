import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "PCC Member Centre", description: "Sign in to view your Polokwane Chess Club membership and linked player information.", path: "/members", preview: "membership" });
export default function MembersLayout({ children }: LayoutProps<"/members">) { return children; }
