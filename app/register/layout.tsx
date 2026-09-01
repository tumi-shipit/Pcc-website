import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "Register for a Chess Tournament | PCC", description: "Find an available event and submit an individual or team tournament entry through the PCC registration platform.", path: "/register", preview: "register" });
export default function RegisterLayout({ children }: LayoutProps<"/register">) { return children; }
