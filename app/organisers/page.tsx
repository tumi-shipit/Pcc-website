import Link from "next/link";
import Navbar from "@/components/Navbar";

const accessNotes = [
  {
    title: "Tournament-only access",
    text: "Organisers can view entries only for the tournament PCC has assigned to them.",
  },
  {
    title: "Separate from admin",
    text: "This portal does not open the full PCC Command Centre or private admin tools.",
  },
  {
    title: "Linked by Chess SA ID",
    text: "Access is linked to the organiser profile and Chess SA ID recorded by PCC.",
  },
];

export default function PublicOrganisersPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <section className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
              Organiser Access
            </p>
            <h1 className="mt-3 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              Entry access for tournament organisers
            </h1>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
              This page is for organisers who have been given access by PCC to
              manage or check entries for a specific tournament.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/organiser/login"
                className="rounded-xl bg-red-600 px-6 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
              >
                Open organiser login
              </Link>
              <Link
                href="/#tournaments"
                className="rounded-xl border border-white/10 px-6 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
              >
                View tournaments
              </Link>
            </div>
          </div>

          <aside className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-black">Before signing in</h2>
            <div className="mt-5 space-y-4">
              {accessNotes.map((note) => (
                <div key={note.title} className="border-t border-white/10 pt-4">
                  <p className="font-black text-white">{note.title}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-400">
                    {note.text}
                  </p>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}
