import { publicPageMetadata } from "@/lib/publicMetadata";
export const metadata = publicPageMetadata({ title: "About Polokwane Chess Club", description: "Learn about PCC, the home of chess in the heart of Polokwane, and its registration platform serving chess beyond the city.", path: "/about", preview: "about" });
export default function AboutLayout({ children }: LayoutProps<"/about">) { return children; }
