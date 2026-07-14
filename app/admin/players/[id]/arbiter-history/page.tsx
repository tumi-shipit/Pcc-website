"use client";

import { use, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminPlayerTabs from "@/components/admin/AdminPlayerTabs";
import { singleRelation } from "@/lib/supabaseHelpers";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  verification_status: string | null;
};

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  province: string | null;
  registration_status: string | null;
};

type OfficialAssignment = {
  id: string;
  tournament_id: string;
  player_id: string;
  role: string;
  notes: string | null;
  created_at: string | null;
  updated_at: string | null;
  tournaments: Tournament | null;
};

type OfficialAssignmentQueryRow = Omit<OfficialAssignment, "tournaments"> & {
  tournaments: Tournament | Tournament[] | null;
};

type AssignmentForm = {
  tournament_id: string;
  role: string;
  notes: string;
};

const emptyForm: AssignmentForm = {
  tournament_id: "",
  role: "Chief Arbiter",
  notes: "",
};

const officialRoles = [
  "Chief Arbiter",
  "Deputy Arbiter",
  "Arbiter",
  "Assistant Arbiter",
  "Pairings Officer",
  "Appeals Committee",
  "Tournament Director",
  "Organiser",
  "Media Officer",
  "Volunteer",
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

export default function AdminPlayerArbiterHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playerId = id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [assignments, setAssignments] = useState<OfficialAssignment[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(
    null
  );
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const editingAssignment = useMemo(() => {
    return assignments.find((item) => item.id === editingAssignmentId) ?? null;
  }, [assignments, editingAssignmentId]);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, club, province, rating, verification_status"
      )
      .eq("id", playerId)
      .single();

    if (playerError || !playerData) {
      setMessage("Player could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("tournament_officials")
      .select(
        "id, tournament_id, player_id, role, notes, created_at, updated_at, tournaments(id, tournament_name, start_date, venue, province, registration_status)"
      )
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    const { data: tournamentData } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, province, registration_status")
      .neq("registration_status", "Draft")
      .order("start_date", { ascending: false })
      .limit(1000);

    if (assignmentError) {
      setMessage(`Could not load arbiter history: ${assignmentError.message}`);
    }

    const assignmentRows = (assignmentData ?? []) as OfficialAssignmentQueryRow[];

    setPlayer(playerData as Player);
    setAssignments(
      assignmentRows.map((assignment) => ({
        ...assignment,
        tournaments: singleRelation(assignment.tournaments),
      }))
    );
    setTournaments((tournamentData ?? []) as unknown as Tournament[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [playerId]);

  const filteredAssignments = useMemo(() => {
    const text = search.trim().toLowerCase();

    return assignments.filter((assignment) => {
      const tournament = assignment.tournaments;

      const matchesSearch =
        !text ||
        assignment.role.toLowerCase().includes(text) ||
        (assignment.notes ?? "").toLowerCase().includes(text) ||
        (tournament?.tournament_name ?? "").toLowerCase().includes(text) ||
        (tournament?.venue ?? "").toLowerCase().includes(text) ||
        (tournament?.province ?? "").toLowerCase().includes(text);

      const matchesRole =
        roleFilter === "All" || assignment.role === roleFilter;

      const matchesStatus =
        statusFilter === "All" ||
        tournament?.registration_status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [assignments, search, roleFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: assignments.length,
      chief: assignments.filter((item) => item.role === "Chief Arbiter").length,
      deputy: assignments.filter((item) => item.role === "Deputy Arbiter").length,
      arbiter: assignments.filter((item) =>
        ["Arbiter", "Assistant Arbiter"].includes(item.role)
      ).length,
      organiser: assignments.filter((item) =>
        ["Tournament Director", "Organiser", "Media Officer", "Volunteer"].includes(
          item.role
        )
      ).length,
    };
  }, [assignments]);

  function updateField(field: keyof AssignmentForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingAssignmentId(null);
  }

  function editAssignment(assignment: OfficialAssignment) {
    setEditingAssignmentId(assignment.id);
    setForm({
      tournament_id: assignment.tournament_id,
      role: assignment.role,
      notes: assignment.notes ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAssignment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.tournament_id) {
      setMessage("Select a tournament.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      tournament_id: form.tournament_id,
      player_id: playerId,
      role: form.role,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (editingAssignmentId) {
      const { error } = await supabase
        .from("tournament_officials")
        .update(payload)
        .eq("id", editingAssignmentId);

      if (error) {
        setMessage(`Could not update assignment: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Official assignment updated.");
    } else {
      const { error } = await supabase.from("tournament_officials").insert(payload);

      if (error) {
        setMessage(`Could not add assignment: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Official assignment added.");
    }

    resetForm();
    setSaving(false);
    await loadPage();
  }

  async function deleteAssignment(assignment: OfficialAssignment) {
    const confirmed = window.confirm(
      `Remove ${player?.full_name ?? "this player"} as ${assignment.role} from ${
        assignment.tournaments?.tournament_name ?? "this tournament"
      }?`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("tournament_officials")
      .delete()
      .eq("id", assignment.id);

    if (error) {
      setMessage(`Could not delete assignment: ${error.message}`);
      return;
    }

    if (editingAssignmentId === assignment.id) resetForm();

    setMessage("Official assignment removed.");
    await loadPage();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading arbiter history...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!player || message === "Player could not be loaded.") {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
            {message || "Player could not be found."}
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
            href={`/admin/players/${playerId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Player Profile
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Arbiter & Official History
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              {player.full_name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Track tournaments where this person served as arbiter, deputy
              arbiter, tournament director, organiser or other official role.
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                Chess SA: {valueOrDash(player.chess_sa_id)}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                FIDE: {valueOrDash(player.fide_id)}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                Club: {valueOrDash(player.club)}
              </span>
            </div>

            <AdminPlayerTabs id={playerId} />
          </section>

          {message && message !== "Player could not be loaded." && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-5">
            <StatCard label="Total Roles" value={stats.total} />
            <StatCard label="Chief Arbiter" value={stats.chief} tone="red" />
            <StatCard label="Deputy" value={stats.deputy} tone="yellow" />
            <StatCard label="Arbiter Roles" value={stats.arbiter} tone="green" />
            <StatCard label="Organising" value={stats.organiser} />
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                {editingAssignmentId ? "Edit Role" : "Add Role"}
              </p>

              <h2 className="mt-3 text-2xl font-black">
                Official assignment
              </h2>

              <form onSubmit={submitAssignment} className="mt-6 space-y-5">
                <Field label="Tournament">
                  <select
                    value={form.tournament_id}
                    onChange={(event) =>
                      updateField("tournament_id", event.target.value)
                    }
                    className={inputClass}
                    required
                  >
                    <option value="">Select tournament</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.tournament_name}  - {" "}
                        {formatDate(tournament.start_date)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Role">
                  <select
                    value={form.role}
                    onChange={(event) => updateField("role", event.target.value)}
                    className={inputClass}
                  >
                    {officialRoles.map((role) => (
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
                    rows={5}
                    placeholder="Section handled, number of rounds, special responsibilities..."
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
                      : editingAssignmentId
                      ? "Save Changes"
                      : "Add Role"}
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

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Official Timeline
                  </p>
                  <h2 className="mt-3 text-2xl font-black">
                    Linked tournaments
                  </h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search..."
                    className={inputClass}
                  />

                  <select
                    value={roleFilter}
                    onChange={(event) => setRoleFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All roles</option>
                    {officialRoles.map((role) => (
                      <option key={role} value={role}>
                        {role}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All status</option>
                    <option value="Open">Open</option>
                    <option value="Live">Live</option>
                    <option value="Completed">Completed</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              {filteredAssignments.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  No official assignments found.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredAssignments.map((assignment) => (
                    <article
                      key={assignment.id}
                      className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-200">
                              {assignment.role}
                            </span>

                            <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-gray-300">
                              {assignment.tournaments?.registration_status ??
                                "Status TBA"}
                            </span>

                            <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-gray-300">
                              {formatDate(
                                assignment.tournaments?.start_date ?? null
                              )}
                            </span>
                          </div>

                          <Link
                            href={`/admin/tournaments/${assignment.tournament_id}`}
                            className="mt-4 block text-xl font-black text-white transition hover:text-red-300"
                          >
                            {assignment.tournaments?.tournament_name ??
                              "Unknown tournament"}
                          </Link>

                          <p className="mt-2 text-sm text-gray-400">
                            {valueOrDash(assignment.tournaments?.venue)}
                            {assignment.tournaments?.province
                              ? `  -  ${assignment.tournaments.province}`
                              : ""}
                          </p>

                          {assignment.notes && (
                            <p className="mt-3 text-sm leading-6 text-gray-500">
                              {assignment.notes}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editAssignment(assignment)}
                            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-red-500"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteAssignment(assignment)}
                            className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
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

