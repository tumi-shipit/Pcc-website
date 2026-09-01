import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "PCC Membership | Join Polokwane Chess Club", description: "Choose a Polokwane Chess Club membership period and pay securely online through Yoco.", path: "/membership", preview: "membership" });
export default function MembershipLayout({ children }: LayoutProps<"/membership">) { return children; }
