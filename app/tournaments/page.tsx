import Navbar from "@/components/Navbar";
import Tournaments from "@/components/Tournaments";

export default function TournamentsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-10">
        <Tournaments fullPage />
      </main>
    </>
  );
}
