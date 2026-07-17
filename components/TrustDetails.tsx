import Link from "next/link";

const trustItems = [
  {
    title: "Player Data",
    text: "Public profiles are built from PCC records, tournament archives and verified Chess SA details where available.",
  },
  {
    title: "Rankings Source",
    text: "Public rankings are shown from Limpopo Chess Academy. PCC does not independently calculate those rankings.",
  },
  {
    title: "Club Contact",
    text: "Tournament questions, corrections and player profile updates can be sent through the public contact page.",
  },
];

export default function TrustDetails() {
  return (
    <section className="border-y border-white/10 bg-zinc-900 py-10 text-white">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 md:px-6 lg:grid-cols-[1fr_260px] lg:items-center">
        <div className="grid gap-4 md:grid-cols-3">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-white/10 bg-zinc-950 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-300">
                {item.title}
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">{item.text}</p>
            </div>
          ))}
        </div>

        <Link
          href="/contact"
          className="rounded-lg bg-red-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
        >
          Contact PCC
        </Link>
      </div>
    </section>
  );
}
