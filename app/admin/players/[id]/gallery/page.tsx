"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import AdminPlayerTabs from "@/components/admin/AdminPlayerTabs";

export default function AdminPlayerGalleryPage() {
  const params = useParams();
  const playerId = String(params.id ?? "");

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href={`/admin/players/${playerId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Player Profile
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Player Gallery
            </p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Gallery Manager
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Manage player photos, tagged tournament photos, captions and profile visuals.
            </p>
          </section>

          <AdminPlayerTabs id={playerId} />

          <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6 md:p-8">
            <h2 className="text-2xl font-black">Coming next</h2>
            <p className="mt-3 text-sm leading-7 text-gray-400">
              This page is now connected to the Player Centre navigation. The next build can add uploads, tagged tournament photos and profile photo selection.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[
                "Upload player photos",
                "Tag tournament gallery images",
                "Set profile photo",
                "Edit captions",
                "Sort display order",
                "Public profile gallery",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-300">
                  {item}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}
