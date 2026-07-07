"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  fide_id: string | null;
  chess_sa_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  email: string | null;
  phone: string | null;
  verification_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Registration = {
  id: string;
  player_id: string | null;
  tournament_id: string | null;
  section_id: string | null;
  payment_status: string | null;
  proof_of_payment_url: string | null;
  registration_status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string;
  registration_status: string | null;
};

type Section = {
  id: string;
  section_name: string;
};

function calculateAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;

  const birthDate = new Date(dateOfBirth);
  const today = new Date();

  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDifference = today.getMonth() - birthDate.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthDate.getDate())
  ) {
    age -= 1;
  }

  return age;
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusClass(value: string | null) {
  if (value === "Approved" || value === "Paid" || value === "Verified") {
    return "bg-green-500/10 text-green-300";
  }

  if (value === "Pending" || value === "Proof Submitted") {
    return "bg-yellow-500/10 text-yellow-300";
  }

  if (value === "Rejected" || value === "Cancelled") {
    return "bg-red-500/10 text-red-300";
  }

  return "bg-zinc-800 text-zinc-300";
}

export default function AdminPlayerProfilePage() {
  const params = useParams();
  const playerId = String(params.id ?? "");

  const [player, setPlayer] = useState<Player | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPlayerProfile() {
    if (!playerId) return;

    setLoading(true);
    setMessage("");

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, fide_id, chess_sa_id, date_of_birth, gender, club, province, rating, email, phone, verification_status, created_at, updated_at"
      )
      .eq("id", playerId)
      .single();

    if (playerError) {
      setMessage(`Could not load player: ${playerError.message}`);
      setLoading(false);
      return;
    }

    setPlayer(playerData as Player);

    const { data: registrationData, error: registrationError } = await supabase
      .from("registrations")
      .select(
        "id, player_id, tournament_id, section_id, payment_status, proof_of_payment_url, registration_status, created_at, updated_at"
      )
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    if (registrationError) {
      setMessage(`Could not load registration history: ${registrationError.message}`);
      setLoading(false);
      return;
    }

    const registrationRows = (registrationData ?? []) as Registration[];
    setRegistrations(registrationRows);

    const tournamentIds = [
      ...new Set(
        registrationRows
          .map((registration) => registration.tournament_id)
          .filter(Boolean) as string[]
      ),
    ];

    const sectionIds = [
      ...new Set(
        registrationRows
          .map((registration) => registration.section_id)
          .filter(Boolean) as string[]
      ),
    ];

    if (tournamentIds.length > 0) {
      const { data: tournamentData } = await supabase
        .from("tournaments")
        .select("id, tournament_name, start_date, venue, registration_status")
        .in("id", tournamentIds);

      setTournaments((tournamentData ?? []) as Tournament[]);
    }

    if (sectionIds.length > 0) {
      const { data: sectionData } = await supabase
        .from("tournament_sections")
        .select("id, section_name")
        .in("id", sectionIds);

      setSections((sectionData ?? []) as Section[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPlayerProfile();
  }, [playerId]);

  const stats = useMemo(() => {
    return {
      events: registrations.length,
      approved: registrations.filter(
        (registration) => registration.registration_status === "Approved"
      ).length,
      paid: registrations.filter(
        (registration) => registration.payment_status === "Paid"
      ).length,
      pendingPayments: registrations.filter(
        (registration) => registration.payment_status !== "Paid"
      ).length,
    };
  }, [registrations]);

  function getTournament(tournamentId: string | null) {
    return tournaments.find((tournament) => tournament.id === tournamentId);
  }

  function getSection(sectionId: string | null) {
    return sections.find((section) => section.id === sectionId);
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl">
            <p className="text-gray-400">Loading player profile...</p>
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!player) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/admin/players"
              className="text-sm font-semibold text-red-300 transition hover:text-red-200"
            >
              ← Back to Player Centre
            </Link>

            <p className="mt-8 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message || "Player not found."}
            </p>
          </div>
        </main>
      </AdminGuard>
    );
  }

  const age = calculateAge(player.date_of_birth);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/players"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Player Centre
          </Link>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] shadow-2xl">
            <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
              <div className="flex min-h-[320px] items-center justify-center bg-black/40 p-8">
                <div className="flex h-44 w-44 items-center justify-center rounded-full border border-red-500/40 bg-red-600/10 text-6xl font-black text-red-200 shadow-[0_0_45px_rgba(220,38,38,0.25)]">
                  {player.full_name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part[0])
                    .join("")
                    .toUpperCase()}
                </div>
              </div>

              <div className="p-6 md:p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Player Profile
                </p>

                <div className="mt-4 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <h1 className="text-4xl font-black md:text-6xl">
                      {player.full_name}
                    </h1>

                    <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                      {player.club ?? "Club not linked"} •{" "}
                      {player.province ?? "Province not linked"} •{" "}
                      {player.gender ?? "Gender not set"}
                    </p>
                  </div>

                  <span
                    className={`w-fit rounded-full px-4 py-2 text-xs font-black uppercase tracking-wide ${statusClass(
                      player.verification_status
                    )}`}
                  >
                    {player.verification_status ?? "Not verified"}
                  </span>
                </div>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <HeroStat label="Rating" value={player.rating ?? "Unrated"} />
                  <HeroStat label="Events" value={stats.events} />
                  <HeroStat label="Paid" value={stats.paid} />
                  <HeroStat label="Age" value={age ?? "Unknown"} />
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Identity
                </p>

                <h2 className="mt-3 text-2xl font-black">Player details</h2>

                <div className="mt-6 grid gap-3 text-sm text-gray-400">
                  <DetailRow label="Chess SA ID" value={player.chess_sa_id ?? "Not set"} />
                  <DetailRow label="FIDE ID" value={player.fide_id ?? "Not set"} />
                  <DetailRow label="Date of birth" value={formatDate(player.date_of_birth)} />
                  <DetailRow label="Gender" value={player.gender ?? "Not set"} />
                  <DetailRow label="Club" value={player.club ?? "Not linked"} />
                  <DetailRow label="Province" value={player.province ?? "Not linked"} />
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Admin Only
                </p>

                <h2 className="mt-3 text-2xl font-black">Contact details</h2>

                <div className="mt-6 grid gap-3 text-sm text-gray-400">
                  <DetailRow label="Email" value={player.email ?? "Not supplied"} />
                  <DetailRow label="Phone" value={player.phone ?? "Not supplied"} />
                  <DetailRow label="Created" value={formatDate(player.created_at)} />
                  <DetailRow label="Updated" value={formatDate(player.updated_at)} />
                </div>
              </section>
            </div>

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Tournament History
              </p>

              <h2 className="mt-3 text-2xl font-black">Registration activity</h2>

              <div className="mt-6 grid gap-3 sm:grid-cols-4">
                <MiniStat label="Events" value={stats.events} />
                <MiniStat label="Approved" value={stats.approved} valueClass="text-green-300" />
                <MiniStat label="Paid" value={stats.paid} valueClass="text-blue-300" />
                <MiniStat
                  label="Pending"
                  value={stats.pendingPayments}
                  valueClass="text-yellow-300"
                />
              </div>

              <div className="mt-6 space-y-4">
                {registrations.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                    No tournament registrations found for this player yet.
                  </p>
                ) : (
                  registrations.map((registration) => {
                    const tournament = getTournament(registration.tournament_id);
                    const section = getSection(registration.section_id);

                    return (
                      <article
                        key={registration.id}
                        className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                      >
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                              {tournament
                                ? formatDate(tournament.start_date)
                                : "Tournament date not found"}
                            </p>

                            <h3 className="mt-2 text-lg font-black text-white">
                              {tournament?.tournament_name ?? "Tournament not found"}
                            </h3>

                            <p className="mt-1 text-sm text-gray-500">
                              {section?.section_name ?? "Section not found"} •{" "}
                              {tournament?.venue ?? "Venue not found"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                registration.registration_status
                              )}`}
                            >
                              {registration.registration_status ?? "Pending"}
                            </span>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                registration.payment_status
                              )}`}
                            >
                              {registration.payment_status ?? "Pending"}
                            </span>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-3">
                          {tournament && (
                            <Link
                              href={`/admin/tournaments/${tournament.id}`}
                              className="text-sm font-bold text-red-300 transition hover:text-red-200"
                            >
                              Open tournament →
                            </Link>
                          )}

                          {registration.proof_of_payment_url && (
                            <span className="text-sm text-gray-400">
                              Proof uploaded
                            </span>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </section>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function HeroStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-md">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function MiniStat({
  label,
  value,
  valueClass = "text-white",
}: {
  label: string;
  value: number | string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-xl bg-zinc-950 p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-white/10 bg-zinc-950 p-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-right font-semibold text-white">{value}</span>
    </div>
  );
}
