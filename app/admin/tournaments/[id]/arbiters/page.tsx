"use client";

import { use, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
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
  arbiter_player_id: string | null;
};

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  verification_status: string | null;
  profile_photo_url: string | null;
  title: string | null;
};

type Official = {
  id: string;
  tournament_id: string;
  player_id: string;
  role: string;
  notes: string | null;
  created_at: string | null;
  players: Player | null;
};

type OfficialForm = {
  player_id: string;
  role: string;
  notes: string;
};

const emptyForm: OfficialForm = {
  player_id: "",
  role: "Chief Arbiter",
  notes: "",
};

const arbiterRoles = [
  "Chief Arbiter",
  "Deputy Arbiter",
  "Arbiter",
  "Assistant Arbiter",
  "Pairings Officer",
  "Appeals Committee",
];

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

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function TournamentArbitersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tournamentId = id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [officials, setOfficials] = useState<Official[]>([]);
  const [form, setForm] = useState<OfficialForm>(emptyForm);
  const [editingOfficialId, setEditingOfficialId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const editingOfficial = useMemo(() => {
    return officials.find((official) => official.id === editingOfficialId) ?? null;
  }, [officials, editingOfficialId]);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status, arbiter_player_id")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      setMessage("Tournament could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: officialData, error: officialError } = await supabase
      .from("tournament_officials")
      .select(
        "id, tournament_id, player_id, role, notes, created_at, players(id, full_name, chess_sa_id, fide_id, club, province, rating, verification_status, profile_photo_url, title)"
      )
      .eq("tournament_id", tournamentId)
      .in("role", arbiterRoles)
      .order("created_at", { ascending: true });

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, club, province, rating, verification_status, profile_photo_url, title"
      )
      .order("full_name", { ascending: true })
      .limit(10000);

    if (officialError) {
      setMessage(`Could not load tournament arbiters: ${officialError.message}`);
    } else if (playerError) {
      setMessage(`Could not load players: ${playerError.message}`);
    }

    setTournament(tournamentData as Tournament);
    setOfficials((officialData ?? []) as unknown as Official[]);
    setPlayers((playerData ?? []) as unknown as Player[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [tournamentId]);

  const filteredPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return players.filter((player) => {
      if (!text) return true;

      return (
        player.full_name.toLowerCase().includes(text) ||
        (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (player.fide_id ?? "").toLowerCase().includes(text) ||
        (player.club ?? "").toLowerCase().includes(text) ||
        (player.province ?? "").toLowerCase().includes(text) ||
        (player.title ?? "").toLowerCase().includes(text)
      );
    });
  }, [players, search]);

  const filteredOfficials = useMemo(() => {
    return officials.filter((official) => {
      return roleFilter === "All" || official.role === roleFilter;
    });
  }, [officials, roleFilter]);

  const selectedPlayer = useMemo(() => {
    return players.find((player) => player.id === form.player_id) ?? null;
  }, [players, form.player_id]);

  const stats = useMemo(() => {
    return {
      total: officials.length,
      chief: officials.filter((official) => official.role === "Chief Arbiter").length,
      deputy: officials.filter((official) => official.role === "Deputy Arbiter").length,
      assistants: officials.filter((official) =>
        ["Arbiter", "Assistant Arbiter"].includes(official.role)
      ).length,
    };
  }, [officials]);

  function updateField(field: keyof OfficialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingOfficialId(null);
  }

  function editOfficial(official: Official) {
    setEditingOfficialId(official.id);
    setForm({
      player_id: official.player_id,
      role: official.role,
      notes: official.notes ?? "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitOfficial(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.player_id) {
      setMessage("Select a player from the Player Centre.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      tournament_id: tournamentId,
      player_id: form.player_id,
      role: form.role,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingOfficialId) {
      const { error } = await supabase
        .from("tournament_officials")
        .update(payload)
        .eq("id", editingOfficialId);

      if (error) {
        setMessage(`Could not update arbiter: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Arbiter assignment updated.");
    } else {
      const duplicate = officials.find(
        (official) =>
          official.player_id === form.player_id && official.role === form.role
      );

      if (duplicate) {
        setMessage("This player already has that arbiter role for this tournament.");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("tournament_officials").insert(payload);

      if (error) {
        setMessage(`Could not assign arbiter: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Arbiter assigned.");
    }

    if (form.role === "Chief Arbiter") {
      await supabase
        .from("tournaments")
        .update({ arbiter_player_id: form.player_id })
        .eq("id", tournamentId);
    }

    resetForm();
    setSaving(false);
    await loadPage();
  }

  async function setAsChiefArbiter(official: Official) {
    setMessage("");

    const { error: tournamentError } = await supabase
      .from("tournaments")
      .update({
        arbiter_player_id: official.player_id,
      })
      .eq("id", tournamentId);

    if (tournamentError) {
      setMessage(`Could not set chief arbiter: ${tournamentError.message}`);
      return;
    }

    const { error: officialError } = await supabase
      .from("tournament_officials")
      .update({
        role: "Chief Arbiter",
        updated_at: new Date().toISOString(),
      })
      .eq("id", official.id);

    if (officialError) {
      setMessage(`Chief arbiter saved on tournament, but role update failed: ${officialError.message}`);
      await loadPage();
      return;
    }

    setMessage("Chief arbiter updated.");
    await loadPage();
  }

  async function removeOfficial(official: Official) {
    const confirmed = window.confirm(
      `Remove ${official.players?.full_name ?? "this player"} as ${official.role}?`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("tournament_officials")
      .delete()
      .eq("id", official.id);

    if (error) {
      setMessage(`Could not remove arbiter: ${error.message}`);
      return;
    }

    if (tournament?.arbiter_player_id === official.player_id) {
      await supabase
        .from("tournaments")
        .update({ arbiter_player_id: null })
        .eq("id", tournamentId);
    }

    if (editingOfficialId === official.id) resetForm();

    setMessage("Arbiter removed.");
    await loadPage();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading tournament arbiters...
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
            ← Back to Tournament Dashboard
          </Link>

          <AdminTournamentTabs id={tournamentId} />

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Tournament Arbiters
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              {tournament.tournament_name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Assign arbiters from the Player Centre. Public tournament pages can
              display the Chief Arbiter with their profile photo and link back to
              the player profile.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {formatDate(tournament.start_date)}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {tournament.venue ?? "Venue TBA"}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {tournament.registration_status ?? "Status TBA"}
              </span>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Total Arbiters" value={stats.total} />
            <StatCard label="Chief" value={stats.chief} tone="red" />
            <StatCard label="Deputy" value={stats.deputy} tone="yellow" />
            <StatCard label="Arbiter Team" value={stats.assistants} tone="green" />
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[430px_1fr]">
            <aside className="space-y-8">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  {editingOfficialId ? "Edit Arbiter" : "Assign Arbiter"}
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  Tournament official
                </h2>

                <form onSubmit={submitOfficial} className="mt-6 space-y-5">
                  <Field label="Search Player Centre">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search name, Chess SA ID, FIDE ID, club..."
                      className={inputClass}
                    />
                  </Field>

                  <Field label="Selected player">
                    <select
                      value={form.player_id}
                      onChange={(event) =>
                        updateField("player_id", event.target.value)
                      }
                      className={inputClass}
                      required
                    >
                      <option value="">Select player</option>
                      {filteredPlayers.slice(0, 300).map((player) => (
                        <option key={player.id} value={player.id}>
                          {player.full_name}
                          {player.title ? ` — ${player.title}` : ""}
                          {player.chess_sa_id ? ` — ${player.chess_sa_id}` : ""}
                        </option>
                      ))}
                    </select>
                  </Field>

                  {selectedPlayer && (
                    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
                      <div className="flex items-center gap-4">
                        <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-500/30 bg-red-600/10 text-sm font-black text-red-200">
                          {selectedPlayer.profile_photo_url ? (
                            <Image
                              src={selectedPlayer.profile_photo_url}
                              alt={selectedPlayer.full_name}
                              fill
                              sizes="64px"
                              className="object-cover"
                            />
                          ) : (
                            initials(selectedPlayer.full_name)
                          )}
                        </div>

                        <div>
                          <p className="font-black text-white">
                            {selectedPlayer.full_name}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {valueOrDash(selectedPlayer.title)} • Chess SA:{" "}
                            {valueOrDash(selectedPlayer.chess_sa_id)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Field label="Role">
                    <select
                      value={form.role}
                      onChange={(event) => updateField("role", event.target.value)}
                      className={inputClass}
                    >
                      {arbiterRoles.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Notes">
                    <textarea
                      value={form.notes}
                      onChange={(event) => updateField("notes", event.target.value)}
                      rows={4}
                      placeholder="Sections handled, rounds, responsibilities..."
                      className={inputClass}
                    />
                  </Field>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {saving
                        ? "Saving..."
                        : editingOfficialId
                        ? "Save Changes"
                        : "Assign Arbiter"}
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
            </aside>

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Assigned Arbiters
                  </p>
                  <h2 className="mt-3 text-2xl font-black">Arbiter Team</h2>
                </div>

                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value)}
                  className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
                >
                  <option value="All">All roles</option>
                  {arbiterRoles.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {filteredOfficials.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  No arbiters assigned yet.
                </p>
              ) : (
                <div className="mt-6 grid gap-4">
                  {filteredOfficials.map((official) => {
                    const player = official.players;
                    const isChief =
                      tournament.arbiter_player_id === official.player_id ||
                      official.role === "Chief Arbiter";

                    return (
                      <article
                        key={official.id}
                        className={`rounded-2xl border p-5 ${
                          isChief
                            ? "border-red-500/40 bg-red-500/10"
                            : "border-white/10 bg-zinc-950"
                        }`}
                      >
                        <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4">
                            <Link
                              href={`/admin/players/${official.player_id}`}
                              className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-900 text-lg font-black text-red-200"
                            >
                              {player?.profile_photo_url ? (
                                <Image
                                  src={player.profile_photo_url}
                                  alt={player.full_name}
                                  fill
                                  sizes="80px"
                                  className="object-cover"
                                />
                              ) : (
                                initials(player?.full_name ?? "P")
                              )}
                            </Link>

                            <div>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-gray-200">
                                  {official.role}
                                </span>
                                {isChief && (
                                  <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                                    Public Chief Arbiter
                                  </span>
                                )}
                              </div>

                              <Link
                                href={`/admin/players/${official.player_id}`}
                                className="mt-3 block text-xl font-black text-white transition hover:text-red-300"
                              >
                                {player?.full_name ?? "Unknown player"}
                              </Link>

                              <p className="mt-1 text-sm text-gray-400">
                                {valueOrDash(player?.title)} • Chess SA:{" "}
                                {valueOrDash(player?.chess_sa_id)} • FIDE:{" "}
                                {valueOrDash(player?.fide_id)}
                              </p>

                              {official.notes && (
                                <p className="mt-3 text-sm leading-6 text-gray-500">
                                  {official.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setAsChiefArbiter(official)}
                              className="rounded-xl border border-green-500/40 px-4 py-2 text-xs font-bold text-green-200 transition hover:bg-green-500/10"
                            >
                              Set Chief
                            </button>

                            <button
                              type="button"
                              onClick={() => editOfficial(official)}
                              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-red-500"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => removeOfficial(official)}
                              className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                            >
                              Remove
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

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-200">
        {label}
      </span>
      {children}
    </label>
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
