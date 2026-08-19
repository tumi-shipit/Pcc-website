import Navbar from "@/components/Navbar";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white pt-24">
      <Navbar />

      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold">About PCC</h1>

        <p className="mt-6 text-gray-400 leading-7">
          Polokwane Chess Club was established in 1958 and has served the
          Polokwane community for more than six decades. The club supports
          competitive chess, youth development and new players across the city,
          district and province.
        </p>
      </section>
    </main>
  );
}
