"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Organisation = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  description: string | null;
  representative_name: string | null;
};

type CommitteeMember = {
  id: string;
  organisation_id: string;
  player_id: string | null;
  full_name: string;
  chess_sa_id: string | null;
  role_title: string | null;
  display_order: number | null;
};

type OrganisationForm = {
  name: string;
  logo_url: string;
  website_url: string;
  representative_name: string;
  description: string;
};

type CommitteeForm = {
  full_name: string;
  chess_sa_id: string;
  role_title: string;
};

const emptyOrganisationForm: OrganisationForm = {
  name: "",
  logo_url: "",
  website_url: "",
  representative_name: "",
  description: "",
};

const emptyCommitteeForm: CommitteeForm = {
  full_name: "",
  chess_sa_id: "",
  role_title: "",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export default function AdminOrganisationsPage() {
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [members, setMembers] = useState<CommitteeMember[]>([]);
  const [selectedOrganisationId, setSelectedOrganisationId] = useState("");
  const [form, setForm] = useState<OrganisationForm>(emptyOrganisationForm);
  const [memberForm, setMemberForm] = useState<CommitteeForm>(emptyCommitteeForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const selectedOrganisation = useMemo(
    () =>
      organisations.find((organisation) => organisation.id === selectedOrganisationId) ??
      null,
    [organisations, selectedOrganisationId]
  );

  const selectedMembers = useMemo(
    () =>
      members
        .filter((member) => member.organisation_id === selectedOrganisationId)
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)),
    [members, selectedOrganisationId]
  );

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data: organisationData, error: organisationError } = await supabase
      .from("organisations")
      .select("id, name, logo_url, website_url, description, representative_name")
      .order("name", { ascending: true });

    const { data: memberData, error: memberError } = await supabase
      .from("organisation_committee_members")
      .select("id, organisation_id, player_id, full_name, chess_sa_id, role_title, display_order")
      .order("display_order", { ascending: true })
      .order("full_name", { ascending: true });

    if (organisationError) {
      setMessage(`Could not load organisations: ${organisationError.message}`);
    } else if (memberError) {
      setMessage(`Could not load committee members: ${memberError.message}`);
    } else {
      setOrganisations((organisationData ?? []) as unknown as Organisation[]);
      setMembers((memberData ?? []) as unknown as CommitteeMember[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function updateForm(field: keyof OrganisationForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateMemberForm(field: keyof CommitteeForm, value: string) {
    setMemberForm((current) => ({ ...current, [field]: value }));
  }

  function editOrganisation(organisation: Organisation) {
    setSelectedOrganisationId(organisation.id);
    setForm({
      name: organisation.name,
      logo_url: organisation.logo_url ?? "",
      website_url: organisation.website_url ?? "",
      representative_name: organisation.representative_name ?? "",
      description: organisation.description ?? "",
    });
  }

  function resetOrganisationForm() {
    setSelectedOrganisationId("");
    setForm(emptyOrganisationForm);
    setMemberForm(emptyCommitteeForm);
  }

  async function saveOrganisation() {
    const name = form.name.trim();

    if (!name) {
      setMessage("Organisation name is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      name,
      logo_url: form.logo_url.trim() || null,
      website_url: form.website_url.trim() || null,
      representative_name: form.representative_name.trim() || null,
      description: form.description.trim() || null,
      updated_at: new Date().toISOString(),
    };

    if (selectedOrganisationId) {
      const { error } = await supabase
        .from("organisations")
        .update(payload)
        .eq("id", selectedOrganisationId);

      if (error) {
        setMessage(`Could not update organisation: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Organisation updated.");
    } else {
      const { data, error } = await supabase
        .from("organisations")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        setMessage(`Could not create organisation: ${error?.message ?? "Unknown error"}`);
        setSaving(false);
        return;
      }

      setSelectedOrganisationId(data.id as string);
      setMessage("Organisation created.");
    }

    setSaving(false);
    await loadData();
  }

  async function addCommitteeMember() {
    if (!selectedOrganisationId) {
      setMessage("Select or create an organisation first.");
      return;
    }

    const fullName = memberForm.full_name.trim();

    if (!fullName) {
      setMessage("Committee member name is required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const chessSaId = memberForm.chess_sa_id.trim();
    let linkedPlayerId: string | null = null;

    if (chessSaId) {
      const { data: existingPlayer, error: existingPlayerError } = await supabase
        .from("players")
        .select("id")
        .eq("chess_sa_id", chessSaId)
        .maybeSingle();

      if (existingPlayerError) {
        setMessage(`Could not check Player Centre: ${existingPlayerError.message}`);
        setSaving(false);
        return;
      }

      if (existingPlayer?.id) {
        linkedPlayerId = existingPlayer.id as string;
      } else {
        const { data: newPlayer, error: newPlayerError } = await supabase
          .from("players")
          .insert({
            full_name: fullName,
            chess_sa_id: chessSaId,
            title: memberForm.role_title.trim() || null,
            club: selectedOrganisation?.name ?? null,
            verification_status: "Verified",
          })
          .select("id")
          .single();

        if (newPlayerError || !newPlayer) {
          setMessage(
            `Could not create Player Centre profile: ${
              newPlayerError?.message ?? "Unknown error"
            }`
          );
          setSaving(false);
          return;
        }

        linkedPlayerId = newPlayer.id as string;
      }
    }

    const { error } = await supabase.from("organisation_committee_members").insert({
      organisation_id: selectedOrganisationId,
      player_id: linkedPlayerId,
      full_name: fullName,
      chess_sa_id: chessSaId || null,
      role_title: memberForm.role_title.trim() || null,
      display_order: selectedMembers.length + 1,
    });

    if (error) {
      setMessage(`Could not add committee member: ${error.message}`);
      setSaving(false);
      return;
    }

    setMemberForm(emptyCommitteeForm);
    setSaving(false);
    setMessage("Committee member added.");
    await loadData();
  }

  async function removeCommitteeMember(member: CommitteeMember) {
    const confirmed = window.confirm(`Remove ${member.full_name} from this organisation?`);
    if (!confirmed) return;

    const { error } = await supabase
      .from("organisation_committee_members")
      .delete()
      .eq("id", member.id);

    if (error) {
      setMessage(`Could not remove committee member: ${error.message}`);
      return;
    }

    setMessage("Committee member removed.");
    await loadData();
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin/home" className="text-sm font-semibold text-red-300">
            Back to Command Centre
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.22),_transparent_38%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Organisation Centre
            </p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Organisations
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
              Add schools, colleges, clubs, academies and partners with logos
              and committee representatives. Tournament pages can display these
              organisations as event organisers.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-8 lg:grid-cols-[430px_1fr]">
            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  {selectedOrganisationId ? "Edit Organisation" : "New Organisation"}
                </p>

                <div className="mt-6 space-y-4">
                  <input
                    value={form.name}
                    onChange={(event) => updateForm("name", event.target.value)}
                    placeholder="Organisation name"
                    className={inputClass}
                  />
                  <input
                    value={form.logo_url}
                    onChange={(event) => updateForm("logo_url", event.target.value)}
                    placeholder="Logo URL"
                    className={inputClass}
                  />
                  <input
                    value={form.website_url}
                    onChange={(event) => updateForm("website_url", event.target.value)}
                    placeholder="Website URL"
                    className={inputClass}
                  />
                  <input
                    value={form.representative_name}
                    onChange={(event) =>
                      updateForm("representative_name", event.target.value)
                    }
                    placeholder="Default representative name"
                    className={inputClass}
                  />
                  <textarea
                    value={form.description}
                    onChange={(event) => updateForm("description", event.target.value)}
                    rows={4}
                    placeholder="Notes about this organisation"
                    className={inputClass}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={saveOrganisation}
                      disabled={saving}
                      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : selectedOrganisationId ? "Save" : "Create"}
                    </button>
                    <button
                      type="button"
                      onClick={resetOrganisationForm}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Committee
                </p>
                <h2 className="mt-3 text-2xl font-black">
                  {selectedOrganisation?.name ?? "Select organisation"}
                </h2>

                <div className="mt-5 space-y-3">
                  <input
                    value={memberForm.full_name}
                    onChange={(event) =>
                      updateMemberForm("full_name", event.target.value)
                    }
                    placeholder="Committee member name"
                    className={inputClass}
                  />
                  <input
                    value={memberForm.chess_sa_id}
                    onChange={(event) =>
                      updateMemberForm("chess_sa_id", event.target.value)
                    }
                    placeholder="Chess SA ID (optional)"
                    className={inputClass}
                  />
                  <input
                    value={memberForm.role_title}
                    onChange={(event) =>
                      updateMemberForm("role_title", event.target.value)
                    }
                    placeholder="Role, e.g. Chairperson"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={addCommitteeMember}
                    disabled={saving || !selectedOrganisationId}
                    className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                  >
                    Add committee member
                  </button>
                </div>
              </section>
            </aside>

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Directory
                  </p>
                  <h2 className="mt-3 text-2xl font-black">
                    {organisations.length} organisation
                    {organisations.length === 1 ? "" : "s"}
                  </h2>
                </div>
                <Link
                  href="/admin/tournaments"
                  className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Assign to tournament
                </Link>
              </div>

              {loading ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-400">
                  Loading organisations...
                </p>
              ) : organisations.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-400">
                  No organisations created yet.
                </p>
              ) : (
                <div className="mt-6 grid gap-4">
                  {organisations.map((organisation) => {
                    const organisationMembers = members.filter(
                      (member) => member.organisation_id === organisation.id
                    );

                    return (
                      <article
                        key={organisation.id}
                        className={`rounded-2xl border p-5 ${
                          selectedOrganisationId === organisation.id
                            ? "border-red-500/40 bg-red-500/10"
                            : "border-white/10 bg-zinc-950"
                        }`}
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div className="flex items-center gap-4">
                            {organisation.logo_url ? (
                              <img
                                src={organisation.logo_url}
                                alt={`${organisation.name} logo`}
                                className="h-16 w-16 rounded-xl border border-white/10 object-cover"
                              />
                            ) : (
                              <div className="flex h-16 w-16 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-xl font-black text-red-200">
                                {organisation.name.slice(0, 2).toUpperCase()}
                              </div>
                            )}

                            <div>
                              <h3 className="text-xl font-black text-white">
                                {organisation.name}
                              </h3>
                              <p className="mt-1 text-sm text-zinc-400">
                                Default rep: {valueOrDash(organisation.representative_name)}
                              </p>
                              <p className="mt-1 text-xs text-zinc-500">
                                {organisationMembers.length} committee member
                                {organisationMembers.length === 1 ? "" : "s"}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => editOrganisation(organisation)}
                            className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
                          >
                            Edit
                          </button>
                        </div>

                        {selectedOrganisationId === organisation.id && (
                          <div className="mt-5 grid gap-3">
                            {selectedMembers.length === 0 ? (
                              <p className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-500">
                                No committee members added.
                              </p>
                            ) : (
                              selectedMembers.map((member) => (
                                <div
                                  key={member.id}
                                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
                                >
                                  <div>
                                    <p className="font-bold text-white">
                                      {member.full_name}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                      {valueOrDash(member.role_title)}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-500">
                                      Chess SA: {valueOrDash(member.chess_sa_id)}
                                      {member.player_id ? " - Player Centre linked" : ""}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeCommitteeMember(member)}
                                    className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                                  >
                                    Remove
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
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
