import { StoreBagLink, StoreCartProvider } from "@/components/store/StoreCart";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return <StoreCartProvider>{children}<StoreBagLink /></StoreCartProvider>;
}
