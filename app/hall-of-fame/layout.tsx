import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "PCC Hall of Fame", description: "Honouring the people whose leadership, service and achievements shaped chess in Polokwane and Limpopo.", path: "/hall-of-fame", preview: "hall" });
export default function HallOfFameLayout({ children }: LayoutProps<"/hall-of-fame">) { return children; }
