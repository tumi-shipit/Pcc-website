"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import OrganiserGuard, { OrganiserAccess } from "@/components/organiser/OrganiserGuard";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
};

type Stats = {
  tournament_id: string;
  total_registrations: number;
  approved_registrations: number;
  paid_registrations: number;
};

function formatDate(value: string | null) {
  if (!value) return "TBA";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function OrganiserHomePage() {
  return (
    <OrganiserGuard>
      {({ email, isAdmin, access }) => (
        <OrganiserDashboard email={email} isAdmin={isAdmin} access={access} />
      )}
    </OrganiserGuard>
  );
}

function OrganiserDashboard({
  email,
  isAdmin,
  access,
}: {
  email: string;
  isAdmin: boolean;
  access: OrganiserAccess[];
}) {
  const router = useRouter();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setMessage("");

      const tournamentIds = access.map((row) => row.tournament_id);
      let tournamentQuery = supabase
        .from("tournaments")
        .select("id, tournament_name, start_date, venue, registration_status")
        .order("start_date", { ascending: true });

      if (!isAdmin) {
        tournamentQuery = tournamentQuery.in("id", tournamentIds);
      }

      const { data: tournamentData, error: tournamentError } =
        await tournamentQuery;

      if (tournamentError) {
        setMessage(`Could not load tournaments: ${tournamentError.message}`);
        setLoading(false);
        return;
      }

      const loadedTournaments = (tournamentData ?? []) as Tournament[];
      const loadedIds = loadedTournaments.map((item) => item.id);

      if (loadedIds.length > 0) {
        const { data: statsData } = await supabase
          .from("tournament_public_stats")
          .select("tournament_id, total_registrations, approved_registrations, paid_registrations")
          .in("tournament_id", loadedIds);

        setStats((statsData ?? []) as Stats[]);
      }

      setTournaments(loadedTournaments);
      setLoading(false);
    }

    load();
  }, [access, isAdmin]);

  const totals = useMemo(() => {
    return {
      tournaments: tournaments.length,
      entries: stats.reduce((sum, item) => sum + (item.total_registrations ?? 0), 0),
      approved: stats.reduce((sum, item) => sum + (item.approved_registrations ?? 0), 0),
      paid: stats.reduce((sum, item) => sum + (item.paid_registrations ?? 0), 0),
    };
  }, [stats, tournaments.length]);

  function statFor(tournamentId: string) {
    return stats.find((item) => item.tournament_id === tournamentId);
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
              Organiser Portal
            </p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Your tournament entries
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
              Signed in as {email}. This portal only shows tournaments assigned
              to this organiser account.
            </p>
            {!isAdmin && access.length > 0 && (
              <p className="mt-2 text-xs leading-6 text-zinc-500">
                Chess SA link:{" "}
                {access
                  .map((row) => row.chess_sa_id)
                  .filter(Boolean)
                  .join(", ") || "Not linked yet"}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/organiser/login");
            }}
            className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
          >
            Sign out
          </button>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Tournaments" value={totals.tournaments} />
          <StatCard label="Entries" value={totals.entries} />
          <StatCard label="Approved" value={totals.approved} />
          <StatCard label="Paid" value={totals.paid} />
        </section>

        {message && (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
            Loading assigned tournaments...
          </p>
        ) : tournaments.length === 0 ? (
          <p className="mt-8 rounded-xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
            No tournaments are currently assigned to this organiser account.
          </p>
        ) : (
          <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tournaments.map((tournament) => {
              const tournamentStats = statFor(tournament.id);
              return (
                <Link
                  key={tournament.id}
                  href={`/organiser/tournaments/${tournament.id}`}
                  className="rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:border-red-500"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300">
                    {tournament.registration_status ?? "Tournament"}
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-white">
                    {tournament.tournament_name}
                  </h2>
                  <p className="mt-3 text-sm text-zinc-400">
                    {formatDate(tournament.start_date)} - {tournament.venue ?? "Venue TBA"}
                  </p>

                  <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Entries" value={tournamentStats?.total_registrations ?? 0} />
                    <MiniStat label="Approved" value={tournamentStats?.approved_registrations ?? 0} />
                    <MiniStat label="Paid" value={tournamentStats?.paid_registrations ?? 0} />
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-zinc-950 px-2 py-3">
      <p className="text-[10px] uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-black text-white">{value}</p>
    </div>
  );
}
