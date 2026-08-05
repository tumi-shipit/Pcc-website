"use client";

import { use, ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminTournamentTabs from "@/components/admin/AdminTournamentTabs";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
};

type TournamentStats = {
  tournament_id: string;
  total_registrations: number;
  approved_registrations: number;
  paid_registrations: number;
};

type ResultRow = {
  id: string;
  section_id: string | null;
  final_position: number | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  players: {
    id: string;
    full_name: string;
    rating: number | null;
    club: string | null;
  } | null;
  tournament_sections: {
    id: string;
    section_name: string;
  } | null;
};

type Official = {
  id: string;
  role: string;
  players: {
    id: string;
    full_name: string;
    profile_photo_url: string | null;
  } | null;
};

type NewsPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
};

type TournamentSection = {
  id: string;
  section_name: string;
  display_order: number | null;
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

type ParsedStanding = {
  sectionName: string | null;
  roundNumber: number | null;
  currentRank: number;
  startNumber: number;
  playerName: string;
  rating: number | null;
  federation: string | null;
  club: string | null;
  points: number | null;
};

type SheetCell = string | number | boolean | null | undefined;
type SheetRow = SheetCell[];

type AnnouncementForm = {
  title: string;
  excerpt: string;
  content: string;
  published: boolean;
};

const emptyAnnouncement: AnnouncementForm = {
  title: "",
  excerpt: "",
  content: "",
  published: true,
};

type LiveUpdateForm = {
  section_id: string;
  round_number: string;
  previous_board_number: string;
  board_number: string;
  player_name: string;
  opponent_name: string;
  result: string;
  points: string;
  notes: string;
  is_published: boolean;
};

const emptyLiveUpdate: LiveUpdateForm = {
  section_id: "",
  round_number: "1",
  previous_board_number: "",
  board_number: "",
  player_name: "",
  opponent_name: "",
  result: "Won",
  points: "",
  notes: "",
  is_published: true,
};

const liveStatuses = ["Open", "Closed", "Postponed", "Live", "Completed"];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function formatDate(value: string | null) {
  if (!value) return "TBA";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "TBA";
  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function medal(position: number | null) {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return "";
}

function boardMovement(update: LiveUpdate) {
  if (!update.previous_board_number || !update.board_number) {
    return { label: "No movement yet", tone: "neutral" as const, symbol: "•" };
  }

  const movement = update.previous_board_number - update.board_number;

  if (movement > 0) {
    return {
      label: `Up ${movement} board${movement === 1 ? "" : "s"}`,
      tone: "up" as const,
      symbol: "↑",
    };
  }

  if (movement < 0) {
    return {
      label: `Down ${Math.abs(movement)} board${Math.abs(movement) === 1 ? "" : "s"}`,
      tone: "down" as const,
      symbol: "↓",
    };
  }

  return { label: "Held board", tone: "neutral" as const, symbol: "→" };
}

function movementClass(tone: "up" | "down" | "neutral") {
  if (tone === "up") return "border-green-500/30 bg-green-500/10 text-green-200";
  if (tone === "down") return "border-red-500/30 bg-red-500/10 text-red-200";
  return "border-white/10 bg-white/10 text-gray-300";
}

function normalizeHeader(value: SheetCell) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function cleanText(value: SheetCell) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text || null;
}

function parseNumber(value: SheetCell) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = String(value ?? "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "")
    .trim();
  if (!text) return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function parsePoints(value: SheetCell) {
  if (typeof value === "number" && Number.isFinite(value)) return value;

  const text = String(value ?? "").trim();
  if (!text) return null;

  const whole = parseNumber(text.replace("½", ""));
  const half = text.includes("½") ? 0.5 : 0;

  if (whole === null) return half || null;
  return whole + half;
}

function parseRoundFromRows(rows: SheetRow[]) {
  for (const row of rows.slice(0, 10)) {
    const text = row.map((cell) => String(cell ?? "")).join(" ");
    const match = text.match(/round\s+(\d+)/i);
    if (match) return Number(match[1]);
  }

  return null;
}

function parseStandingsRows(rows: SheetRow[]) {
  const headerIndex = rows.findIndex((row) => {
    const headers = row.map(normalizeHeader);
    return (
      headers.includes("rank") &&
      headers.includes("sno") &&
      headers.includes("name")
    );
  });

  if (headerIndex < 0) {
    throw new Error("Could not find Rank, SNo. and Name columns in this file.");
  }

  const headers = rows[headerIndex].map(normalizeHeader);
  const rankIndex = headers.indexOf("rank");
  const startIndex = headers.indexOf("sno");
  const nameIndex = headers.indexOf("name");
  const ratingIndex = headers.indexOf("rtg");
  const federationIndex = headers.indexOf("fed");
  const clubIndex = headers.indexOf("club");
  const pointsIndex = headers.indexOf("pts");
  const roundNumber = parseRoundFromRows(rows);
  const sectionName = cleanText(rows[1]?.[0]);
  const standings: ParsedStanding[] = [];

  rows.slice(headerIndex + 1).forEach((row) => {
    const playerName = cleanText(row[nameIndex]);
    const startNumber = parseNumber(row[startIndex]);

    if (!playerName || startNumber === null) return;

    const rank = parseNumber(row[rankIndex]);
    const currentRank = rank ?? standings.length + 1;

    standings.push({
      sectionName,
      roundNumber,
      currentRank,
      startNumber,
      playerName,
      rating: ratingIndex >= 0 ? parseNumber(row[ratingIndex]) : null,
      federation: federationIndex >= 0 ? cleanText(row[federationIndex]) : null,
      club: clubIndex >= 0 ? cleanText(row[clubIndex]) : null,
      points: pointsIndex >= 0 ? parsePoints(row[pointsIndex]) : null,
    });
  });

  return standings;
}

export default function TournamentLiveControlPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tournamentId = id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [news, setNews] = useState<NewsPost[]>([]);
  const [sections, setSections] = useState<TournamentSection[]>([]);
  const [liveUpdates, setLiveUpdates] = useState<LiveUpdate[]>([]);
  const [liveUpdate, setLiveUpdate] = useState<LiveUpdateForm>(emptyLiveUpdate);
  const [announcement, setAnnouncement] =
    useState<AnnouncementForm>(emptyAnnouncement);
  const [currentRound, setCurrentRound] = useState("1");
  const [roundStatus, setRoundStatus] = useState("Not started");
  const [clockMinutes, setClockMinutes] = useState("25");
  const [incrementSeconds, setIncrementSeconds] = useState("2");
  const [loading, setLoading] = useState(true);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [savingLiveUpdate, setSavingLiveUpdate] = useState(false);
  const [importingStandings, setImportingStandings] = useState(false);
  const [replaceRoundUpdates, setReplaceRoundUpdates] = useState(true);
  const [message, setMessage] = useState("");

  async function loadLiveCentre() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status")
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

    const { data: resultData } = await supabase
      .from("tournament_results")
      .select(
        "id, section_id, final_position, points, tie_break, award_title, players(id, full_name, rating, club), tournament_sections(id, section_name)"
      )
      .eq("tournament_id", tournamentId)
      .order("section_id", { ascending: true, nullsFirst: true })
      .order("final_position", { ascending: true, nullsFirst: false })
      .limit(30);

    const { data: officialData } = await supabase
      .from("tournament_officials")
      .select("id, role, players(id, full_name, profile_photo_url)")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: true });

    const { data: sectionData } = await supabase
      .from("tournament_sections")
      .select("id, section_name, display_order")
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("section_name", { ascending: true });

    const { data: liveUpdateData } = await supabase
      .from("tournament_live_updates")
      .select(
        "id, tournament_id, section_id, round_number, board_number, previous_board_number, player_name, opponent_name, result, points, notes, display_order, is_published, created_at, tournament_sections(section_name)"
      )
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: false })
      .order("display_order", { ascending: true })
      .order("board_number", { ascending: true, nullsFirst: false });

    const { data: newsData } = await supabase
      .from("news_posts")
      .select("id, title, excerpt, category, published, published_at, created_at")
      .or(`content.ilike.%${tournamentId}%,excerpt.ilike.%${tournamentId}%,title.ilike.%${tournamentData.tournament_name}%`)
      .order("created_at", { ascending: false })
      .limit(8);

    setTournament(tournamentData as Tournament);
    setStats((statsData ?? null) as TournamentStats | null);
    setResults((resultData ?? []) as unknown as ResultRow[]);
    setOfficials((officialData ?? []) as unknown as Official[]);
    setSections((sectionData ?? []) as unknown as TournamentSection[]);
    setLiveUpdates((liveUpdateData ?? []) as unknown as LiveUpdate[]);
    setNews((newsData ?? []) as unknown as NewsPost[]);
    setLoading(false);
  }

  useEffect(() => {
    loadLiveCentre();
  }, [tournamentId]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, ResultRow[]> = {};

    results.forEach((result) => {
      const sectionName = result.tournament_sections?.section_name ?? "Overall";
      groups[sectionName] = groups[sectionName] ?? [];
      groups[sectionName].push(result);
    });

    return Object.entries(groups);
  }, [results]);

  const unpaidCount = useMemo(() => {
    const approved = stats?.approved_registrations ?? 0;
    const paid = stats?.paid_registrations ?? 0;
    return Math.max(approved - paid, 0);
  }, [stats]);

  const latestRound = useMemo(
    () =>
      liveUpdates.reduce(
        (highest, update) => Math.max(highest, update.round_number),
        0
      ),
    [liveUpdates]
  );

  const liveUpdatesByRound = useMemo(() => {
    const groups = new Map<number, LiveUpdate[]>();

    liveUpdates.forEach((update) => {
      const current = groups.get(update.round_number) ?? [];
      current.push(update);
      groups.set(update.round_number, current);
    });

    return Array.from(groups.entries()).sort((a, b) => b[0] - a[0]);
  }, [liveUpdates]);

  async function updateTournamentStatus(status: string) {
    setMessage("");

    const { error } = await supabase
      .from("tournaments")
      .update({
        registration_status: status,
      })
      .eq("id", tournamentId);

    if (error) {
      setMessage(`Could not update status: ${error.message}`);
      return;
    }

    setMessage(`Tournament status set to ${status}.`);
    await loadLiveCentre();
  }

  async function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!announcement.title.trim() || !announcement.excerpt.trim()) {
      setMessage("Announcement title and excerpt are required.");
      return;
    }

    setSavingAnnouncement(true);
    setMessage("");

    const now = new Date().toISOString();

    const content = `${announcement.content.trim() || announcement.excerpt.trim()}

Tournament: ${tournament?.tournament_name ?? ""}
Public page: /tournaments/${tournamentId}
Tournament ID: ${tournamentId}`;

    const { error } = await supabase.from("news_posts").insert({
      title: announcement.title.trim(),
      excerpt: announcement.excerpt.trim(),
      content,
      image_url: null,
      category: "Live Update",
      published: announcement.published,
      published_at: announcement.published ? now : null,
      updated_at: now,
    });

    if (error) {
      setMessage(`Could not publish announcement: ${error.message}`);
      setSavingAnnouncement(false);
      return;
    }

    setAnnouncement(emptyAnnouncement);
    setMessage("Live announcement published.");
    setSavingAnnouncement(false);
    await loadLiveCentre();
  }

  async function saveLiveUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!liveUpdate.player_name.trim()) {
      setMessage("Player name is required for a live update.");
      return;
    }

    setSavingLiveUpdate(true);
    setMessage("");

    const nextDisplayOrder = liveUpdates.length + 1;
    const payload = {
      tournament_id: tournamentId,
      section_id: liveUpdate.section_id || null,
      round_number: Number(liveUpdate.round_number) || 1,
      previous_board_number: liveUpdate.previous_board_number
        ? Number(liveUpdate.previous_board_number)
        : null,
      board_number: liveUpdate.board_number
        ? Number(liveUpdate.board_number)
        : null,
      player_name: liveUpdate.player_name.trim(),
      opponent_name: liveUpdate.opponent_name.trim() || null,
      result: liveUpdate.result.trim() || null,
      points: liveUpdate.points ? Number(liveUpdate.points) : null,
      notes: liveUpdate.notes.trim() || null,
      display_order: nextDisplayOrder,
      is_published: liveUpdate.is_published,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("tournament_live_updates")
      .insert(payload);

    if (error) {
      setMessage(`Could not save live update: ${error.message}`);
      setSavingLiveUpdate(false);
      return;
    }

    setLiveUpdate((current) => ({
      ...emptyLiveUpdate,
      section_id: current.section_id,
      round_number: current.round_number,
    }));
    setMessage("Live round update saved.");
    setSavingLiveUpdate(false);
    await loadLiveCentre();
  }

  async function deleteLiveUpdate(updateId: string) {
    const { error } = await supabase
      .from("tournament_live_updates")
      .delete()
      .eq("id", updateId);

    if (error) {
      setMessage(`Could not delete live update: ${error.message}`);
      return;
    }

    setMessage("Live update deleted.");
    await loadLiveCentre();
  }

  async function importStandingsFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingStandings(true);
    setMessage("Reading standings file...");

    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];

      if (!worksheet) {
        throw new Error("The workbook does not contain a readable sheet.");
      }

      const rows = XLSX.utils.sheet_to_json<SheetRow>(worksheet, {
        header: 1,
        raw: true,
        defval: null,
      });
      const standings = parseStandingsRows(rows);

      if (standings.length === 0) {
        throw new Error("No player standings were found in this file.");
      }

      const importedRound =
        standings[0].roundNumber ?? Number(liveUpdate.round_number) ?? latestRound + 1;
      const selectedSectionId = liveUpdate.section_id || null;

      if (replaceRoundUpdates) {
        let deleteQuery = supabase
          .from("tournament_live_updates")
          .delete()
          .eq("tournament_id", tournamentId)
          .eq("round_number", importedRound);

        deleteQuery = selectedSectionId
          ? deleteQuery.eq("section_id", selectedSectionId)
          : deleteQuery.is("section_id", null);

        const { error: deleteError } = await deleteQuery;

        if (deleteError) {
          throw new Error(`Could not replace existing round updates: ${deleteError.message}`);
        }
      }

      const rowsToInsert = standings.map((standing, index) => {
        const details = [
          standing.sectionName ? `File section: ${standing.sectionName}` : null,
          standing.rating !== null ? `Rating ${standing.rating}` : null,
          standing.federation,
          standing.club,
        ].filter(Boolean);

        return {
          tournament_id: tournamentId,
          section_id: selectedSectionId,
          round_number: importedRound,
          previous_board_number: standing.startNumber,
          board_number: standing.currentRank,
          player_name: standing.playerName,
          opponent_name: null,
          result: `After round ${importedRound}`,
          points: standing.points,
          notes: details.length > 0 ? details.join(" - ") : null,
          display_order: index + 1,
          is_published: true,
          updated_at: new Date().toISOString(),
        };
      });

      const { error: insertError } = await supabase
        .from("tournament_live_updates")
        .insert(rowsToInsert);

      if (insertError) {
        throw new Error(`Could not save imported standings: ${insertError.message}`);
      }

      setLiveUpdate((current) => ({
        ...current,
        round_number: String(importedRound + 1),
      }));
      setMessage(
        `Imported ${rowsToInsert.length} live standing update(s) for round ${importedRound}.`
      );
      await loadLiveCentre();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Standings import failed: ${error.message}`
          : "Standings import failed."
      );
    } finally {
      setImportingStandings(false);
      event.target.value = "";
    }
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading live control room...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!tournament) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
            {message || "Tournament could not be found."}
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href={`/admin/tournaments/${tournamentId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Tournament Dashboard
          </Link>

          <AdminTournamentTabs id={tournamentId} />

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Live Tournament Control Room
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-6xl">
                  {tournament.tournament_name}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                  Control tournament status, publish live updates, monitor
                  registrations, track officials and access live results tools.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                    {formatDate(tournament.start_date)}
                  </span>
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                    {tournament.venue ?? "Venue TBA"}
                  </span>
                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                    {tournament.registration_status ?? "Status TBA"}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/tournaments/${tournamentId}`}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Public Page
                </Link>

                <Link
                  href={`/admin/tournaments/${tournamentId}/archive`}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Results Centre
                </Link>
              </div>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Total Registered" value={stats?.total_registrations ?? 0} />
            <StatCard label="Approved" value={stats?.approved_registrations ?? 0} tone="green" />
            <StatCard label="Paid" value={stats?.paid_registrations ?? 0} />
            <StatCard label="Unpaid" value={unpaidCount} tone="yellow" />
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
            <section className="space-y-8">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Tournament Status
                </p>
                <h2 className="mt-3 text-2xl font-black">Control state</h2>

                <div className="mt-6 grid gap-3 sm:grid-cols-5">
                  {liveStatuses.map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => updateTournamentStatus(status)}
                      className={`rounded-2xl border p-5 text-left transition ${
                        tournament.registration_status === status
                          ? "border-red-500 bg-red-500/10"
                          : "border-white/10 bg-zinc-950 hover:border-red-500"
                      }`}
                    >
                      <p className="text-xl font-black">{status}</p>
                      <p className="mt-2 text-xs text-gray-500">
                        Set tournament {status}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Round Control
                </p>
                <h2 className="mt-3 text-2xl font-black">Current round</h2>

                <div className="mt-6 grid gap-4 md:grid-cols-4">
                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Round
                    </span>
                    <input
                      value={currentRound}
                      onChange={(event) => setCurrentRound(event.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Status
                    </span>
                    <select
                      value={roundStatus}
                      onChange={(event) => setRoundStatus(event.target.value)}
                      className={inputClass}
                    >
                      <option>Not started</option>
                      <option>Pairings published</option>
                      <option>Round in progress</option>
                      <option>Results being entered</option>
                      <option>Round completed</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Minutes
                    </span>
                    <input
                      value={clockMinutes}
                      onChange={(event) => setClockMinutes(event.target.value)}
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Increment
                    </span>
                    <input
                      value={incrementSeconds}
                      onChange={(event) => setIncrementSeconds(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5">
                  <p className="text-sm text-gray-400">Display summary</p>
                  <p className="mt-2 text-2xl font-black">
                    Round {currentRound}  -  {clockMinutes}+{incrementSeconds}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">{roundStatus}</p>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                      Live Movement Board
                    </p>
                    <h2 className="mt-3 text-2xl font-black">
                      Round updates
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-gray-400">
                      Add round-by-round movement for leagues and long events.
                      Green means the player moved to a stronger board; red
                      means they moved down.
                    </p>
                  </div>

                  <Link
                    href={`/tournaments/${tournamentId}/live`}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Public Standings Screen
                  </Link>
                </div>

                <div className="mt-6 rounded-2xl border border-green-500/25 bg-green-500/10 p-4">
                  <div className="grid gap-4 lg:grid-cols-[1fr_260px] lg:items-end">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.2em] text-green-300">
                        Import after-round standings
                      </p>
                      <h3 className="mt-2 text-xl font-black text-white">
                        Upload Swiss Manager standings
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-green-50/80">
                        Upload the standings file after each round. The importer
                        reads `Rank`, `SNo.`, `Name` and `Pts`, then creates
                        green/red movement updates automatically.
                      </p>
                      <label className="mt-4 flex cursor-pointer items-center gap-3 text-sm text-green-50/90">
                        <input
                          type="checkbox"
                          checked={replaceRoundUpdates}
                          onChange={(event) =>
                            setReplaceRoundUpdates(event.target.checked)
                          }
                          className="h-5 w-5 accent-green-500"
                        />
                        Replace existing updates for this round and selected section
                      </label>
                    </div>

                    <label className="block rounded-xl border border-white/10 bg-zinc-950 p-4 text-center transition hover:border-green-400">
                      <span className="block text-sm font-bold text-white">
                        {importingStandings ? "Importing..." : "Choose file"}
                      </span>
                      <span className="mt-1 block text-xs text-gray-500">
                        .xls or .xlsx
                      </span>
                      <input
                        type="file"
                        accept=".xls,.xlsx"
                        onChange={importStandingsFile}
                        disabled={importingStandings}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                <form
                  onSubmit={saveLiveUpdate}
                  className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4 md:grid-cols-4"
                >
                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Section
                    </span>
                    <select
                      value={liveUpdate.section_id}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          section_id: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option value="">Overall</option>
                      {sections.map((section) => (
                        <option key={section.id} value={section.id}>
                          {section.section_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Round
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={liveUpdate.round_number}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          round_number: event.target.value,
                        }))
                      }
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Previous board
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={liveUpdate.previous_board_number}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          previous_board_number: event.target.value,
                        }))
                      }
                      placeholder="e.g. 10"
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Current board
                    </span>
                    <input
                      type="number"
                      min="1"
                      value={liveUpdate.board_number}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          board_number: event.target.value,
                        }))
                      }
                      placeholder="e.g. 5"
                      className={inputClass}
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold">
                      Player
                    </span>
                    <input
                      value={liveUpdate.player_name}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          player_name: event.target.value,
                        }))
                      }
                      placeholder="Player name"
                      className={inputClass}
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold">
                      Opponent
                    </span>
                    <input
                      value={liveUpdate.opponent_name}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          opponent_name: event.target.value,
                        }))
                      }
                      placeholder="Opponent name"
                      className={inputClass}
                    />
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Result
                    </span>
                    <select
                      value={liveUpdate.result}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          result: event.target.value,
                        }))
                      }
                      className={inputClass}
                    >
                      <option>Won</option>
                      <option>Lost</option>
                      <option>Drew</option>
                      <option>Bye</option>
                      <option>Pending</option>
                    </select>
                  </label>

                  <label>
                    <span className="mb-2 block text-sm font-semibold">
                      Points
                    </span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={liveUpdate.points}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          points: event.target.value,
                        }))
                      }
                      placeholder="e.g. 3.5"
                      className={inputClass}
                    />
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold">
                      Notes
                    </span>
                    <input
                      value={liveUpdate.notes}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Upset, comeback, board prize race..."
                      className={inputClass}
                    />
                  </label>

                  <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={liveUpdate.is_published}
                      onChange={(event) =>
                        setLiveUpdate((current) => ({
                          ...current,
                          is_published: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 accent-red-600"
                    />
                    <span className="text-sm font-semibold">
                      Show on public live board
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={savingLiveUpdate}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60 md:col-span-2"
                  >
                    {savingLiveUpdate ? "Saving..." : "Add Live Update"}
                  </button>
                </form>

                <div className="mt-6 space-y-5">
                  {liveUpdatesByRound.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                      No live round movement has been added yet.
                    </p>
                  ) : (
                    liveUpdatesByRound.map(([roundNumber, roundUpdates]) => (
                      <div
                        key={roundNumber}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3">
                          <h3 className="text-lg font-black">
                            Round {roundNumber}
                          </h3>
                          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gray-300">
                            {roundUpdates.length} update
                            {roundUpdates.length === 1 ? "" : "s"}
                          </span>
                        </div>

                        <div className="divide-y divide-white/10">
                          {roundUpdates.map((update) => {
                            const movement = boardMovement(update);

                            return (
                              <div
                                key={update.id}
                                className="grid gap-3 px-4 py-4 md:grid-cols-[110px_1fr_auto] md:items-center"
                              >
                                <div>
                                  <p className="text-xs text-gray-500">Board</p>
                                  <p className="text-xl font-black text-white">
                                    {valueOrDash(update.board_number)}
                                  </p>
                                  {update.previous_board_number && (
                                    <p className="text-xs text-gray-500">
                                      from {update.previous_board_number}
                                    </p>
                                  )}
                                </div>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-black text-white">
                                      {update.player_name}
                                    </p>
                                    <span
                                      className={`rounded-full border px-3 py-1 text-xs font-bold ${movementClass(
                                        movement.tone
                                      )}`}
                                    >
                                      {movement.symbol} {movement.label}
                                    </span>
                                  </div>
                                  <p className="mt-1 text-sm text-gray-400">
                                    {update.result ?? "Result TBA"}
                                    {update.opponent_name
                                      ? ` vs ${update.opponent_name}`
                                      : ""}
                                    {update.points !== null
                                      ? ` - ${update.points} pts`
                                      : ""}
                                  </p>
                                  {update.notes && (
                                    <p className="mt-1 text-xs text-gray-500">
                                      {update.notes}
                                    </p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => deleteLiveUpdate(update.id)}
                                  className="rounded-xl border border-red-500/30 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                                >
                                  Delete
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                      Live Standings
                    </p>
                    <h2 className="mt-3 text-2xl font-black">Top rankings</h2>
                  </div>

                  <Link
                    href={`/admin/tournaments/${tournamentId}/archive`}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Import Results
                  </Link>
                </div>

                {groupedResults.length === 0 ? (
                  <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                    No standings imported yet.
                  </p>
                ) : (
                  <div className="mt-6 space-y-5">
                    {groupedResults.map(([sectionName, sectionResults]) => (
                      <div
                        key={sectionName}
                        className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                      >
                        <h3 className="text-xl font-black">{sectionName}</h3>

                        <div className="mt-4 space-y-2">
                          {sectionResults.slice(0, 5).map((result) => (
                            <Link
                              key={result.id}
                              href={`/admin/players/${result.players?.id}`}
                              className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-900 p-3 transition hover:border-red-500"
                            >
                              <span className="font-bold text-white">
                                {medal(result.final_position)}{" "}
                                {result.players?.full_name ?? "Player not linked"}
                              </span>

                              <span className="text-sm text-gray-400">
                                {valueOrDash(result.points)} pts
                              </span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </section>

            <aside className="space-y-8">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Live Announcement
                </p>
                <h2 className="mt-3 text-2xl font-black">Publish update</h2>

                <form onSubmit={publishAnnouncement} className="mt-6 space-y-4">
                  <input
                    value={announcement.title}
                    onChange={(event) =>
                      setAnnouncement((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    placeholder="Round 3 pairings published"
                    className={inputClass}
                  />

                  <textarea
                    value={announcement.excerpt}
                    onChange={(event) =>
                      setAnnouncement((current) => ({
                        ...current,
                        excerpt: event.target.value,
                      }))
                    }
                    placeholder="Short public update..."
                    rows={3}
                    className={inputClass}
                  />

                  <textarea
                    value={announcement.content}
                    onChange={(event) =>
                      setAnnouncement((current) => ({
                        ...current,
                        content: event.target.value,
                      }))
                    }
                    placeholder="Full announcement..."
                    rows={5}
                    className={inputClass}
                  />

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 p-4">
                    <input
                      type="checkbox"
                      checked={announcement.published}
                      onChange={(event) =>
                        setAnnouncement((current) => ({
                          ...current,
                          published: event.target.checked,
                        }))
                      }
                      className="h-5 w-5 accent-red-600"
                    />
                    <span className="text-sm font-semibold">Publish immediately</span>
                  </label>

                  <button
                    type="submit"
                    disabled={savingAnnouncement}
                    className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {savingAnnouncement ? "Publishing..." : "Publish Update"}
                  </button>
                </form>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Officials
                </p>
                <h2 className="mt-3 text-2xl font-black">Arbiter team</h2>

                <div className="mt-6 space-y-3">
                  {officials.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                      No officials linked yet.
                    </p>
                  ) : (
                    officials.map((official) => (
                      <Link
                        key={official.id}
                        href={`/admin/players/${official.players?.id}`}
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <p className="font-bold text-white">
                          {official.players?.full_name ?? "Unknown official"}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {official.role}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Latest Updates
                </p>
                <h2 className="mt-3 text-2xl font-black">Newsroom</h2>

                <div className="mt-6 space-y-3">
                  {news.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                      No linked live updates yet.
                    </p>
                  ) : (
                    news.map((post) => (
                      <Link
                        key={post.id}
                        href={`/news/${post.id}`}
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <p className="font-bold text-white">{post.title}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {post.category ?? "News"}  - {" "}
                          {formatDateTime(post.published_at)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "yellow" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "red"
      ? "text-red-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

