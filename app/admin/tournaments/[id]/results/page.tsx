"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

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

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  rating: number | null;
  club: string | null;
  province: string | null;
};

type ResultRow = {
  id: string;
  tournament_id: string;
  player_id: string | null;
  section_id: string | null;
  final_position: number | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  notes: string | null;
  created_at: string;
};

type ResultForm = {
  player_id: string;
  section_id: string;
  final_position: string;
  points: string;
  tie_break: string;
  award_title: string;
  notes: string;
};

const emptyForm: ResultForm = {
  player_id: "",
  section_id: "",
  final_position: "",
  points: "",
  tie_break: "",
  award_title: "",
  notes: "",
};

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

function getMedal(position: number | null) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "♟";
}

export default function TournamentResultsPage() {
  const params = useParams();
  const tournamentId = String(params.id ?? "");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [results, setResults] = useState<ResultRow[]>([]);
  const [form, setForm] = useState<ResultForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [playerSearch, setPlayerSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadResultsCentre() {
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

    setTournament(tournamentData as Tournament);

    const { data: sectionData } = await supabase
      .from("tournament_sections")
      .select("id, section_name")
      .eq("tournament_id", tournamentId)
      .order("section_name", { ascending: true });

    setSections((sectionData ?? []) as Section[]);

    const { data: registrationData } = await supabase
      .from("registrations")
      .select("player_id")
      .eq("tournament_id", tournamentId);

    const playerIds = [
      ...new Set(
        ((registrationData ?? []) as { player_id: string | null }[])
          .map((row) => row.player_id)
          .filter(Boolean) as string[]
      ),
    ];

    if (playerIds.length > 0) {
      const { data: playerData } = await supabase
        .from("players")
        .select("id, full_name, chess_sa_id, rating, club, province")
        .in("id", playerIds)
        .order("full_name", { ascending: true });

      setPlayers((playerData ?? []) as Player[]);
    } else {
      setPlayers([]);
    }

    const { data: resultsData, error: resultsError } = await supabase
      .from("tournament_results")
      .select(
        "id, tournament_id, player_id, section_id, final_position, points, tie_break, award_title, notes, created_at"
      )
      .eq("tournament_id", tournamentId)
      .order("section_id", { ascending: true, nullsFirst: true })
      .order("final_position", { ascending: true, nullsFirst: false })
      .order("points", { ascending: false, nullsFirst: false });

    if (resultsError) {
      setMessage(`Could not load results: ${resultsError.message}`);
    } else {
      setResults((resultsData ?? []) as ResultRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (tournamentId) loadResultsCentre();
  }, [tournamentId]);

  const filteredPlayers = useMemo(() => {
    const text = playerSearch.trim().toLowerCase();

    return players.filter((player) => {
      if (!text) return true;

      return (
        player.full_name.toLowerCase().includes(text) ||
        (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (player.club ?? "").toLowerCase().includes(text)
      );
    });
  }, [playerSearch, players]);

  const filteredResults = useMemo(() => {
    return results.filter((result) => {
      if (sectionFilter === "All") return true;
      return result.section_id === sectionFilter;
    });
  }, [results, sectionFilter]);

  const stats = useMemo(() => {
    return {
      players: players.length,
      results: results.length,
      champions: results.filter((result) => result.final_position === 1).length,
      awards: results.filter((result) => result.award_title).length,
    };
  }, [players.length, results]);

  function getPlayer(playerId: string | null) {
    return players.find((player) => player.id === playerId);
  }

  function getSection(sectionId: string | null) {
    return sections.find((section) => section.id === sectionId);
  }

  function updateField(field: keyof ResultForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
    setMessage("");
  }

  function editResult(result: ResultRow) {
    setEditingId(result.id);
    setForm({
      player_id: result.player_id ?? "",
      section_id: result.section_id ?? "",
      final_position: result.final_position?.toString() ?? "",
      points: result.points?.toString() ?? "",
      tie_break: result.tie_break ?? "",
      award_title: result.award_title ?? "",
      notes: result.notes ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.player_id) {
      setMessage("Please select a player.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      tournament_id: tournamentId,
      player_id: form.player_id,
      section_id: form.section_id || null,
      final_position: form.final_position ? Number(form.final_position) : null,
      points: form.points ? Number(form.points) : null,
      tie_break: form.tie_break.trim() || null,
      award_title: form.award_title.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingId) {
      const { error } = await supabase
        .from("tournament_results")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        setMessage(`Could not update result: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Result updated.");
    } else {
      const { error } = await supabase.from("tournament_results").insert(payload);

      if (error) {
        setMessage(`Could not save result: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Result saved.");
    }

    resetForm();
    await loadResultsCentre();
    setSaving(false);
  }

  async function deleteResult(result: ResultRow) {
    const player = getPlayer(result.player_id);
    const confirmed = window.confirm(
      `Delete result for ${player?.full_name ?? "this player"}?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("tournament_results")
      .delete()
      .eq("id", result.id);

    if (error) {
      setMessage(`Could not delete result: ${error.message}`);
      return;
    }

    await loadResultsCentre();
    setMessage("Result deleted.");
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl">
            <p className="text-gray-400">Loading results centre...</p>
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
            ← Back to Tournament Dashboard
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Results Centre
            </p>

            <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-4xl font-black md:text-6xl">
                  {tournament?.tournament_name ?? "Tournament Results"}
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                  Capture final standings, points, awards and notes for this
                  tournament. These records will later power player profiles,
                  tournament archives and public results.
                </p>

                {tournament && (
                  <p className="mt-3 text-sm text-gray-500">
                    {formatDate(tournament.start_date)} • {tournament.venue}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <CommandStat label="Players" value={stats.players} />
                <CommandStat label="Results" value={stats.results} />
                <CommandStat label="Champions" value={stats.champions} />
                <CommandStat label="Awards" value={stats.awards} />
              </div>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-8 lg:grid-cols-[430px_1fr]">
            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                {editingId ? "Edit Result" : "Add Result"}
              </p>

              <h2 className="mt-3 text-2xl font-black">
                {editingId ? "Update player result" : "Record player result"}
              </h2>

              <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Search player
                  </label>
                  <input
                    value={playerSearch}
                    onChange={(event) => setPlayerSearch(event.target.value)}
                    placeholder="Search tournament players..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Player
                  </label>
                  <select
                    value={form.player_id}
                    onChange={(event) => updateField("player_id", event.target.value)}
                    className={inputClass}
                    required
                  >
                    <option value="">Select player</option>
                    {filteredPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {player.full_name}
                        {player.rating ? ` (${player.rating})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Section
                  </label>
                  <select
                    value={form.section_id}
                    onChange={(event) => updateField("section_id", event.target.value)}
                    className={inputClass}
                  >
                    <option value="">No section / overall</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.section_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Final position
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={form.final_position}
                      onChange={(event) =>
                        updateField("final_position", event.target.value)
                      }
                      placeholder="1"
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">
                      Points
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={form.points}
                      onChange={(event) => updateField("points", event.target.value)}
                      placeholder="6.5"
                      className={inputClass}
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Tie-break
                  </label>
                  <input
                    value={form.tie_break}
                    onChange={(event) => updateField("tie_break", event.target.value)}
                    placeholder="Buchholz, SB, direct encounter, etc."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Award / title
                  </label>
                  <input
                    value={form.award_title}
                    onChange={(event) =>
                      updateField("award_title", event.target.value)
                    }
                    placeholder="Champion, Best Junior, Best Female..."
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold">
                    Notes
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(event) => updateField("notes", event.target.value)}
                    rows={4}
                    placeholder="Optional notes..."
                    className={inputClass}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : editingId
                      ? "Save Changes"
                      : "Save Result"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Clear
                  </button>
                </div>
              </form>
            </section>

            <section>
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                      Standings
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Recorded Results</h2>
                  </div>

                  <select
                    value={sectionFilter}
                    onChange={(event) => setSectionFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All sections</option>
                    {sections.map((section) => (
                      <option key={section.id} value={section.id}>
                        {section.section_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {filteredResults.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
                  No results recorded yet.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredResults.map((result) => {
                    const player = getPlayer(result.player_id);
                    const section = getSection(result.section_id);

                    return (
                      <article
                        key={result.id}
                        className="rounded-3xl border border-white/10 bg-zinc-900 p-5 transition hover:border-red-500/60"
                      >
                        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                          <div>
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-gray-300">
                                {getMedal(result.final_position)}{" "}
                                {result.final_position
                                  ? `Position ${result.final_position}`
                                  : "Position TBA"}
                              </span>

                              {section && (
                                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-bold text-blue-200">
                                  {section.section_name}
                                </span>
                              )}

                              {result.award_title && (
                                <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-200">
                                  {result.award_title}
                                </span>
                              )}
                            </div>

                            <h3 className="mt-4 text-xl font-black text-white">
                              {player?.full_name ?? "Player not found"}
                            </h3>

                            <p className="mt-2 text-sm leading-6 text-gray-400">
                              Points:{" "}
                              <span className="font-bold text-white">
                                {result.points ?? "TBA"}
                              </span>
                              {result.tie_break
                                ? ` • Tie-break: ${result.tie_break}`
                                : ""}
                            </p>

                            {result.notes && (
                              <p className="mt-2 text-sm leading-6 text-gray-500">
                                {result.notes}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {player && (
                              <Link
                                href={`/admin/players/${player.id}`}
                                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
                              >
                                Player
                              </Link>
                            )}

                            <button
                              type="button"
                              onClick={() => editResult(result)}
                              className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => deleteResult(result)}
                              className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-bold text-red-200 transition hover:bg-red-500/10"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function CommandStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4 text-center backdrop-blur-md">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs text-gray-400">{label}</p>
    </div>
  );
}
