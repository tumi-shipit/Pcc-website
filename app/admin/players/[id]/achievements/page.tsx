"use client";

import { use, FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminPlayerTabs from "@/components/admin/AdminPlayerTabs";
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
};

type Achievement = {
  id: string;
  player_id: string;
  tournament_id: string | null;
  title: string;
  achievement_type: string | null;
  description: string | null;
  achieved_at: string | null;
  created_at: string | null;
  tournaments: Tournament | null;
};

type AchievementForm = {
  title: string;
  achievement_type: string;
  description: string;
  achieved_at: string;
  tournament_id: string;
};

const emptyForm: AchievementForm = {
  title: "",
  achievement_type: "Achievement",
  description: "",
  achieved_at: new Date().toISOString().slice(0, 10),
  tournament_id: "",
};

const achievementTypes = [
  "Achievement",
  "Tournament Win",
  "Podium Finish",
  "Medal",
  "Title",
  "Award",
  "Milestone",
  "Upset",
  "Player of the Tournament",
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

export default function AdminPlayerAchievementsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playerId = id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [form, setForm] = useState<AchievementForm>(emptyForm);
  const [editingAchievementId, setEditingAchievementId] = useState<string | null>(
    null
  );
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const editingAchievement = useMemo(() => {
    return achievements.find((item) => item.id === editingAchievementId) ?? null;
  }, [achievements, editingAchievementId]);

  const filteredAchievements = useMemo(() => {
    return achievements.filter((achievement) => {
      return filter === "All" || achievement.achievement_type === filter;
    });
  }, [achievements, filter]);

  const stats = useMemo(() => {
    return {
      total: achievements.length,
      wins: achievements.filter((item) => item.achievement_type === "Tournament Win")
        .length,
      medals: achievements.filter((item) =>
        ["Medal", "Podium Finish"].includes(item.achievement_type ?? "")
      ).length,
      awards: achievements.filter((item) =>
        ["Award", "Player of the Tournament", "Upset"].includes(
          item.achievement_type ?? ""
        )
      ).length,
    };
  }, [achievements]);

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

    const { data: achievementData, error: achievementError } = await supabase
      .from("player_achievements")
      .select(
        "id, player_id, tournament_id, title, achievement_type, description, achieved_at, created_at, tournaments(id, tournament_name, start_date)"
      )
      .eq("player_id", playerId)
      .order("achieved_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

    const { data: tournamentData } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date")
      .neq("registration_status", "Draft")
      .order("start_date", { ascending: false })
      .limit(1000);

    if (achievementError) {
      setMessage(`Could not load achievements: ${achievementError.message}`);
    }

    setPlayer(playerData as Player);
    setAchievements((achievementData ?? []) as unknown as Achievement[]);
    setTournaments((tournamentData ?? []) as unknown as Tournament[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [playerId]);

  function updateField(field: keyof AchievementForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingAchievementId(null);
  }

  function editAchievement(achievement: Achievement) {
    setEditingAchievementId(achievement.id);
    setForm({
      title: achievement.title,
      achievement_type: achievement.achievement_type ?? "Achievement",
      description: achievement.description ?? "",
      achieved_at:
        achievement.achieved_at ?? new Date().toISOString().slice(0, 10),
      tournament_id: achievement.tournament_id ?? "",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitAchievement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim()) {
      setMessage("Achievement title is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      player_id: playerId,
      title: form.title.trim(),
      achievement_type: form.achievement_type || "Achievement",
      description: form.description.trim() || null,
      achieved_at: form.achieved_at || null,
      tournament_id: form.tournament_id || null,
    };

    if (editingAchievementId) {
      const { error } = await supabase
        .from("player_achievements")
        .update(payload)
        .eq("id", editingAchievementId);

      if (error) {
        setMessage(`Could not update achievement: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Achievement updated.");
    } else {
      const { error } = await supabase.from("player_achievements").insert(payload);

      if (error) {
        setMessage(`Could not add achievement: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Achievement added.");
    }

    resetForm();
    setSaving(false);
    await loadPage();
  }

  async function deleteAchievement(achievement: Achievement) {
    const confirmed = window.confirm(
      `Delete "${achievement.title}" from this player profile?`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("player_achievements")
      .delete()
      .eq("id", achievement.id);

    if (error) {
      setMessage(`Could not delete achievement: ${error.message}`);
      return;
    }

    if (editingAchievementId === achievement.id) resetForm();

    setMessage("Achievement deleted.");
    await loadPage();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading achievements...
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
              Player Achievements
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              {player.full_name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Add titles, awards, medals, milestones and special recognitions to
              this player&apos;s permanent profile.
            </p>

            <AdminPlayerTabs id={playerId} />
          </section>

          {message && message !== "Player could not be loaded." && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Total" value={stats.total} />
            <StatCard label="Wins" value={stats.wins} tone="yellow" />
            <StatCard label="Medals" value={stats.medals} tone="green" />
            <StatCard label="Awards" value={stats.awards} tone="red" />
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                {editingAchievementId ? "Edit Achievement" : "Add Achievement"}
              </p>

              <h2 className="mt-3 text-2xl font-black">
                {editingAchievementId ? "Update record" : "New record"}
              </h2>

              <form onSubmit={submitAchievement} className="mt-6 space-y-5">
                <Field label="Title">
                  <input
                    value={form.title}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="Limpopo Champion, Player of the Tournament..."
                    className={inputClass}
                    required
                  />
                </Field>

                <Field label="Achievement type">
                  <select
                    value={form.achievement_type}
                    onChange={(event) =>
                      updateField("achievement_type", event.target.value)
                    }
                    className={inputClass}
                  >
                    {achievementTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Date achieved">
                  <input
                    type="date"
                    value={form.achieved_at}
                    onChange={(event) =>
                      updateField("achieved_at", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Linked tournament">
                  <select
                    value={form.tournament_id}
                    onChange={(event) =>
                      updateField("tournament_id", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">No tournament linked</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.tournament_name}  - {" "}
                        {formatDate(tournament.start_date)}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Description">
                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateField("description", event.target.value)
                    }
                    rows={5}
                    placeholder="Add context, result details, why this achievement matters..."
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
                      : editingAchievementId
                      ? "Save Changes"
                      : "Add Achievement"}
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
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Achievement Timeline
                  </p>
                  <h2 className="mt-3 text-2xl font-black">Records</h2>
                </div>

                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition focus:border-red-500"
                >
                  <option value="All">All types</option>
                  {achievementTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              {filteredAchievements.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  No achievements found.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredAchievements.map((achievement) => (
                    <article
                      key={achievement.id}
                      className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-200">
                              {achievement.achievement_type ?? "Achievement"}
                            </span>

                            <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-gray-300">
                              {formatDate(achievement.achieved_at)}
                            </span>
                          </div>

                          <h3 className="mt-4 text-xl font-black text-white">
                            {achievement.title}
                          </h3>

                          {achievement.tournaments && (
                            <Link
                              href={`/admin/tournaments/${achievement.tournament_id}`}
                              className="mt-2 inline-block text-sm font-semibold text-red-300 transition hover:text-red-200"
                            >
                              {achievement.tournaments.tournament_name}
                            </Link>
                          )}

                          {achievement.description && (
                            <p className="mt-3 text-sm leading-6 text-gray-400">
                              {achievement.description}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => editAchievement(achievement)}
                            className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-red-500"
                          >
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteAchievement(achievement)}
                            className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                          >
                            Delete
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

