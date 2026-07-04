"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: string;
  entry_fee: number;
  poster_image_url: string | null;
};

type TournamentStats = {
  tournament_id: string;
  total_registrations: number;
  approved_registrations: number;
  paid_registrations: number;
};

type SectionStat = {
  section_name: string;
  total: number;
};

type RegistrationSectionRow = {
  section_name: string | null;
};

function formatDate(date: string | null) {
  if (!date) return "TBA";

  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function AdminTournamentDashboardPage() {
  const params = useParams();
  const tournamentId = String(params.id);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const unpaidCount = useMemo(() => {
    const approved = stats?.approved_registrations ?? 0;
    const paid = stats?.paid_registrations ?? 0;
    return Math.max(approved - paid, 0);
  }, [stats]);

  useEffect(() => {
    async function loadTournamentDashboard() {
      setLoading(true);
      setMessage("");

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, description, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url"
        )
        .eq("id", tournamentId)
        .single();

      if (tournamentError || !tournamentData) {
        setMessage("Tournament could not be loaded.");
        setLoading(false);
        return;
      }

      const { data: statsData } = await supabase
        .from("tournament_public_stats")
        .select(
          "tournament_id, total_registrations, approved_registrations, paid_registrations"
        )
        .eq("tournament_id", tournamentId)
        .single();

      const { data: registrationData } = await supabase
        .from("registration_details")
        .select("section_name")
        .eq("tournament_name", tournamentData.tournament_name);

      const groupedSections = (
        (registrationData ?? []) as RegistrationSectionRow[]
      ).reduce<Record<string, number>>((groups, item) => {
        const section = item.section_name ?? "No section";
        groups[section] = (groups[section] ?? 0) + 1;
        return groups;
      }, {});

      setTournament(tournamentData as Tournament);
      setStats((statsData ?? null) as TournamentStats | null);

      setSectionStats(
        Object.entries(groupedSections).map(([section_name, total]) => ({
          section_name,
          total: Number(total),
        }))
      );

      setLoading(false);
    }

    if (tournamentId) {
      loadTournamentDashboard();
    }
  }, [tournamentId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
          Loading tournament dashboard...
        </div>
      </main>
    );
  }

  if (message || !tournament) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          {message || "Tournament not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <Link
          href="/admin"
          className="text-sm font-semibold text-red-300 transition hover:text-red-200"
        >
          ← Back to Admin Dashboard
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            <div className="relative aspect-[3/4]">
              {tournament.poster_image_url ? (
                <Image
                  src={tournament.poster_image_url}
                  alt={`${tournament.tournament_name} poster`}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Poster coming soon
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Tournament Dashboard
            </p>

            <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">
              {tournament.tournament_name}
            </h1>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold text-gray-200">
                {tournament.registration_status}
              </span>

              <span className="rounded-full bg-zinc-800 px-4 py-2 text-sm text-gray-300">
                {formatDate(tournament.start_date)}
              </span>

              <span className="rounded-full bg-zinc-800 px-4 py-2 text-sm text-gray-300">
                {tournament.venue}
              </span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-zinc-950 p-4">
                <p className="text-sm text-gray-400">Total</p>
                <p className="mt-2 text-3xl font-bold">
                  {stats?.total_registrations ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-950 p-4">
                <p className="text-sm text-gray-400">Approved</p>
                <p className="mt-2 text-3xl font-bold text-green-300">
                  {stats?.approved_registrations ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-950 p-4">
                <p className="text-sm text-gray-400">Paid</p>
                <p className="mt-2 text-3xl font-bold text-blue-300">
                  {stats?.paid_registrations ?? 0}
                </p>
              </div>

              <div className="rounded-xl bg-zinc-950 p-4">
                <p className="text-sm text-gray-400">Unpaid</p>
                <p className="mt-2 text-3xl font-bold text-yellow-300">
                  {unpaidCount}
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href={`/admin/registrations?tournament=${encodeURIComponent(
                  tournament.tournament_name
                )}`}
                className="rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
              >
                View Registrations
              </Link>

              <Link
                href="/admin/registrations"
                className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
              >
                Export Swiss
              </Link>

              <span className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-gray-400">
                News Coming Soon
              </span>

              <span className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-center text-sm font-semibold text-gray-400">
                Gallery Coming Soon
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">Section Breakdown</h2>

            {sectionStats.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">
                No registrations have been submitted yet.
              </p>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                {sectionStats.map((section) => (
                  <div
                    key={section.section_name}
                    className="rounded-xl border border-white/10 bg-zinc-950 p-4"
                  >
                    <p className="font-bold">{section.section_name}</p>
                    <p className="mt-2 text-2xl font-bold text-red-300">
                      {section.total}
                    </p>
                    <p className="text-xs text-gray-500">entries</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">Tournament Tools</h2>

            <div className="mt-5 space-y-3">
              {[
                "Upload Pairings",
                "Upload Standings",
                "Upload Results",
                "Publish Gallery",
                "Post Tournament News",
                "Close Registration",
                "Set Tournament Live",
              ].map((tool) => (
                <div
                  key={tool}
                  className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-gray-400"
                >
                  {tool} — coming soon
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}