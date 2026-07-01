import Navbar from "@/components/Navbar";

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-black text-white pt-24">
      <Navbar />

      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold">Contact Us</h1>

        <p className="mt-6 text-gray-400">
          Get in touch with Polokwane Chess Club.
        </p>

        <div className="mt-10 space-y-4 text-gray-300">
          <p>Email: info@pcc.co.za</p>
          <p>Location: Polokwane, Limpopo</p>
        </div>
      </section>
    </main>
  );
}