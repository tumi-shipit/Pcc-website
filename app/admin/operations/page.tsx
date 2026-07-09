"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import OperationsAlertCard from "@/components/admin/OperationsAlertCard";
import OperationsQuickActions from "@/components/admin/OperationsQuickActions";
import { formatDateTime } from "@/lib/supabaseHelpers";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
};

type Registration = {
  id: string;
  tournament_id: string | null;
  player_id: string | null;
  payment_status: string | null;
  registration_status: string | null;
  proof_of_payment_url: string | null;
  created_at: string | null;
  players: {
    id: string;
    full_name: string;
  } | null;
  tournaments: {
    id: string;
    tournament_name: string;
  } | null;
};

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  date_of_birth: string | null;
  province: string | null;
  club: string | null;
  verification_status: string | null;
  profile_photo_url: string | null;
};

type NewsPost = {
  id: string;
  title: string;
  category: string | null;
  published: boolean;
  created_at: string;
};

type ImportSession = {
  id: string;
  import_type: string;
  file_name: string | null;
  status: string;
  total_rows: number;
  matched_rows: number;
  failed_rows: number;
  created_at: string;
};

function statusPill(status: string | null) {
  if (status === "Open") return "bg-green-500/10 text-green-300";
  if (status === "Live") return "bg-red-500/10 text-red-300";
  if (status === "Completed") return "bg-blue-500/10 text-blue-300";
  if (status === "Closed") return "bg-yellow-500/10 text-yellow-300";
  return "bg-zinc-800 text-zinc-300";
}

function missingFields(player: Player) {
  const missing: string[] = [];

  if (!player.chess_sa_id) missing.push("Chess SA ID");
  if (!player.fide_id) missing.push("FIDE ID");
  if (!player.date_of_birth) missing.push("DOB");
  if (!player.province) missing.push("Province");
  if (!player.club) missing.push("Club");
  if (!player.profile_photo_url) missing.push("Photo");

  return missing;
}

export default function AdminOperationsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [imports, setImports] = useState<ImportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadOperations() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status")
      .neq("registration_status", "Draft")
      .order("start_date", { ascending: true })
      .limit(100);

    const { data: registrationData, error: registrationError } = await supabase
      .from("registrations")
      .select(
        "id, tournament_id, player_id, payment_status, registration_status, proof_of_payment_url, created_at, players(id, full_name), tournaments(id, tournament_name)"
      )
      .order("created_at", { ascending: false })
      .limit(80);

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, date_of_birth, province, club, verification_status, profile_photo_url"
      )
      .order("created_at", { ascending: false })
      .limit(300);

    const { data: newsData, error: newsError } = await supabase
      .from("news_posts")
      .select("id, title, category, published, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const { data: importData, error: importError } = await supabase
      .from("import_sessions")
      .select("id, import_type, file_name, status, total_rows, matched_rows, failed_rows, created_at")
      .order("created_at", { ascending: false })
      .limit(20);

    const firstError =
      tournamentError || registrationError || playerError || newsError || importError;

    if (firstError) {
      setMessage(firstError.message);
    }

    setTournaments((tournamentData ?? []) as unknown as Tournament[]);
    setRegistrations((registrationData ?? []) as unknown as Registration[]);
    setPlayers((playerData ?? []) as unknown as Player[]);
    setNews((newsData ?? []) as unknown as NewsPost[]);
    setImports((importData ?? []) as unknown as ImportSession[]);
    setLoading(false);
  }

  useEffect(() => {
    loadOperations();
  }, []);

  const ops = useMemo(() => {
    const activeTournaments = tournaments.filter((tournament) =>
      ["Open", "Live", "Closed"].includes(tournament.registration_status ?? "")
    );

    const liveTournaments = tournaments.filter(
      (tournament) => tournament.registration_status === "Live"
    );

    const pendingPayments = registrations.filter((registration) => {
      const status = String(registration.payment_status ?? "").toLowerCase();
      return status !== "paid" && status !== "approved";
    });

    const proofUploaded = registrations.filter((registration) => {
      const status = String(registration.payment_status ?? "").toLowerCase();
      return Boolean(registration.proof_of_payment_url) && status !== "paid";
    });

    const pendingVerification = players.filter(
      (player) => player.verification_status !== "Verified"
    );

    const incompleteProfiles = players.filter(
      (player) => missingFields(player).length > 0
    );

    const draftNews = news.filter((post) => !post.published);

    const failedImports = imports.filter((session) => session.failed_rows > 0);

    return {
      activeTournaments,
      liveTournaments,
      pendingPayments,
      proofUploaded,
      pendingVerification,
      incompleteProfiles,
      draftNews,
      failedImports,
    };
  }, [tournaments, registrations, players, news, imports]);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Admin Home
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Operations Centre
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-6xl">
                  PCC Mission Control
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                  Your daily control room for payments, registrations, player
                  verification, duplicates, imports, live tournaments and media.
                </p>
              </div>

              <button
                type="button"
                onClick={loadOperations}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Refresh
              </button>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <OperationsAlertCard
              title="Pending Payments"
              value={ops.pendingPayments.length}
              description="Registrations where payment still needs attention."
              href="/admin/registrations"
              tone={ops.pendingPayments.length > 0 ? "yellow" : "green"}
            />

            <OperationsAlertCard
              title="Proofs Uploaded"
              value={ops.proofUploaded.length}
              description="Payment proofs uploaded but not marked as paid."
              href="/admin/registrations"
              tone={ops.proofUploaded.length > 0 ? "red" : "green"}
            />

            <OperationsAlertCard
              title="Player Verification"
              value={ops.pendingVerification.length}
              description="Players still waiting for verification."
              href="/admin/players/verify"
              tone={ops.pendingVerification.length > 0 ? "yellow" : "green"}
            />

            <OperationsAlertCard
              title="Incomplete Profiles"
              value={ops.incompleteProfiles.length}
              description="Profiles missing IDs, DOB, province, club or photo."
              href="/admin/players/verify"
              tone={ops.incompleteProfiles.length > 0 ? "yellow" : "green"}
            />

            <OperationsAlertCard
              title="Live Tournaments"
              value={ops.liveTournaments.length}
              description="Events currently marked as live."
              href="/admin/tournaments"
              tone={ops.liveTournaments.length > 0 ? "red" : "default"}
            />

            <OperationsAlertCard
              title="Active Events"
              value={ops.activeTournaments.length}
              description="Open, closed or live events needing monitoring."
              href="/admin/tournaments"
              tone="blue"
            />

            <OperationsAlertCard
              title="Draft News"
              value={ops.draftNews.length}
              description="Media posts prepared but not yet published."
              href="/admin/news"
              tone={ops.draftNews.length > 0 ? "yellow" : "green"}
            />

            <OperationsAlertCard
              title="Import Issues"
              value={ops.failedImports.length}
              description="Recent imports with failed rows."
              href="/admin/imports"
              tone={ops.failedImports.length > 0 ? "red" : "green"}
            />
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
            <div className="space-y-8">
              <Panel title="Active / Live Tournaments" href="/admin/tournaments">
                {ops.activeTournaments.length === 0 ? (
                  <EmptyState text="No active tournaments." />
                ) : (
                  <div className="space-y-3">
                    {ops.activeTournaments.slice(0, 8).map((tournament) => (
                      <Link
                        key={tournament.id}
                        href={`/admin/tournaments/${tournament.id}`}
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-black text-white">
                              {tournament.tournament_name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {tournament.start_date} • {tournament.venue ?? "Venue TBA"}
                            </p>
                          </div>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusPill(
                              tournament.registration_status
                            )}`}
                          >
                            {tournament.registration_status ?? "TBA"}
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Recent Registrations" href="/admin/registrations">
                {registrations.length === 0 ? (
                  <EmptyState text="No recent registrations." />
                ) : (
                  <div className="space-y-3">
                    {registrations.slice(0, 8).map((registration) => (
                      <Link
                        key={registration.id}
                        href="/admin/registrations"
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-black text-white">
                              {registration.players?.full_name ?? "Unknown player"}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {registration.tournaments?.tournament_name ?? "Unknown tournament"}
                            </p>
                          </div>

                          <div className="text-right text-xs text-gray-400">
                            <p>{registration.payment_status ?? "Payment TBA"}</p>
                            <p>{registration.registration_status ?? "Status TBA"}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Recent Imports" href="/admin/imports">
                {imports.length === 0 ? (
                  <EmptyState text="No import history yet." />
                ) : (
                  <div className="space-y-3">
                    {imports.slice(0, 8).map((session) => (
                      <Link
                        key={session.id}
                        href="/admin/imports"
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                          <div>
                            <p className="font-black text-white">
                              {session.import_type}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {session.file_name ?? "No filename"} •{" "}
                              {formatDateTime(session.created_at)}
                            </p>
                          </div>

                          <div className="text-right text-xs text-gray-400">
                            <p>{session.total_rows} rows</p>
                            <p className={session.failed_rows > 0 ? "text-red-300" : "text-green-300"}>
                              {session.failed_rows} failed
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>
            </div>

            <aside className="space-y-8">
              <OperationsQuickActions />

              <Panel title="System Health">
                <div className="space-y-3">
                  <HealthRow label="Website" value="Online" />
                  <HealthRow label="Database" value={message ? "Check errors" : "Connected"} tone={message ? "red" : "green"} />
                  <HealthRow label="Imports" value={ops.failedImports.length > 0 ? "Needs review" : "Healthy"} tone={ops.failedImports.length > 0 ? "yellow" : "green"} />
                  <HealthRow label="Registrations" value="Active" />
                </div>
              </Panel>

              <Panel title="Draft Media" href="/admin/news">
                {ops.draftNews.length === 0 ? (
                  <EmptyState text="No draft news." />
                ) : (
                  <div className="space-y-3">
                    {ops.draftNews.slice(0, 5).map((post) => (
                      <Link
                        key={post.id}
                        href="/admin/news"
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <p className="font-bold text-white">{post.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {post.category ?? "News"} • {formatDateTime(post.created_at)}
                        </p>
                      </Link>
                    ))}
                  </div>
                )}
              </Panel>
            </aside>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function Panel({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex items-end justify-between gap-4">
        <h2 className="text-2xl font-black">{title}</h2>
        {href && (
          <Link
            href={href}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            View all →
          </Link>
        )}
      </div>

      <div className="mt-6">{children}</div>
    </section>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
      {text}
    </p>
  );
}

function HealthRow({
  label,
  value,
  tone = "green",
}: {
  label: string;
  value: string;
  tone?: "green" | "yellow" | "red";
}) {
  const dot =
    tone === "red"
      ? "text-red-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : "text-green-300";

  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950 p-4">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-bold ${dot}`}>● {value}</span>
    </div>
  );
}
