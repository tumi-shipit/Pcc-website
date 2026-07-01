import Navbar from "@/components/Navbar";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-black text-white pt-24">
      <Navbar />

      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold">About PCC</h1>

        <p className="mt-6 text-gray-400 leading-7">
          Polokwane Chess Club was established in 1958, the club has served the Polokwane 
          community for over 6 decades, contributing to intellectual development, youth 
          empowerment, and competitive excellence within the city,district and province. 
          The club remains active and continues to produce competitive players while mentoring new and developing members.This Club is a hub for talent development and community engagement 
        </p>
      </section>
    </main>
  );
}