"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "@/components/AdminGuard";
import * as XLSX from "xlsx";

type RegistrationDetail = {
  registration_id: string;
  created_at: string;
  payment_status: "Pending" | "Proof Submitted" | "Paid" | "Rejected" | string;
  proof_of_payment_url: string | null;
  registration_status:
    | "Pending"
    | "Approved"
    | "Rejected"
    | "Withdrawn"
    | string;
  full_name: string;
  chess_sa_id: string | null;
  date_of_birth: string | null;
  gender: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  email: string;
  phone: string;
  tournament_name: string;
  start_date: string;
  venue: string;
  section_name: string | null;
};

type StatusTab =
  | "All"
  | "Pending"
  | "Approved"
  | "Rejected"
  | "Paid"
  | "Awaiting Payment";

function formatDate(date: string | null) {
  if (!date) return "N/A";

  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status: string) {
  if (status === "Approved" || status === "Paid") {
    return "bg-green-500/10 text-green-200";
  }

  if (status === "Rejected") {
    return "bg-red-500/10 text-red-200";
  }

  if (status === "Proof Submitted") {
    return "bg-purple-500/10 text-purple-200";
  }

  return "bg-yellow-500/10 text-yellow-200";
}

export default function RegistrationsPage() {
  const [registrations, setRegistrations] = useState<RegistrationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [selectedRegistration, setSelectedRegistration] =
    useState<RegistrationDetail | null>(null);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);

  async function loadRegistrations() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("registration_details")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(`Could not load registrations: ${error.message}`);
    } else {
      setRegistrations((data ?? []) as RegistrationDetail[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRegistrations();
  }, []);

  const tournaments = useMemo(() => {
    return Array.from(
      new Set(registrations.map((item) => item.tournament_name))
    ).sort();
  }, [registrations]);

  const sections = useMemo(() => {
    return Array.from(
      new Set(
        registrations
          .filter(
            (item) =>
              tournamentFilter === "All" ||
              item.tournament_name === tournamentFilter
          )
          .map((item) => item.section_name ?? "No section")
      )
    ).sort();
  }, [registrations, tournamentFilter]);

  const stats = useMemo(() => {
    return {
      all: registrations.length,
      pending: registrations.filter((item) => item.registration_status === "Pending")
        .length,
      approved: registrations.filter(
        (item) => item.registration_status === "Approved"
      ).length,
      rejected: registrations.filter(
        (item) => item.registration_status === "Rejected"
      ).length,
      paid: registrations.filter((item) => item.payment_status === "Paid").length,
      awaitingPayment: registrations.filter(
        (item) => item.payment_status !== "Paid"
      ).length,
    };
  }, [registrations]);

  const filteredRegistrations = registrations.filter((item) => {
    const searchText = search.toLowerCase();

    const matchesSearch =
      item.full_name.toLowerCase().includes(searchText) ||
      item.chess_sa_id?.toLowerCase().includes(searchText) ||
      item.email.toLowerCase().includes(searchText) ||
      item.phone.toLowerCase().includes(searchText);

    const matchesTournament =
      tournamentFilter === "All" || item.tournament_name === tournamentFilter;

    const matchesSection =
      sectionFilter === "All" ||
      (item.section_name ?? "No section") === sectionFilter;

    const matchesTab =
      activeTab === "All" ||
      (activeTab === "Pending" && item.registration_status === "Pending") ||
      (activeTab === "Approved" && item.registration_status === "Approved") ||
      (activeTab === "Rejected" && item.registration_status === "Rejected") ||
      (activeTab === "Paid" && item.payment_status === "Paid") ||
      (activeTab === "Awaiting Payment" && item.payment_status !== "Paid");

    return matchesSearch && matchesTournament && matchesSection && matchesTab;
  });

  function toggleRegistrationSelection(registrationId: string) {
    setSelectedRegistrationIds((current) =>
      current.includes(registrationId)
        ? current.filter((id) => id !== registrationId)
        : [...current, registrationId]
    );
  }

  function toggleAllVisibleRegistrations() {
    const visibleIds = filteredRegistrations.map((item) => item.registration_id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedRegistrationIds.includes(id));

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

  async function batchUpdateRegistrations(changes: {
    payment_status?: "Pending" | "Proof Submitted" | "Paid" | "Rejected";
    registration_status?: "Pending" | "Approved" | "Rejected" | "Withdrawn";
  }) {
    if (selectedRegistrationIds.length === 0) {
      setMessage("Select at least one registration first.");
      return;
    }

    setUpdating(true);
    setMessage("");

    const { error } = await supabase.rpc(
      "admin_batch_update_registration_status",
      {
        p_registration_ids: selectedRegistrationIds,
        p_payment_status: changes.payment_status ?? null,
        p_registration_status: changes.registration_status ?? null,
      }
    );

    if (error) {
      setMessage(`Could not batch update registrations: ${error.message}`);
      setUpdating(false);
      return;
    }

    await loadRegistrations();
    setSelectedRegistrationIds([]);
    setUpdating(false);
  }

  async function updateRegistration(
    registrationId: string,
    changes: {
      payment_status?: "Pending" | "Proof Submitted" | "Paid" | "Rejected";
      registration_status?: "Pending" | "Approved" | "Rejected" | "Withdrawn";
    }
  ) {
    setUpdating(true);
    setMessage("");

    const { error } = await supabase.rpc("admin_update_registration_status", {
      p_registration_id: registrationId,
      p_payment_status: changes.payment_status ?? null,
      p_registration_status: changes.registration_status ?? null,
    });

    if (error) {
      setMessage(`Could not update registration: ${error.message}`);
      setUpdating(false);
      return;
    }

    await loadRegistrations();

    setSelectedRegistration((current) =>
      current?.registration_id === registrationId
        ? { ...current, ...changes }
        : current
    );

    setUpdating(false);
  }

  function splitName(fullName: string) {
    const cleanName = fullName.trim().replace(/\s+/g, " ");
    const parts = cleanName.split(" ");

    if (parts.length === 1) {
      return {
        firstName: cleanName,
        surname: "",
      };
    }

    return {
      firstName: parts.slice(0, -1).join(" "),
      surname: parts[parts.length - 1],
    };
  }

  function normalizeSex(gender: string | null) {
    if (!gender) return "";

    const value = gender.toLowerCase();

    if (value === "m" || value === "male") return "m";
    if (value === "f" || value === "female") return "f";

    return "";
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
      "Tournament",
      "Section",
      "Payment Status",
      "Registration Status",
      "Registered At",
    ];

    const rows = filteredRegistrations.map((item) => [
      item.full_name,
      item.chess_sa_id ?? "",
      item.date_of_birth ?? "",
      item.gender ?? "",
      item.rating ?? "",
      item.club ?? "",
      item.province ?? "",
      item.email,
      item.phone,
      item.tournament_name,
      item.section_name ?? "",
      item.payment_status,
      item.registration_status,
      item.created_at,
    ]);

    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "pcc-registrations.csv";
    link.click();

    URL.revokeObjectURL(url);
  }

  function buildSwissManagerWorkbook(players: RegistrationDetail[], sheetName = "Exp") {
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

    const rows = players.map((item, index) => {
      const { firstName, surname } = splitName(item.full_name);

      return [
        index + 1,
        firstName,
        surname,
        "",
        item.chess_sa_id ?? "",
        item.rating ?? "",
        "",
        item.date_of_birth ?? "",
        "RSA",
        normalizeSex(item.gender),
        "",
        item.section_name ?? "",
        "",
        item.club ?? "",
        "",
        surname,
        firstName,
        "",
      ];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 22 },
      { wch: 18 },
      { wch: 10 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 8 },
      { wch: 10 },
      { wch: 10 },
      { wch: 22 },
      { wch: 14 },
      { wch: 18 },
      { wch: 22 },
      { wch: 10 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    return workbook;
  }

  function safeFileName(value: string) {
    return value
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  function exportSwissManagerXlsx() {
    const approvedPlayers = filteredRegistrations.filter(
      (item) => item.registration_status === "Approved"
    );

    if (approvedPlayers.length === 0) {
      setMessage("No approved players found in the current filter.");
      return;
    }

    const workbook = buildSwissManagerWorkbook(approvedPlayers);
    XLSX.writeFile(workbook, "swiss-manager-approved-players.xlsx");
  }

  function exportEachSectionSeparately() {
    const approvedPlayers = filteredRegistrations.filter(
      (item) => item.registration_status === "Approved"
    );

    if (approvedPlayers.length === 0) {
      setMessage("No approved players found in the current filter.");
      return;
    }

    const groupedBySection = approvedPlayers.reduce<Record<string, RegistrationDetail[]>>(
      (groups, player) => {
        const sectionName = player.section_name ?? "No section";

        if (!groups[sectionName]) {
          groups[sectionName] = [];
        }

        groups[sectionName].push(player);
        return groups;
      },
      {}
    );

    Object.entries(groupedBySection).forEach(([sectionName, players]) => {
      const workbook = buildSwissManagerWorkbook(players);
      const tournamentPart =
        tournamentFilter === "All"
          ? "all-tournaments"
          : safeFileName(tournamentFilter);
      const sectionPart = safeFileName(sectionName);

      XLSX.writeFile(
        workbook,
        `swiss-manager-${tournamentPart}-${sectionPart}.xlsx`
      );
    });

    setMessage(
      `Exported ${Object.keys(groupedBySection).length} section file(s).`
    );
  }

  const tabs: { label: StatusTab; count: number }[] = [
    { label: "All", count: stats.all },
    { label: "Pending", count: stats.pending },
    { label: "Approved", count: stats.approved },
    { label: "Rejected", count: stats.rejected },
    { label: "Paid", count: stats.paid },
    { label: "Awaiting Payment", count: stats.awaitingPayment },
  ];

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-6 pb-16 pt-28 text-white">
      <div className="mx-auto max-w-7xl">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
          PCC Admin
        </p>

        <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-bold">Tournament Registrations</h1>
            <p className="mt-3 text-gray-400">
              Review entries, approve players, verify payments and export lists.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={exportCsv}
              className="rounded-lg border border-white/10 bg-zinc-900 px-5 py-3 font-semibold text-white transition hover:border-red-500"
            >
              Export Full CSV
            </button>

            <button
              type="button"
              onClick={exportSwissManagerXlsx}
              className="rounded-lg bg-red-600 px-5 py-3 font-semibold text-white transition hover:bg-red-700"
            >
              Export Current Filter
            </button>

            <button
              type="button"
              onClick={exportEachSectionSeparately}
              className="rounded-lg bg-green-600 px-5 py-3 font-semibold text-white transition hover:bg-green-700"
            >
              Export Each Section
            </button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Total entries</p>
            <p className="mt-2 text-3xl font-bold">{stats.all}</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Approved</p>
            <p className="mt-2 text-3xl font-bold text-green-300">
              {stats.approved}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Pending</p>
            <p className="mt-2 text-3xl font-bold text-yellow-300">
              {stats.pending}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Paid</p>
            <p className="mt-2 text-3xl font-bold text-green-300">
              {stats.paid}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setActiveTab(tab.label)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.label
                  ? "bg-red-600 text-white"
                  : "bg-zinc-900 text-gray-300 hover:bg-zinc-800"
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, Chess SA ID, email or phone..."
            className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
          />

          <select
            value={tournamentFilter}
            onChange={(event) => {
              setTournamentFilter(event.target.value);
              setSectionFilter("All");
            }}
            className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-red-500"
          >
            <option value="All">All tournaments</option>
            {tournaments.map((tournament) => (
              <option key={tournament} value={tournament}>
                {tournament}
              </option>
            ))}
          </select>

          <select
            value={sectionFilter}
            onChange={(event) => setSectionFilter(event.target.value)}
            className="rounded-lg border border-white/10 bg-zinc-900 px-4 py-3 text-white outline-none transition focus:border-red-500"
          >
            <option value="All">All sections</option>
            {sections.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="font-semibold">Batch actions</p>
              <p className="mt-1 text-sm text-gray-400">
                {selectedRegistrationIds.length} registration
                {selectedRegistrationIds.length === 1 ? "" : "s"} selected
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={toggleAllVisibleRegistrations}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500"
              >
                Select visible
              </button>

              <button
                type="button"
                onClick={() =>
                  batchUpdateRegistrations({ registration_status: "Approved" })
                }
                disabled={updating || selectedRegistrationIds.length === 0}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Approve selected
              </button>

              <button
                type="button"
                onClick={() => batchUpdateRegistrations({ payment_status: "Paid" })}
                disabled={updating || selectedRegistrationIds.length === 0}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Mark selected paid
              </button>

              <button
                type="button"
                onClick={() =>
                  batchUpdateRegistrations({ registration_status: "Rejected" })
                }
                disabled={updating || selectedRegistrationIds.length === 0}
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Reject selected
              </button>

              <button
                type="button"
                onClick={() => setSelectedRegistrationIds([])}
                disabled={selectedRegistrationIds.length === 0}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        </div>

        {message && (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-gray-400">Loading registrations...</p>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10">
                  <thead className="bg-zinc-900">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        <input
                          type="checkbox"
                          checked={
                            filteredRegistrations.length > 0 &&
                            filteredRegistrations.every((item) =>
                              selectedRegistrationIds.includes(item.registration_id)
                            )
                          }
                          onChange={toggleAllVisibleRegistrations}
                          className="h-4 w-4 accent-red-600"
                          aria-label="Select all visible registrations"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Player
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Tournament
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-white/10 bg-zinc-950">
                    {filteredRegistrations.map((item) => (
                      <tr
                        key={item.registration_id}
                        className={
                          selectedRegistration?.registration_id ===
                          item.registration_id
                            ? "bg-red-600/10"
                            : ""
                        }
                      >
                        <td className="px-4 py-4 align-top">
                          <input
                            type="checkbox"
                            checked={selectedRegistrationIds.includes(
                              item.registration_id
                            )}
                            onChange={() =>
                              toggleRegistrationSelection(item.registration_id)
                            }
                            className="h-4 w-4 accent-red-600"
                            aria-label={`Select ${item.full_name}`}
                          />
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold">{item.full_name}</p>
                          <p className="mt-1 text-sm text-gray-400">
                            Chess SA: {item.chess_sa_id ?? "N/A"}
                          </p>
                          <p className="text-sm text-gray-400">
                            Rating: {item.rating ?? "N/A"}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p className="font-semibold">{item.tournament_name}</p>
                          <p className="mt-1 text-sm text-gray-400">
                            {item.section_name ?? "No section"}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <p
                            className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              item.payment_status
                            )}`}
                          >
                            Payment: {item.payment_status}
                          </p>
                          <p
                            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                              item.registration_status
                            )}`}
                          >
                            Entry: {item.registration_status}
                          </p>
                        </td>

                        <td className="px-4 py-4 align-top">
                          <button
                            type="button"
                            onClick={() => setSelectedRegistration(item)}
                            className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredRegistrations.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-10 text-center text-gray-400"
                        >
                          No registrations found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
              {selectedRegistration ? (
                <>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Review Entry
                  </p>

                  <h2 className="mt-3 text-2xl font-bold">
                    {selectedRegistration.full_name}
                  </h2>

                  <div className="mt-5 space-y-3 text-sm text-gray-300">
                    <p>
                      <span className="font-semibold text-white">
                        Chess SA ID:
                      </span>{" "}
                      {selectedRegistration.chess_sa_id ?? "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Rating:</span>{" "}
                      {selectedRegistration.rating ?? "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">DOB:</span>{" "}
                      {formatDate(selectedRegistration.date_of_birth)}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Gender:</span>{" "}
                      {selectedRegistration.gender ?? "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Club:</span>{" "}
                      {selectedRegistration.club ?? "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Province:</span>{" "}
                      {selectedRegistration.province ?? "N/A"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Email:</span>{" "}
                      {selectedRegistration.email}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Phone:</span>{" "}
                      {selectedRegistration.phone}
                    </p>
                  </div>

                  <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-gray-300">
                    <p className="font-semibold text-white">
                      {selectedRegistration.tournament_name}
                    </p>
                    <p className="mt-2">
                      Section: {selectedRegistration.section_name ?? "No section"}
                    </p>
                    <p className="mt-1">Venue: {selectedRegistration.venue}</p>
                    <p className="mt-1">
                      Registered: {formatDate(selectedRegistration.created_at)}
                    </p>
                  </div>

                  <div className="mt-6 space-y-3">
                    <button
                      type="button"
                      disabled={updating}
                      onClick={() =>
                        updateRegistration(selectedRegistration.registration_id, {
                          registration_status: "Approved",
                        })
                      }
                      className="w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                    >
                      Approve Registration
                    </button>

                    <button
                      type="button"
                      disabled={updating}
                      onClick={() =>
                        updateRegistration(selectedRegistration.registration_id, {
                          payment_status: "Paid",
                        })
                      }
                      className="w-full rounded-lg bg-blue-600 px-4 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                    >
                      Mark Paid
                    </button>

                    <button
                      type="button"
                      disabled={updating}
                      onClick={() =>
                        updateRegistration(selectedRegistration.registration_id, {
                          payment_status: "Rejected",
                        })
                      }
                      className="w-full rounded-lg border border-yellow-500/40 px-4 py-3 font-semibold text-yellow-200 transition hover:bg-yellow-500/10 disabled:opacity-60"
                    >
                      Reject Payment
                    </button>

                    <button
                      type="button"
                      disabled={updating}
                      onClick={() =>
                        updateRegistration(selectedRegistration.registration_id, {
                          registration_status: "Rejected",
                        })
                      }
                      className="w-full rounded-lg border border-red-500/40 px-4 py-3 font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
                    >
                      Reject Registration
                    </button>
                  </div>

                  {selectedRegistration.proof_of_payment_url && (
                    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm">
                      <p className="font-semibold text-white">
                        Proof of payment path
                      </p>
                      <p className="mt-2 break-all text-gray-400">
                        {selectedRegistration.proof_of_payment_url}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex min-h-96 items-center justify-center text-center text-gray-400">
                  Select a registration to review player details and actions.
                </div>
              )}
            </aside>
          </div>
        )}
      </div>
      </main>
    </AdminGuard>
  );
}
