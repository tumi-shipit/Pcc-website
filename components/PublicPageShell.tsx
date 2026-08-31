import type { ReactNode } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/footer";

export default function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
      <Footer />
    </>
  );
}
