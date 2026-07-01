import Navbar from "@/components/Navbar";
export default function TournamentsPage() {
  return (
    <main className="min-h-screen bg-black text-white pt-24">
      <Navbar />

      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold">Tournaments</h1>

        <p className="mt-6 text-gray-400">
          Upcoming and past chess tournaments will be displayed here.
        </p>

        <div className="mt-10 space-y-4">
          <div className="border border-white/10 p-4 rounded-lg">
            Polokwane Open Championship 2026
          </div>

          <div className="border border-white/10 p-4 rounded-lg">
            Limpopo Open 2026
          </div>
        </div>
      </section>
    </main>
  );
}