"use client";

import { ChangeEvent, use, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminPlayerTabs from "@/components/admin/AdminPlayerTabs";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  email: string | null;
  phone: string | null;
  verification_status: string | null;
  profile_photo_url: string | null;
  biography: string | null;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type TournamentResult = {
  id: string;
  tournament_id: string;
  section_id: string | null;
  final_position: number | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  notes: string | null;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    venue: string | null;
    registration_status: string | null;
  } | null;
  tournament_sections: {
    id: string;
    section_name: string;
  } | null;
};

type Registration = {
  id: string;
  tournament_id: string;
  section_id: string | null;
  payment_status: string | null;
  registration_status: string | null;
  created_at: string | null;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    venue: string | null;
    registration_status: string | null;
  } | null;
  tournament_sections: {
    id: string;
    section_name: string;
  } | null;
};

type OfficialAssignment = {
  id: string;
  role: string;
  notes: string | null;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    venue: string | null;
  } | null;
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

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export default function AdminPlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playerId = id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [results, setResults] = useState<TournamentResult[]>([]);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [officialAssignments, setOfficialAssignments] = useState<
    OfficialAssignment[]
  >([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Player>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPlayerProfile() {
    setLoading(true);
    setMessage("");

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, date_of_birth, gender, club, province, rating, email, phone, verification_status, profile_photo_url, biography, title, created_at, updated_at"
      )
      .eq("id", playerId)
      .single();

    if (playerError || !playerData) {
      setMessage("Player could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: resultData } = await supabase
      .from("tournament_results")
      .select(
        "id, tournament_id, section_id, final_position, points, tie_break, award_title, notes, tournaments(id, tournament_name, start_date, venue, registration_status), tournament_sections(id, section_name)"
      )
      .eq("player_id", playerId)
      .order("final_position", { ascending: true, nullsFirst: false });

    const { data: registrationData } = await supabase
      .from("registrations")
      .select(
        "id, tournament_id, section_id, payment_status, registration_status, created_at, tournaments(id, tournament_name, start_date, venue, registration_status), tournament_sections(id, section_name)"
      )
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    const { data: officialData } = await supabase
      .from("tournament_officials")
      .select("id, role, notes, tournaments(id, tournament_name, start_date, venue)")
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    setPlayer(playerData as Player);
    setForm(playerData as Player);
    setResults((resultData ?? []) as unknown as TournamentResult[]);
    setRegistrations((registrationData ?? []) as unknown as Registration[]);
    setOfficialAssignments((officialData ?? []) as unknown as OfficialAssignment[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPlayerProfile();
  }, [playerId]);

  const stats = useMemo(() => {
    const podiums = results.filter((result) =>
      [1, 2, 3].includes(result.final_position ?? 0)
    ).length;

    const wins = results.filter((result) => result.final_position === 1).length;
    const bestFinish =
      results
        .map((result) => result.final_position)
        .filter((value): value is number => Boolean(value))
        .sort((a, b) => a - b)[0] ?? null;

    return {
      tournamentsPlayed: new Set([
        ...results.map((result) => result.tournament_id),
        ...registrations.map((registration) => registration.tournament_id),
      ]).size,
      results: results.length,
      wins,
      podiums,
      bestFinish,
      officialEvents: officialAssignments.length,
    };
  }, [results, registrations, officialAssignments]);

  function updateField(field: keyof Player, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function savePlayer() {
    if (!form.full_name?.trim()) {
      setMessage("Full name is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("players")
      .update({
        full_name: form.full_name.trim(),
        chess_sa_id: form.chess_sa_id?.trim() || null,
        fide_id: form.fide_id?.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender?.trim() || null,
        club: form.club?.trim() || null,
        province: form.province?.trim() || null,
        rating:
          form.rating === null ||
          form.rating === undefined ||
          String(form.rating).trim() === ""
            ? null
            : Number(form.rating),
        email: form.email?.trim() || null,
        phone: form.phone?.trim() || null,
        verification_status: form.verification_status?.trim() || "Pending",
        biography: form.biography?.trim() || null,
        title: form.title?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId);

    if (error) {
      setMessage(`Could not save player: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("Player profile updated.");
    setEditing(false);
    setSaving(false);
    await loadPlayerProfile();
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      event.target.value = "";
      return;
    }

    setUploadingPhoto(true);
    setMessage("");

    const filePath = `players/${playerId}/${Date.now()}-${cleanFileName(
      file.name
    )}`;

    const { error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      setMessage(`Photo upload failed: ${uploadError.message}`);
      setUploadingPhoto(false);
      event.target.value = "";
      return;
    }

    const { data } = supabase.storage.from("player-photos").getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("players")
      .update({
        profile_photo_url: data.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId);

    if (updateError) {
      setMessage(`Photo uploaded but profile update failed: ${updateError.message}`);
      setUploadingPhoto(false);
      event.target.value = "";
      return;
    }

    setMessage("Profile photo uploaded.");
    setUploadingPhoto(false);
    event.target.value = "";
    await loadPlayerProfile();
  }

  async function markVerified() {
    setMessage("");

    const { error } = await supabase
      .from("players")
      .update({
        verification_status: "Verified",
        updated_at: new Date().toISOString(),
      })
      .eq("id", playerId);

    if (error) {
      setMessage(`Could not verify player: ${error.message}`);
      return;
    }

    setMessage("Player marked as verified.");
    await loadPlayerProfile();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading player profile...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!player) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
            Player could not be found.
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
            href="/admin/players"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Player Centre
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-6 md:flex-row md:items-center">
                <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-500/30 bg-red-600/10 text-3xl font-black text-red-200">
                  {player.profile_photo_url ? (
                    <Image
                      src={player.profile_photo_url}
                      alt={player.full_name}
                      fill
                      sizes="128px"
                      className="object-cover"
                    />
                  ) : (
                    initials(player.full_name)
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Player Profile
                  </p>

                  <h1 className="mt-3 text-4xl font-black md:text-6xl">
                    {player.full_name}
                  </h1>

                  <p className="mt-3 text-gray-300">
                    {valueOrDash(player.title)} • {valueOrDash(player.club)} •{" "}
                    {valueOrDash(player.province)}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                      Chess SA: {valueOrDash(player.chess_sa_id)}
                    </span>
                    <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                      FIDE: {valueOrDash(player.fide_id)}
                    </span>
                    <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                      Rating: {valueOrDash(player.rating)}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        player.verification_status === "Verified"
                          ? "bg-green-500/10 text-green-300"
                          : "bg-yellow-500/10 text-yellow-300"
                      }`}
                    >
                      {player.verification_status ?? "Pending"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href={`/players/${player.id}`}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Public Profile
                </Link>

                <button
                  type="button"
                  onClick={() => setEditing((current) => !current)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  {editing ? "Close Edit" : "Edit Profile"}
                </button>

                {player.verification_status !== "Verified" && (
                  <button
                    type="button"
                    onClick={markVerified}
                    className="rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                  >
                    Mark Verified
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6">
              <AdminPlayerTabs id={player.id} />
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <StatCard label="Events" value={stats.tournamentsPlayed} />
            <StatCard label="Results" value={stats.results} />
            <StatCard label="Wins" value={stats.wins} tone="yellow" />
            <StatCard label="Podiums" value={stats.podiums} tone="green" />
            <StatCard label="Best Finish" value={stats.bestFinish ?? "-"} />
            <StatCard label="Official Roles" value={stats.officialEvents} tone="red" />
          </section>

          {editing && (
            <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <h2 className="text-2xl font-black">Edit Player Profile</h2>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                <Field label="Full name">
                  <input
                    value={form.full_name ?? ""}
                    onChange={(event) => updateField("full_name", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Title / role label">
                  <input
                    value={form.title ?? ""}
                    onChange={(event) => updateField("title", event.target.value)}
                    placeholder="FA, PA, Coach, CM, etc."
                    className={inputClass}
                  />
                </Field>

                <Field label="Chess SA ID">
                  <input
                    value={form.chess_sa_id ?? ""}
                    onChange={(event) => updateField("chess_sa_id", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="FIDE ID">
                  <input
                    value={form.fide_id ?? ""}
                    onChange={(event) => updateField("fide_id", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Date of birth">
                  <input
                    type="date"
                    value={form.date_of_birth ?? ""}
                    onChange={(event) =>
                      updateField("date_of_birth", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Gender">
                  <input
                    value={form.gender ?? ""}
                    onChange={(event) => updateField("gender", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Club">
                  <input
                    value={form.club ?? ""}
                    onChange={(event) => updateField("club", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Province">
                  <input
                    value={form.province ?? ""}
                    onChange={(event) => updateField("province", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Rating">
                  <input
                    type="number"
                    value={form.rating ?? ""}
                    onChange={(event) =>
                      updateField("rating", event.target.value)
                    }
                    className={inputClass}
                  />
                </Field>

                <Field label="Verification status">
                  <select
                    value={form.verification_status ?? "Pending"}
                    onChange={(event) =>
                      updateField("verification_status", event.target.value)
                    }
                    className={inputClass}
                  >
                    <option>Pending</option>
                    <option>Verified</option>
                    <option>Needs Review</option>
                  </select>
                </Field>

                <Field label="Email">
                  <input
                    value={form.email ?? ""}
                    onChange={(event) => updateField("email", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <Field label="Phone">
                  <input
                    value={form.phone ?? ""}
                    onChange={(event) => updateField("phone", event.target.value)}
                    className={inputClass}
                  />
                </Field>

                <div className="md:col-span-2">
                  <Field label="Biography">
                    <textarea
                      value={form.biography ?? ""}
                      onChange={(event) =>
                        updateField("biography", event.target.value)
                      }
                      rows={5}
                      className={inputClass}
                    />
                  </Field>
                </div>

                <div className="md:col-span-2">
                  <Field label="Upload profile photo">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadPhoto}
                      disabled={uploadingPhoto}
                      className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                    />
                  </Field>
                </div>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={savePlayer}
                  disabled={saving}
                  className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Profile"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setForm(player);
                    setEditing(false);
                  }}
                  className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Cancel
                </button>
              </div>
            </section>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Recent Results
                  </p>
                  <h2 className="mt-3 text-2xl font-black">
                    Tournament Performance
                  </h2>
                </div>

                <Link
                  href={`/admin/players/${player.id}/history`}
                  className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
                >
                  View All
                </Link>
              </div>

              <div className="mt-6 space-y-3">
                {results.length === 0 ? (
                  <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                    No results linked yet.
                  </p>
                ) : (
                  results.slice(0, 8).map((result) => (
                    <Link
                      key={result.id}
                      href={`/admin/tournaments/${result.tournament_id}`}
                      className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                    >
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-bold text-white">
                            {result.tournaments?.tournament_name ??
                              "Unknown tournament"}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">
                            {formatDate(result.tournaments?.start_date ?? null)} •{" "}
                            {result.tournament_sections?.section_name ?? "Overall"}
                          </p>
                        </div>

                        <div className="text-sm text-gray-300">
                          Pos {valueOrDash(result.final_position)} •{" "}
                          {valueOrDash(result.points)} pts
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <aside className="space-y-8">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Official Roles
                </p>
                <h2 className="mt-3 text-2xl font-black">Arbiter / Staff</h2>

                <div className="mt-6 space-y-3">
                  {officialAssignments.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                      No official roles linked yet.
                    </p>
                  ) : (
                    officialAssignments.slice(0, 6).map((assignment) => (
                      <Link
                        key={assignment.id}
                        href={`/admin/tournaments/${assignment.tournaments?.id}`}
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <p className="font-bold text-white">
                          {assignment.role}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {assignment.tournaments?.tournament_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatDate(assignment.tournaments?.start_date ?? null)}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Registered Events
                </p>
                <h2 className="mt-3 text-2xl font-black">Registrations</h2>

                <div className="mt-6 space-y-3">
                  {registrations.length === 0 ? (
                    <p className="rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                      No registrations linked yet.
                    </p>
                  ) : (
                    registrations.slice(0, 6).map((registration) => (
                      <Link
                        key={registration.id}
                        href={`/admin/tournaments/${registration.tournament_id}`}
                        className="block rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500"
                      >
                        <p className="font-bold text-white">
                          {registration.tournaments?.tournament_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {registration.tournament_sections?.section_name ??
                            "Overall"}{" "}
                          • {registration.registration_status}
                        </p>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </aside>
          </div>
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
