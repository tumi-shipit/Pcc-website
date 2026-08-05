"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { formatCalendarDate } from "@/lib/dateHelpers";
import { publicSupabase as supabase } from "@/lib/publicSupabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  end_date: string | null;
  venue: string | null;
  registration_status: string | null;
};

type LiveUpdate = {
  id: string;
  tournament_id: string;
  section_id: string | null;
  round_number: number;
  board_number: number | null;
  previous_board_number: number | null;
  player_name: string;
  opponent_name: string | null;
  result: string | null;
  points: number | null;
  notes: string | null;
  display_order: number | null;
  is_published: boolean;
  created_at: string;
  tournament_sections?: {
    section_name: string;
  } | null;
};

function boardMovement(update: LiveUpdate) {
  if (!update.previous_board_number || !update.board_number) {
    return { label: "Tracking", tone: "neutral" as const, symbol: "•" };
  }

  const movement = update.previous_board_number - update.board_number;

  if (movement > 0) {
    return {
      label: `Up ${movement}`,
      tone: "up" as const,
      symbol: "↑",
    };
  }

  if (movement < 0) {
    return {
      label: `Down ${Math.abs(movement)}`,
      tone: "down" as const,
      symbol: "↓",
    };
  }

  return { label: "Held", tone: "neutral" as const, symbol: "→" };
}

function movementClass(tone: "up" | "down" | "neutral") {
  if (tone === "up") {
    return "border-green-400/40 bg-green-500/15 text-green-200 shadow-green-950/30";
  }

  if (tone === "down") {
    return "border-red-400/40 bg-red-500/15 text-red-200 shadow-red-950/30";
  }

  return "border-white/10 bg-white/10 text-gray-200";
}

function formatDate(value: string | null) {
  if (!value) return "Date TBA";
  return formatCalendarDate(value, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatUpdateTime(value: string) {
  return new Date(value).toLocaleTimeString("en-ZA", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function TournamentLiveBoardPage() {
  const params = useParams<{ id: string }>();
  const tournamentId = params.id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  async function loadLiveBoard() {
    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, end_date, venue, registration_status")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      setMessage("Live board could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: updateData, error: updateError } = await supabase
      .from("tournament_live_updates")
      .select(
        "id, tournament_id, section_id, round_number, board_number, previous_board_number, player_name, opponent_name, result, points, notes, display_order, is_published, created_at, tournament_sections(section_name)"
      )
      .eq("tournament_id", tournamentId)
      .eq("is_published", true)
      .order("round_number", { ascending: false })
      .order("display_order", { ascending: true })
      .order("board_number", { ascending: true, nullsFirst: false });

    setTournament(tournamentData as Tournament);
    setUpdates(updateError ? [] : ((updateData ?? []) as unknown as LiveUpdate[]));
    setMessage(updateError ? "Live updates are not available yet." : "");
    setLastRefresh(new Date());
    setLoading(false);
  }

  useEffect(() => {
    loadLiveBoard();
    const timer = window.setInterval(loadLiveBoard, 30000);

    return () => window.clearInterval(timer);
  }, [tournamentId]);

  const latestRound = useMemo(
    () =>
      updates.reduce(
        (highest, update) => Math.max(highest, update.round_number),
        0
      ),
    [updates]
  );

  const groupedUpdates = useMemo(() => {
    const groups = new Map<number, LiveUpdate[]>();

    updates.forEach((update) => {
      const current = groups.get(update.round_number) ?? [];
      current.push(update);
      groups.set(update.round_number, current);
    });

    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [updates]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
          Loading live board...
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          {message || "Tournament could not be found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.18),_transparent_36%),radial-gradient(circle_at_bottom_left,_rgba(220,38,38,0.18),_transparent_34%)]">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <Link
            href={`/tournaments/${tournamentId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            Back to tournament
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.32em] text-red-400">
                Tournament Standings
              </p>
              <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
                {tournament.tournament_name}
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-gray-300 md:text-lg md:leading-8">
                Round-by-round standings, board movement and final ranking
                movement from the playing floor.
              </p>
            </div>

            <div className="grid gap-3 rounded-3xl border border-white/10 bg-zinc-900 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Latest standing
                  </p>
                  <p className="mt-2 text-3xl font-black text-white">
                    {latestRound || "-"}
                  </p>
                </div>
                <div className="rounded-2xl bg-zinc-950 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Updates
                  </p>
                  <p className="mt-2 text-3xl font-black text-green-300">
                    {updates.length}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-400">
                {formatDate(tournament.start_date)} - {tournament.venue ?? "Venue TBA"}
              </p>
              <p className="text-xs text-gray-500">
                Auto-refreshes every 30 seconds
                {lastRefresh ? ` - last update ${formatUpdateTime(lastRefresh.toISOString())}` : ""}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        {message && (
          <p className="mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-100">
            {message}
          </p>
        )}

        {groupedUpdates.length === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Waiting for updates
            </p>
            <h2 className="mt-3 text-3xl font-black">Live board is ready</h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-gray-400">
              Standings will appear here once the organiser publishes round
              updates or imports the final ranking.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {groupedUpdates.map(([roundNumber, roundUpdates]) => (
              <section
                key={roundNumber}
                className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/35 px-5 py-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-red-400">
                      Round
                    </p>
                    <h2 className="mt-1 text-3xl font-black">{roundNumber}</h2>
                  </div>

                  <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-gray-300">
                    {roundUpdates.length} movement
                    {roundUpdates.length === 1 ? "" : "s"}
                  </span>
                </div>

                <div className="divide-y divide-white/10">
                  {roundUpdates.map((update) => {
                    const movement = boardMovement(update);

                    return (
                      <div
                        key={update.id}
                        className="grid gap-4 px-5 py-5 md:grid-cols-[120px_1fr_150px] md:items-center"
                      >
                        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
                          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Board
                          </p>
                          <p className="mt-2 text-3xl font-black">
                            {valueOrDash(update.board_number)}
                          </p>
                          {update.previous_board_number && (
                            <p className="mt-1 text-xs text-gray-500">
                              started {update.previous_board_number}
                            </p>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-3">
                            <h3 className="text-xl font-black md:text-2xl">
                              {update.player_name}
                            </h3>
                            <span
                              className={`rounded-full border px-3 py-1 text-sm font-black shadow-lg ${movementClass(
                                movement.tone
                              )}`}
                            >
                              {movement.symbol} {movement.label}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-gray-400">
                            {update.tournament_sections?.section_name ?? "Overall"}
                            {update.opponent_name
                              ? ` - vs ${update.opponent_name}`
                              : ""}
                          </p>

                          {update.notes && (
                            <p className="mt-2 text-sm leading-6 text-gray-300">
                              {update.notes}
                            </p>
                          )}
                        </div>

                        <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 md:text-right">
                          <p className="text-xs uppercase tracking-[0.18em] text-gray-500">
                            Result
                          </p>
                          <p className="mt-2 text-xl font-black">
                            {update.result ?? "Pending"}
                          </p>
                          <p className="mt-1 text-sm text-gray-400">
                            {update.points !== null
                              ? `${update.points} pts`
                              : "Points TBA"}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
