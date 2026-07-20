"use client";

import { use, useEffect, useMemo, useState } from "react";
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

type Organisation = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  representative_name: string | null;
};

type CommitteeMember = {
  id: string;
  organisation_id: string;
  player_id: string | null;
  full_name: string;
  chess_sa_id: string | null;
  role_title: string | null;
};

type TournamentOrganisation = {
  id: string;
  tournament_id: string;
  organisation_id: string;
  role: string;
  representative_member_id: string | null;
  representative_name: string | null;
  notes: string | null;
  display_order: number | null;
};

type AssignmentForm = {
  organisation_id: string;
  role: string;
  representative_member_id: string;
  representative_name: string;
  notes: string;
};

const emptyForm: AssignmentForm = {
  organisation_id: "",
  role: "Organiser",
  representative_member_id: "",
  representative_name: "",
  notes: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function TournamentOrganisationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tournamentId = id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [assignments, setAssignments] = useState<TournamentOrganisation[]>([]);
  const [form, setForm] = useState<AssignmentForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedOrganisation = useMemo(
    () =>
      organisations.find((organisation) => organisation.id === form.organisation_id) ??
      null,
    [organisations, form.organisation_id]
  );

  const availableMembers = useMemo(
    () =>
      members.filter((member) => member.organisation_id === form.organisation_id),
    [members, form.organisation_id]
  );

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status")
      .eq("id", tournamentId)
      .single();

    const { data: organisationData, error: organisationError } = await supabase
      .from("organisations")
      .select("id, name, logo_url, website_url, representative_name")
      .order("name", { ascending: true });

    const { data: memberData, error: memberError } = await supabase
      .from("organisation_committee_members")
      .select("id, organisation_id, player_id, full_name, chess_sa_id, role_title")
      .order("display_order", { ascending: true })
      .order("full_name", { ascending: true });

    const { data: assignmentData, error: assignmentError } = await supabase
      .from("tournament_organisations")
      .select(
        "id, tournament_id, organisation_id, role, representative_member_id, representative_name, notes, display_order"
      )
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (tournamentError || !tournamentData) {
      setMessage("Tournament could not be loaded.");
    } else if (organisationError) {
      setMessage(`Could not load organisations: ${organisationError.message}`);
    } else if (memberError) {
      setMessage(`Could not load committee members: ${memberError.message}`);
    } else if (assignmentError) {
      setMessage(`Could not load tournament organisations: ${assignmentError.message}`);
    } else {
      setTournament(tournamentData as Tournament);
      setOrganisations((organisationData ?? []) as unknown as Organisation[]);
      setMembers((memberData ?? []) as unknown as CommitteeMember[]);
      setAssignments((assignmentData ?? []) as unknown as TournamentOrganisation[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [tournamentId]);

  function updateField(field: keyof AssignmentForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function assignOrganisation() {
    if (!form.organisation_id) {
      setMessage("Select an organisation first.");
      return;
    }

    setSaving(true);
    setMessage("");

    const selectedMember = members.find(
      (member) => member.id === form.representative_member_id
    );

    const { error } = await supabase.from("tournament_organisations").insert({
      tournament_id: tournamentId,
      organisation_id: form.organisation_id,
      role: form.role.trim() || "Organiser",
      representative_member_id: form.representative_member_id || null,
      representative_name:
        form.representative_name.trim() ||
        selectedMember?.full_name ||
        selectedOrganisation?.representative_name ||
        null,
      notes: form.notes.trim() || null,
      display_order: assignments.length + 1,
    });

    if (error) {
      setMessage(`Could not assign organisation: ${error.message}`);
      setSaving(false);
      return;
    }

    setForm(emptyForm);
    setSaving(false);
    setMessage("Organisation assigned to tournament.");
    await loadData();
  }

  async function removeAssignment(assignment: TournamentOrganisation) {
    const organisation = organisations.find(
      (item) => item.id === assignment.organisation_id
    );
    const confirmed = window.confirm(
      `Remove ${organisation?.name ?? "this organisation"} from this tournament?`
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("tournament_organisations")
      .delete()
      .eq("id", assignment.id);

    if (error) {
      setMessage(`Could not remove organisation: ${error.message}`);
      return;
    }

    setMessage("Organisation removed from tournament.");
    await loadData();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-400">
            Loading tournament organisations...
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
            className="text-sm font-semibold text-red-300"
          >
            Back to Tournament Dashboard
          </Link>

          <AdminTournamentTabs id={tournamentId} />

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(22,163,74,0.2),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-green-300">
              Tournament Organisations
            </p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              {tournament?.tournament_name ?? "Tournament"}
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
              Attach clubs, schools, colleges, sponsors or hosts to this
              tournament. Choose a committee member or type a representative
              name for the public page.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-8 lg:grid-cols-[430px_1fr]">
            <aside className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Assign Organisation
              </p>

              <div className="mt-6 space-y-4">
                <select
                  value={form.organisation_id}
                  onChange={(event) => {
                    updateField("organisation_id", event.target.value);
                    updateField("representative_member_id", "");
                  }}
                  className={inputClass}
                >
                  <option value="">Select organisation</option>
                  {organisations.map((organisation) => (
                    <option key={organisation.id} value={organisation.id}>
                      {organisation.name}
                    </option>
                  ))}
                </select>

                <input
                  value={form.role}
                  onChange={(event) => updateField("role", event.target.value)}
                  placeholder="Role, e.g. Organiser, Host, Sponsor"
                  className={inputClass}
                />

                <select
                  value={form.representative_member_id}
                  onChange={(event) =>
                    updateField("representative_member_id", event.target.value)
                  }
                  className={inputClass}
                  disabled={!form.organisation_id || availableMembers.length === 0}
                >
                  <option value="">Use manual/default representative</option>
                  {availableMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.full_name}
                      {member.role_title ? ` - ${member.role_title}` : ""}
                      {member.chess_sa_id ? ` - ${member.chess_sa_id}` : ""}
                    </option>
                  ))}
                </select>

                <input
                  value={form.representative_name}
                  onChange={(event) =>
                    updateField("representative_name", event.target.value)
                  }
                  placeholder="Manual representative name"
                  className={inputClass}
                />

                <textarea
                  value={form.notes}
                  onChange={(event) => updateField("notes", event.target.value)}
                  rows={4}
                  placeholder="Public or internal notes"
                  className={inputClass}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={assignOrganisation}
                    disabled={saving}
                    className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    {saving ? "Assigning..." : "Assign Organisation"}
                  </button>
                  <Link
                    href="/admin/organisations"
                    className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Manage Organisations
                  </Link>
                </div>
              </div>
            </aside>

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Assigned
              </p>
              <h2 className="mt-3 text-2xl font-black">
                {assignments.length} organisation
                {assignments.length === 1 ? "" : "s"}
              </h2>

              {assignments.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-400">
                  No organisations assigned yet.
                </p>
              ) : (
                <div className="mt-6 grid gap-4">
                  {assignments.map((assignment) => {
                    const organisation = organisations.find(
                      (item) => item.id === assignment.organisation_id
                    );
                    const member = members.find(
                      (item) => item.id === assignment.representative_member_id
                    );
                    const representative =
                      assignment.representative_name ||
                      member?.full_name ||
                      organisation?.representative_name;

                    return (
                      <article
                        key={assignment.id}
                        className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4">
                            {organisation?.logo_url ? (
                              <img
                                src={organisation.logo_url}
                                alt={`${organisation.name} logo`}
                                className="h-16 w-16 rounded-xl border border-white/10 object-cover"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-xl font-black text-red-200">
                                {(organisation?.name ?? "OR").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div>
                              <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                                {assignment.role}
                              </p>
                              <h3 className="mt-1 text-xl font-black text-white">
                                {organisation?.name ?? "Unknown organisation"}
                              </h3>
                              <p className="mt-1 text-sm text-zinc-400">
                                Representative: {valueOrDash(representative)}
                              </p>
                              {member?.chess_sa_id && (
                                <p className="mt-1 text-xs text-zinc-500">
                                  Chess SA: {member.chess_sa_id}
                                </p>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => removeAssignment(assignment)}
                            className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-bold text-red-200 transition hover:bg-red-500/10"
                          >
                            Remove
                          </button>
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
