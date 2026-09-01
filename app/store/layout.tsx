import { publicPageMetadata } from "@/lib/publicMetadata";
import { StoreBagLink, StoreCartProvider } from "@/components/store/StoreCart";
export const metadata = publicPageMetadata({ title: "PCC Online Store | Equipment, Clubwear and Services", description: "Shop chess equipment, official Polokwane Chess Club apparel and PCC player-profile services with secure Yoco checkout.", path: "/store", preview: "store" });
export default function StoreLayout({ children }: LayoutProps<"/store">) { return <StoreCartProvider>{children}<StoreBagLink/></StoreCartProvider>; }
