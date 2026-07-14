"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import OrganiserGuard, { OrganiserAccess } from "@/components/organiser/OrganiserGuard";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
};

type RegistrationRow = {
  registration_id: string;
  tournament_id?: string | null;
  created_at: string | null;
  payment_status: string | null;
  proof_of_payment_url: string | null;
  registration_status: string | null;
  full_name: string;
  chess_sa_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  email: string | null;
  phone: string | null;
  tournament_name?: string | null;
  section_name: string | null;
};

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

function statusClass(status: string | null) {
  if (status === "Approved" || status === "Paid") return "bg-green-500/10 text-green-300";
  if (status === "Rejected") return "bg-red-500/10 text-red-300";
  if (status === "Proof Submitted") return "bg-purple-500/10 text-purple-300";
  return "bg-yellow-500/10 text-yellow-300";
}

function splitName(fullName: string) {
  const parts = fullName.trim().replace(/\s+/g, " ").split(" ");
  if (parts.length === 1) return { firstName: fullName, surname: "" };
  return {
    firstName: parts.slice(0, -1).join(" "),
    surname: parts.at(-1) ?? "",
  };
}

function normalizeSex(gender: string | null) {
  const value = String(gender ?? "").toLowerCase();
  if (value === "male" || value === "m") return "m";
  if (value === "female" || value === "f") return "f";
  return "";
}

function safeFileName(value: string) {
  return value
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

export default function OrganiserTournamentEntriesPage() {
  return (
    <OrganiserGuard>
      {({ email, isAdmin, access }) => (
        <TournamentEntries email={email} isAdmin={isAdmin} access={access} />
      )}
    </OrganiserGuard>
  );
}

function TournamentEntries({
  email,
  isAdmin,
  access,
}: {
  email: string;
  isAdmin: boolean;
  access: OrganiserAccess[];
}) {
  const params = useParams();
  const router = useRouter();
  const tournamentId = String(params.id ?? "");
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [registrations, setRegistrations] = useState<RegistrationRow[]>([]);
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");

  const allowed = isAdmin || access.some((row) => row.tournament_id === tournamentId);

  async function loadEntries() {
    setLoading(true);
    setMessage("");

    if (!allowed) {
      setMessage("This organiser account is not assigned to this tournament.");
      setLoading(false);
      return;
    }

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

    const { data, error } = await supabase
      .from("registration_details")
      .select("*")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false });

    if (error) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("registration_details")
        .select("*")
        .eq("tournament_name", tournamentData.tournament_name)
        .order("created_at", { ascending: false });

      if (fallbackError) {
        setMessage(`Could not load entries: ${fallbackError.message}`);
      } else {
        setTournament(tournamentData as Tournament);
        setRegistrations((fallbackData ?? []) as unknown as RegistrationRow[]);
      }
    } else {
      setTournament(tournamentData as Tournament);
      setRegistrations((data ?? []) as unknown as RegistrationRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadEntries();
  }, [allowed, tournamentId]);

  const sections = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(
          registrations.map((row) => row.section_name ?? "No section")
        )
      ).sort(),
    ];
  }, [registrations]);

  const filteredRows = useMemo(() => {
    const text = search.trim().toLowerCase();

    return registrations.filter((row) => {
      const sectionName = row.section_name ?? "No section";
      const matchesSearch =
        !text ||
        (row.full_name ?? "").toLowerCase().includes(text) ||
        (row.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (row.email ?? "").toLowerCase().includes(text) ||
        (row.phone ?? "").toLowerCase().includes(text);
      const matchesSection = sectionFilter === "All" || sectionName === sectionFilter;
      const matchesStatus =
        statusFilter === "All" ||
        row.registration_status === statusFilter ||
        row.payment_status === statusFilter;

      return matchesSearch && matchesSection && matchesStatus;
    });
  }, [registrations, search, sectionFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: registrations.length,
      approved: registrations.filter((row) => row.registration_status === "Approved").length,
      paid: registrations.filter((row) => row.payment_status === "Paid").length,
      pending: registrations.filter((row) => row.registration_status === "Pending").length,
    };
  }, [registrations]);

  const allVisibleSelected =
    filteredRows.length > 0 &&
    filteredRows.every((row) =>
      selectedRegistrationIds.includes(row.registration_id)
    );

  function toggleRegistrationSelection(registrationId: string) {
    setSelectedRegistrationIds((current) =>
      current.includes(registrationId)
        ? current.filter((id) => id !== registrationId)
        : [...current, registrationId]
    );
  }

  function toggleAllVisibleRegistrations() {
    const visibleIds = filteredRows.map((row) => row.registration_id);

    if (allVisibleSelected) {
      setSelectedRegistrationIds((current) =>
        current.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedRegistrationIds((current) =>
        Array.from(new Set([...current, ...visibleIds]))
      );
    }
  }

  async function requestRegistrationChanges(
    registrationIds: string[],
    changes: {
      payment_status?: "Pending" | "Proof Submitted" | "Paid" | "Rejected";
      registration_status?: "Pending" | "Approved" | "Rejected" | "Withdrawn";
    }
  ) {
    if (registrationIds.length === 0) {
      setMessage("Select at least one entry first.");
      return;
    }

    setUpdating(true);
    setMessage("");

    const requestRows = registrations
      .filter((row) => registrationIds.includes(row.registration_id))
      .map((row) => ({
        tournament_id: tournamentId,
        registration_id: row.registration_id,
        organiser_email: email,
        requested_payment_status: changes.payment_status ?? null,
        requested_registration_status: changes.registration_status ?? null,
        current_payment_status: row.payment_status,
        current_registration_status: row.registration_status,
      }));

    const { error } = await supabase
      .from("organiser_registration_change_requests")
      .insert(requestRows);

    if (error) {
      setMessage(`Could not submit request: ${error.message}`);
      setUpdating(false);
      return;
    }

    setSelectedRegistrationIds([]);
    setMessage(
      `${registrationIds.length} entr${
        registrationIds.length === 1 ? "y" : "ies"
      } sent to admin for approval.`
    );
    setUpdating(false);
  }

  function exportCsv() {
    const headers = [
      "Full Name",
      "Chess SA ID",
      "DOB",
      "Gender",
      "Rating",
      "Club",
      "Province",
      "Email",
      "Phone",
      "Section",
      "Payment Status",
      "Registration Status",
      "Registered At",
    ];

    const rows = filteredRows.map((row) => [
      row.full_name ?? "",
      row.chess_sa_id ?? "",
      row.date_of_birth ?? "",
      row.gender ?? "",
      row.rating ?? "",
      row.club ?? "",
      row.province ?? "",
      row.email ?? "",
      row.phone ?? "",
      row.section_name ?? "",
      row.payment_status ?? "",
      row.registration_status ?? "",
      row.created_at ?? "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${safeFileName(tournament?.tournament_name ?? "tournament")}-entries.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  function exportSwissManager() {
    const approvedRows = filteredRows.filter(
      (row) => row.registration_status === "Approved"
    );

    if (approvedRows.length === 0) {
      setMessage("No approved entries found in the current filter.");
      return;
    }

    const headers = [
      "No",
      "First Name",
      "Surname",
      "Title",
      "ID no",
      "Rating nat",
      "Rating int",
      "Birth",
      " Fed",
      "Sex",
      "Type",
      "Gr",
      "Clubno",
      "Club",
      "FIDE-No",
      "surname",
      "first name",
      "atitle",
    ];

    const rows = approvedRows.map((row, index) => {
      const name = row.full_name ?? "";
      const { firstName, surname } = splitName(name);
      return [
        index + 1,
        firstName,
        surname,
        "",
        row.chess_sa_id ?? "",
        row.rating ?? "",
        "",
        row.date_of_birth ?? "",
        "RSA",
        normalizeSex(row.gender ?? null),
        "",
        row.section_name ?? "",
        "",
        row.club ?? "",
        "",
        surname,
        firstName,
        "",
      ];
    });

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Exp");
    XLSX.writeFile(
      workbook,
      `${safeFileName(tournament?.tournament_name ?? "tournament")}-approved-entries.xlsx`
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-400">
          Loading entries...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <Link href="/organiser" className="text-sm font-semibold text-red-300">
          Back to organiser portal
        </Link>

        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
              Scoped Tournament Access
            </p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              {tournament?.tournament_name ?? "Tournament entries"}
            </h1>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              {email} can view and export entries for this tournament only.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={exportSwissManager}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Export Approved XLSX
            </button>
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-4">
          <StatCard label="Entries" value={stats.total} />
          <StatCard label="Approved" value={stats.approved} />
          <StatCard label="Paid" value={stats.paid} />
          <StatCard label="Pending" value={stats.pending} />
        </section>

        {message && (
          <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {message}
          </p>
        )}

        <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_220px_220px]">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, Chess SA ID, email or phone..."
              className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
            />
            <select
              value={sectionFilter}
              onChange={(event) => setSectionFilter(event.target.value)}
              className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
            >
              {sections.map((section) => (
                <option key={section} value={section}>
                  {section === "All" ? "All sections" : section}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
            >
              <option value="All">All statuses</option>
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="Paid">Paid</option>
              <option value="Proof Submitted">Proof submitted</option>
            </select>
          </div>
          <p className="mt-3 text-xs text-zinc-500">
            Showing {filteredRows.length} of {registrations.length} entries.
          </p>
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold text-white">Entry requests</p>
              <p className="mt-1 text-sm text-zinc-400">
                {selectedRegistrationIds.length} selected. Changes are sent to admin before they apply.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={toggleAllVisibleRegistrations}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500"
              >
                {allVisibleSelected ? "Unselect visible" : "Select visible"}
              </button>
              <button
                type="button"
                disabled={updating || selectedRegistrationIds.length === 0}
                onClick={() =>
                  requestRegistrationChanges(selectedRegistrationIds, {
                    registration_status: "Approved",
                  })
                }
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Request approval
              </button>
              <button
                type="button"
                disabled={updating || selectedRegistrationIds.length === 0}
                onClick={() =>
                  requestRegistrationChanges(selectedRegistrationIds, {
                    payment_status: "Paid",
                  })
                }
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Request paid
              </button>
              <button
                type="button"
                disabled={updating || selectedRegistrationIds.length === 0}
                onClick={() =>
                  requestRegistrationChanges(selectedRegistrationIds, {
                    registration_status: "Rejected",
                  })
                }
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Request rejection
              </button>
              <button
                type="button"
                disabled={selectedRegistrationIds.length === 0}
                onClick={() => setSelectedRegistrationIds([])}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </section>

        <section className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1260px] text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="p-4">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisibleRegistrations}
                      className="h-4 w-4 accent-red-600"
                      aria-label="Select all visible entries"
                    />
                  </th>
                  <th className="p-4">Player</th>
                  <th className="p-4">Identity</th>
                  <th className="p-4">Section</th>
                  <th className="p-4">Contact</th>
                  <th className="p-4">Payment</th>
                  <th className="p-4">Entry</th>
                  <th className="p-4">Proof</th>
                  <th className="p-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.registration_id} className="border-t border-white/10">
                    <td className="p-4">
                      <input
                        type="checkbox"
                        checked={selectedRegistrationIds.includes(row.registration_id)}
                        onChange={() => toggleRegistrationSelection(row.registration_id)}
                        className="h-4 w-4 accent-red-600"
                        aria-label={`Select ${row.full_name}`}
                      />
                    </td>
                    <td className="p-4">
                      <p className="font-black text-white">
                        {row.full_name ?? "Unknown player"}
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Rating: {valueOrDash(row.rating)}
                      </p>
                    </td>
                    <td className="p-4 text-xs text-zinc-400">
                      Chess SA: {valueOrDash(row.chess_sa_id)}
                      <br />
                      DOB: {valueOrDash(row.date_of_birth)}
                      <br />
                      Gender: {valueOrDash(row.gender)}
                    </td>
                    <td className="p-4 text-zinc-300">
                      {row.section_name ?? "No section"}
                    </td>
                    <td className="p-4 text-xs text-zinc-400">
                      {valueOrDash(row.email)}
                      <br />
                      {valueOrDash(row.phone)}
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(row.payment_status)}`}>
                        {row.payment_status ?? "Pending"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(row.registration_status)}`}>
                        {row.registration_status ?? "Pending"}
                      </span>
                    </td>
                    <td className="p-4">
                      {row.proof_of_payment_url ? (
                        <span className="text-xs text-green-300">Uploaded</span>
                      ) : (
                        <span className="text-xs text-zinc-500">None</span>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                  disabled={updating}
                  onClick={() =>
                    requestRegistrationChanges([row.registration_id], {
                      registration_status: "Approved",
                    })
                  }
                          className="rounded-lg bg-green-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                        >
                  Ask approve
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() =>
                    requestRegistrationChanges([row.registration_id], {
                      payment_status: "Paid",
                    })
                  }
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                  Ask paid
                </button>
                <button
                  type="button"
                  disabled={updating}
                  onClick={() =>
                    requestRegistrationChanges([row.registration_id], {
                      registration_status: "Rejected",
                    })
                  }
                          className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                        >
                  Ask reject
                </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredRows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-zinc-400">
                      No entries match the current filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-zinc-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
