"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import AdminGuard from "@/components/AdminGuard";
import * as XLSX from "xlsx";
import {
  buildSwissTeamTieBreakTextFiles,
  buildTournamentWorkbook,
  tournamentExportFilePart,
  tournamentExportFormats,
  TournamentExportFormat,
} from "@/lib/tournamentExports";

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
  | "Proof Submitted"
  | "Approved"
  | "Rejected"
  | "Paid"
  | "Awaiting Payment"
  | "Approved Unpaid";

type SortOption =
  | "Newest first"
  | "Oldest first"
  | "Player A-Z"
  | "Tournament A-Z"
  | "Highest rating";

type EventMode = "Normal tournament" | "Big event";

const pageSizeOptions = [25, 50, 100, 200] as const;
const exportBatchSize = 1000;

type RegistrationStats = {
  all: number;
  pending: number;
  proofSubmitted: number;
  approved: number;
  rejected: number;
  paid: number;
  awaitingPayment: number;
  approvedAwaitingPayment: number;
};

const emptyStats: RegistrationStats = {
  all: 0,
  pending: 0,
  proofSubmitted: 0,
  approved: 0,
  rejected: 0,
  paid: 0,
  awaitingPayment: 0,
  approvedAwaitingPayment: 0,
};

function formatDate(date: string | null) {
  if (!date) return "Not recorded";

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

function proofPaymentHref(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  return null;
}

export default function RegistrationsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading registrations...
          </div>
        </main>
      }
    >
      <RegistrationsPageContent />
    </Suspense>
  );
}

function RegistrationsPageContent() {
  const searchParams = useSearchParams();
  const requestedTournament = searchParams.get("tournament");
  const [registrations, setRegistrations] = useState<RegistrationDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [activeTab, setActiveTab] = useState<StatusTab>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Newest first");
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [eventMode, setEventMode] = useState<EventMode>("Big event");
  const [selectedRegistration, setSelectedRegistration] =
    useState<RegistrationDetail | null>(null);
  const [selectedRegistrationIds, setSelectedRegistrationIds] = useState<string[]>([]);
  const [updating, setUpdating] = useState(false);
  const [exportFormat, setExportFormat] =
    useState<TournamentExportFormat>("swiss");
  const [stats, setStats] = useState<RegistrationStats>(emptyStats);
  const [totalCount, setTotalCount] = useState(0);
  const [tournaments, setTournaments] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);

  function applyBaseFilters(query: any) {
    let filteredQuery = query;
    const searchText = search.trim().replace(/[,%]/g, " ");

    if (tournamentFilter !== "All") {
      filteredQuery = filteredQuery.eq("tournament_name", tournamentFilter);
    }

    if (sectionFilter === "No section") {
      filteredQuery = filteredQuery.is("section_name", null);
    } else if (sectionFilter !== "All") {
      filteredQuery = filteredQuery.eq("section_name", sectionFilter);
    }

    if (searchText) {
      const pattern = `%${searchText}%`;
      filteredQuery = filteredQuery.or(
        [
          `full_name.ilike.${pattern}`,
          `chess_sa_id.ilike.${pattern}`,
          `email.ilike.${pattern}`,
          `phone.ilike.${pattern}`,
          `tournament_name.ilike.${pattern}`,
          `section_name.ilike.${pattern}`,
        ].join(",")
      );
    }

    return filteredQuery;
  }

  function applyStatusFilter(query: any, tab: StatusTab) {
    if (tab === "Pending") return query.eq("registration_status", "Pending");
    if (tab === "Proof Submitted") return query.eq("payment_status", "Proof Submitted");
    if (tab === "Approved") return query.eq("registration_status", "Approved");
    if (tab === "Rejected") return query.eq("registration_status", "Rejected");
    if (tab === "Paid") return query.eq("payment_status", "Paid");
    if (tab === "Awaiting Payment") return query.not("payment_status", "eq", "Paid");
    if (tab === "Approved Unpaid") {
      return query
        .eq("registration_status", "Approved")
        .not("payment_status", "eq", "Paid");
    }

    return query;
  }

  function applySort(query: any) {
    if (sortBy === "Oldest first") {
      return query.order("created_at", { ascending: true });
    }

    if (sortBy === "Player A-Z") {
      return query.order("full_name", { ascending: true });
    }

    if (sortBy === "Tournament A-Z") {
      return query
        .order("tournament_name", { ascending: true })
        .order("section_name", { ascending: true, nullsFirst: false })
        .order("full_name", { ascending: true });
    }

    if (sortBy === "Highest rating") {
      return query.order("rating", { ascending: false, nullsFirst: false });
    }

    return query.order("created_at", { ascending: false });
  }

  async function countForTab(tab: StatusTab) {
    const query = applyStatusFilter(
      applyBaseFilters(
        supabase
          .from("registration_details")
          .select("registration_id", { count: "exact", head: true })
      ),
      tab
    );

    const { count, error } = await query;
    if (error) throw error;
    return count ?? 0;
  }

  async function loadStats() {
    const [
      all,
      pending,
      proofSubmitted,
      approved,
      rejected,
      paid,
      awaitingPayment,
      approvedAwaitingPayment,
    ] = await Promise.all([
      countForTab("All"),
      countForTab("Pending"),
      countForTab("Proof Submitted"),
      countForTab("Approved"),
      countForTab("Rejected"),
      countForTab("Paid"),
      countForTab("Awaiting Payment"),
      countForTab("Approved Unpaid"),
    ]);

    setStats({
      all,
      pending,
      proofSubmitted,
      approved,
      rejected,
      paid,
      awaitingPayment,
      approvedAwaitingPayment,
    });
  }

  async function loadFilterOptions() {
    const { data, error } = await supabase
      .from("registration_details")
      .select("tournament_name, section_name")
      .order("tournament_name", { ascending: true })
      .range(0, 9999);

    if (error) {
      setMessage(`Could not load registration filters: ${error.message}`);
      return;
    }

    const optionRows = (data ?? []) as Pick<
      RegistrationDetail,
      "tournament_name" | "section_name"
    >[];

    setTournaments(
      Array.from(new Set(optionRows.map((item) => item.tournament_name))).sort()
    );
  }

  async function loadSectionsForTournament() {
    let query = supabase.from("registration_details").select("section_name");

    if (tournamentFilter !== "All") {
      query = query.eq("tournament_name", tournamentFilter);
    }

    const { data, error } = await query.order("section_name", {
      ascending: true,
      nullsFirst: false,
    }).range(0, 9999);

    if (error) {
      setMessage(`Could not load sections: ${error.message}`);
      return;
    }

    setSections(
      Array.from(
        new Set(
          ((data ?? []) as Pick<RegistrationDetail, "section_name">[]).map(
            (item) => item.section_name ?? "No section"
          )
        )
      ).sort()
    );
  }

  async function loadRegistrations() {
    setLoading(true);
    setMessage("");

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize - 1;
    const query = applySort(
      applyStatusFilter(
        applyBaseFilters(
          supabase
            .from("registration_details")
            .select("*", { count: "exact" })
        ),
        activeTab
      )
    ).range(start, end);

    const [{ data, error, count }, statsResult] = await Promise.all([
      query,
      loadStats().then(
        () => ({ error: null }),
        (error) => ({ error })
      ),
    ]);

    if (error) {
      setMessage(`Could not load registrations: ${error.message}`);
    } else if (statsResult.error) {
      setMessage(`Could not load registration counts: ${statsResult.error.message}`);
      setRegistrations((data ?? []) as unknown as RegistrationDetail[]);
      setTotalCount(count ?? 0);
    } else {
      setRegistrations((data ?? []) as unknown as RegistrationDetail[]);
      setTotalCount(count ?? 0);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadFilterOptions();
  }, []);

  useEffect(() => {
    if (requestedTournament) {
      setTournamentFilter(requestedTournament);
      setSectionFilter("All");
    }
  }, [requestedTournament]);

  useEffect(() => {
    loadSectionsForTournament();
  }, [tournamentFilter]);

  useEffect(() => {
    loadRegistrations();
  }, [activeTab, currentPage, pageSize, search, sectionFilter, sortBy, tournamentFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRegistrationIds([]);
  }, [activeTab, pageSize, search, sectionFilter, sortBy, tournamentFilter]);

  useEffect(() => {
    setPageSize(eventMode === "Big event" ? 50 : 200);
    setCurrentPage(1);
    setSelectedRegistrationIds([]);
  }, [eventMode]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPageRegistrations = registrations;

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const selectedRegistrations = useMemo(() => {
    const selectedIds = new Set(selectedRegistrationIds);
    return registrations.filter((item) => selectedIds.has(item.registration_id));
  }, [registrations, selectedRegistrationIds]);

  const visibleApprovedCount = stats.approved;
  const displayStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const displayEnd = Math.min(currentPage * pageSize, totalCount);

  function resetFilters() {
    setSearch("");
    setTournamentFilter("All");
    setSectionFilter("All");
    setActiveTab("All");
    setSortBy("Newest first");
  }

  function toggleRegistrationSelection(registrationId: string) {
    setSelectedRegistrationIds((current) =>
      current.includes(registrationId)
        ? current.filter((id) => id !== registrationId)
        : [...current, registrationId]
    );
  }

  function toggleAllVisibleRegistrations() {
    const visibleIds = currentPageRegistrations.map((item) => item.registration_id);
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

  async function deleteRegistration(registration: RegistrationDetail) {
    const confirmed = window.confirm(
      `Delete registration for "${registration.full_name}"?\n\nTournament: ${
        registration.tournament_name
      }\nSection: ${
        registration.section_name ?? "No section"
      }\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setUpdating(true);
    setMessage("");

    const { error } = await supabase.rpc("admin_delete_registration", {
      p_registration_id: registration.registration_id,
    });

    if (error) {
      setMessage(`Could not delete registration: ${error.message}`);
      setUpdating(false);
      return;
    }

    setSelectedRegistration(null);
    setSelectedRegistrationIds((current) =>
      current.filter((id) => id !== registration.registration_id)
    );

    await loadRegistrations();
    setMessage(`Deleted registration for ${registration.full_name}.`);
    setUpdating(false);
  }

  async function deleteSelectedRegistrations() {
    if (selectedRegistrationIds.length === 0) {
      setMessage("Select at least one registration first.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${selectedRegistrationIds.length} selected registration${
        selectedRegistrationIds.length === 1 ? "" : "s"
      }?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    setUpdating(true);
    setMessage("");

    const selectedIds = [...selectedRegistrationIds];

    for (const registrationId of selectedIds) {
      const { error } = await supabase.rpc("admin_delete_registration", {
        p_registration_id: registrationId,
      });

      if (error) {
        setMessage(`Could not delete selected registrations: ${error.message}`);
        setUpdating(false);
        return;
      }
    }

    setSelectedRegistration((current) =>
      current && selectedIds.includes(current.registration_id) ? null : current
    );
    setSelectedRegistrationIds([]);

    await loadRegistrations();
    setMessage(
      `Deleted ${selectedIds.length} selected registration${
        selectedIds.length === 1 ? "" : "s"
      }.`
    );
    setUpdating(false);
  }

  async function fetchAllFilteredRegistrations() {
    const allRows: RegistrationDetail[] = [];
    let from = 0;

    while (true) {
      const to = from + exportBatchSize - 1;
      const query = applySort(
        applyStatusFilter(
          applyBaseFilters(supabase.from("registration_details").select("*")),
          activeTab
        )
      ).range(from, to);

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      const rows = (data ?? []) as unknown as RegistrationDetail[];
      allRows.push(...rows);

      if (rows.length < exportBatchSize) {
        break;
      }

      from += exportBatchSize;
    }

    return allRows;
  }

  async function exportCsv() {
    setMessage("");

    let exportRows: RegistrationDetail[] = [];

    try {
      exportRows = await fetchAllFilteredRegistrations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error.";
      setMessage(`Could not export registrations: ${errorMessage}`);
      return;
    }

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

    const rows = exportRows.map((item) => [
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

  function safeFileName(value: string) {
    return value
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  function downloadTextFile(fileName: string, content: string) {
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function exportSwissManagerXlsx() {
    setMessage("");

    let exportRows: RegistrationDetail[] = [];

    try {
      exportRows = await fetchAllFilteredRegistrations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error.";
      setMessage(`Could not export approved players: ${errorMessage}`);
      return;
    }

    const approvedPlayers = exportRows.filter(
      (item) => item.registration_status === "Approved"
    );

    if (approvedPlayers.length === 0) {
      setMessage("No approved players found in the current filter.");
      return;
    }

    if (exportFormat === "team-tiebreaks") {
      buildSwissTeamTieBreakTextFiles(
        approvedPlayers,
        tournamentExportFilePart(exportFormat)
      ).forEach((file) => downloadTextFile(file.fileName, file.content));
      return;
    }

    const workbook = buildTournamentWorkbook(approvedPlayers, exportFormat);
    XLSX.writeFile(
      workbook,
      `${tournamentExportFilePart(exportFormat)}-approved-players.xlsx`
    );
  }

  async function exportEachSectionSeparately() {
    setMessage("");

    let exportRows: RegistrationDetail[] = [];

    try {
      exportRows = await fetchAllFilteredRegistrations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error.";
      setMessage(`Could not export section files: ${errorMessage}`);
      return;
    }

    const approvedPlayers = exportRows.filter(
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
      const tournamentPart =
        tournamentFilter === "All"
          ? "all-tournaments"
          : safeFileName(tournamentFilter);
      const sectionPart = safeFileName(sectionName);
      const baseFileName = `${tournamentExportFilePart(exportFormat)}-${tournamentPart}-${sectionPart}`;

      if (exportFormat === "team-tiebreaks") {
        buildSwissTeamTieBreakTextFiles(players, baseFileName).forEach((file) =>
          downloadTextFile(file.fileName, file.content)
        );
        return;
      }

      const workbook = buildTournamentWorkbook(players, exportFormat);

      XLSX.writeFile(
        workbook,
        `${baseFileName}.xlsx`
      );
    });

    setMessage(
      `Exported ${Object.keys(groupedBySection).length} section file(s).`
    );
  }

  const tabs: { label: StatusTab; count: number }[] = [
    { label: "All", count: stats.all },
    { label: "Pending", count: stats.pending },
    { label: "Proof Submitted", count: stats.proofSubmitted },
    { label: "Approved", count: stats.approved },
    { label: "Rejected", count: stats.rejected },
    { label: "Paid", count: stats.paid },
    { label: "Awaiting Payment", count: stats.awaitingPayment },
    { label: "Approved Unpaid", count: stats.approvedAwaitingPayment },
  ];

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            PCC Admin
          </p>

          <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold md:text-4xl">
                Tournament Registrations
              </h1>
              <p className="mt-3 text-gray-400">
                Review entries, verify payments, and prepare event exports from one queue.
              </p>
            </div>

            <button
              type="button"
              onClick={loadRegistrations}
              className="rounded-lg border border-white/10 bg-zinc-900 px-5 py-3 font-semibold text-white transition hover:border-red-500"
            >
              Refresh
            </button>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Navigation mode
                </p>
                <p className="mt-2 text-sm text-gray-400">
                  Use normal mode for smaller club events, or big event mode when
                  entries can climb into the hundreds or thousands.
                </p>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:min-w-[520px]">
                {(["Normal tournament", "Big event"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setEventMode(mode)}
                    className={`rounded-lg border p-4 text-left transition ${
                      eventMode === mode
                        ? "border-red-500 bg-red-600 text-white"
                        : "border-white/10 bg-zinc-950 text-gray-300 hover:border-red-500/60"
                    }`}
                  >
                    <span className="font-bold">{mode}</span>
                    <span className="mt-1 block text-xs leading-5 opacity-80">
                      {mode === "Normal tournament"
                        ? "Wide list, fewer controls, faster review for smaller fields."
                        : "Paged command centre with tight queues for national-scale entries."}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
              <p className="text-sm text-gray-400">Total entries</p>
              <p className="mt-2 text-3xl font-bold">{stats.all}</p>
            </div>

            <button
              type="button"
              onClick={() => setActiveTab("Pending")}
              className="rounded-xl border border-white/10 bg-zinc-900 p-4 text-left transition hover:border-yellow-400/60"
            >
              <p className="text-sm text-gray-400">Needs review</p>
              <p className="mt-2 text-3xl font-bold text-yellow-300">
                {stats.pending}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("Proof Submitted")}
              className="rounded-xl border border-white/10 bg-zinc-900 p-4 text-left transition hover:border-purple-400/60"
            >
              <p className="text-sm text-gray-400">Proof submitted</p>
              <p className="mt-2 text-3xl font-bold text-purple-300">
                {stats.proofSubmitted}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("Approved Unpaid")}
              className="rounded-xl border border-white/10 bg-zinc-900 p-4 text-left transition hover:border-blue-400/60"
            >
              <p className="text-sm text-gray-400">Approved not paid</p>
              <p className="mt-2 text-3xl font-bold text-blue-300">
                {stats.approvedAwaitingPayment}
              </p>
            </button>

            <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
              <p className="text-sm text-gray-400">Matching now</p>
              <p className="mt-2 text-3xl font-bold text-green-300">
                {totalCount}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => setActiveTab(tab.label)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    activeTab === tab.label
                      ? "bg-red-600 text-white"
                      : "bg-zinc-950 text-gray-300 hover:bg-zinc-800"
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>

            <div
              className={`mt-4 grid gap-3 md:grid-cols-2 ${
                eventMode === "Big event"
                  ? "xl:grid-cols-[1.3fr_1fr_1fr_0.8fr_auto]"
                  : "xl:grid-cols-[1.4fr_1fr_1fr_auto]"
              }`}
            >
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Search
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, Chess SA ID, email, phone, tournament..."
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
                />
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Tournament
                <select
                  value={tournamentFilter}
                  onChange={(event) => {
                    setTournamentFilter(event.target.value);
                    setSectionFilter("All");
                  }}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
                >
                  <option value="All">All tournaments</option>
                  {tournaments.map((tournament) => (
                    <option key={tournament} value={tournament}>
                      {tournament}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Section
                <select
                  value={sectionFilter}
                  onChange={(event) => setSectionFilter(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
                >
                  <option value="All">All sections</option>
                  {sections.map((section) => (
                    <option key={section} value={section}>
                      {section}
                    </option>
                  ))}
                </select>
              </label>

              {eventMode === "Big event" && (
                <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Sort
                  <select
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as SortOption)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
                  >
                    {[
                      "Newest first",
                      "Oldest first",
                      "Player A-Z",
                      "Tournament A-Z",
                      "Highest rating",
                    ].map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="self-end rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-red-500"
              >
                Reset
              </button>
            </div>
          </div>

          <div
            className={`mt-6 grid gap-4 ${
              eventMode === "Big event"
                ? "xl:grid-cols-[1fr_1fr_0.75fr]"
                : "xl:grid-cols-[1fr_1fr]"
            }`}
          >
            <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-semibold">Selected entries</p>
                  <p className="mt-1 text-sm text-gray-400">
                    {selectedRegistrationIds.length} selected from{" "}
                    {currentPageRegistrations.length} shown on this page
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={toggleAllVisibleRegistrations}
                    className="rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:border-red-500"
                  >
                    Select page
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

              <div className="mt-4 flex flex-wrap gap-2">
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
                  Mark paid
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
                  onClick={deleteSelectedRegistrations}
                  disabled={updating || selectedRegistrationIds.length === 0}
                  className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-300 transition hover:bg-red-600/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Delete selected
                </button>
              </div>

              {selectedRegistrations.length > 0 && (
                <p className="mt-3 truncate text-xs text-gray-500">
                  {selectedRegistrations.map((item) => item.full_name).join(", ")}
                </p>
              )}
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="min-w-[220px] flex-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Export format
                  <select
                    value={exportFormat}
                    onChange={(event) =>
                      setExportFormat(event.target.value as TournamentExportFormat)
                    }
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
                  >
                    {tournamentExportFormats.map((format) => (
                      <option key={format.value} value={format.value}>
                        {format.label}
                      </option>
                    ))}
                  </select>
                </label>

                <button
                  type="button"
                  onClick={exportCsv}
                  className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-red-500"
                >
                  Export CSV
                </button>

                <button
                  type="button"
                  onClick={exportSwissManagerXlsx}
                  className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  Export approved
                </button>

                <button
                  type="button"
                  onClick={exportEachSectionSeparately}
                  className="rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700"
                >
                  By section
                </button>
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Current view has {visibleApprovedCount} approved player
                {visibleApprovedCount === 1 ? "" : "s"} ready for Swiss Manager.
              </p>
            </div>

            {eventMode === "Big event" && (
              <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Operations
                </p>
                <div className="mt-4 space-y-3 text-sm text-gray-300">
                  <p className="flex items-center justify-between gap-3">
                    <span>Current query</span>
                    <span className="font-semibold text-white">{totalCount}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span>Page size</span>
                    <span className="font-semibold text-white">{pageSize}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span>Pages</span>
                    <span className="font-semibold text-white">{totalPages}</span>
                  </p>
                  <p className="flex items-center justify-between gap-3">
                    <span>Pending work</span>
                    <span className="font-semibold text-yellow-300">
                      {stats.pending + stats.proofSubmitted}
                    </span>
                  </p>
                </div>
              </div>
            )}
          </div>

          {message && (
            <p className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          {loading ? (
            <p className="mt-8 text-gray-400">Loading registrations...</p>
          ) : (
            <div className="mt-8">
              <div className="mb-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-zinc-900 p-4 md:flex-row md:items-center md:justify-between">
                <p className="text-sm text-gray-400">
                  Showing{" "}
                  <span className="font-semibold text-white">
                    {displayStart}-{displayEnd}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold text-white">
                    {totalCount}
                  </span>{" "}
                  matching registrations
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                    {eventMode === "Big event" ? "Rows" : "Show"}
                    <select
                      value={pageSize}
                      onChange={(event) =>
                        setPageSize(
                          Number(event.target.value) as (typeof pageSizeOptions)[number]
                        )
                      }
                      className="ml-2 rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none transition focus:border-red-500"
                    >
                      {pageSizeOptions.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>

                  <span className="px-2 text-sm font-semibold text-gray-300">
                    {eventMode === "Big event"
                      ? `Page ${currentPage} of ${totalPages}`
                      : `${currentPage} / ${totalPages}`}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                    disabled={currentPage === totalPages}
                    className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
                <div className="space-y-3 lg:hidden">
                {currentPageRegistrations.map((item) => (
                  <article
                    key={item.registration_id}
                    className={`rounded-2xl border border-white/10 bg-zinc-900 p-4 ${
                      selectedRegistration?.registration_id === item.registration_id
                        ? "border-red-500/60"
                        : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedRegistrationIds.includes(
                          item.registration_id
                        )}
                        onChange={() =>
                          toggleRegistrationSelection(item.registration_id)
                        }
                        className="mt-1 h-4 w-4 accent-red-600"
                        aria-label={`Select ${item.full_name}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-bold text-white">
                          {item.full_name}
                        </p>
                        <p className="mt-1 text-sm text-gray-400">
                          {item.tournament_name}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {item.section_name ?? "No section"} | Chess SA:{" "}
                          {item.chess_sa_id ?? "Not recorded"} | Rating:{" "}
                          {item.rating ?? "Not rated"}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
                      <span
                        className={`rounded-full px-3 py-2 font-semibold ${statusClass(
                          item.payment_status
                        )}`}
                      >
                        Payment: {item.payment_status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-2 font-semibold ${statusClass(
                          item.registration_status
                        )}`}
                      >
                        Entry: {item.registration_status}
                      </span>
                    </div>

                    <div className="mt-4 grid gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedRegistration(item)}
                        className="rounded-lg bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-gray-200"
                      >
                        Review Entry
                      </button>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <button
                          type="button"
                          disabled={updating}
                          onClick={() =>
                            updateRegistration(item.registration_id, {
                              registration_status: "Approved",
                            })
                          }
                          className="rounded-lg bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={updating}
                          onClick={() =>
                            updateRegistration(item.registration_id, {
                              payment_status: "Paid",
                            })
                          }
                          className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-60"
                        >
                          Mark Paid
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {totalCount === 0 && (
                  <p className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center text-sm text-gray-400">
                    No registrations found.
                  </p>
                )}
              </div>

              <div className="hidden overflow-hidden rounded-2xl border border-white/10 lg:block">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-white/10">
                    <thead className="bg-zinc-900">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-400">
                          <input
                            type="checkbox"
                            checked={
                              currentPageRegistrations.length > 0 &&
                              currentPageRegistrations.every((item) =>
                                selectedRegistrationIds.includes(item.registration_id)
                              )
                            }
                            onChange={toggleAllVisibleRegistrations}
                            className="h-4 w-4 accent-red-600"
                            aria-label="Select all registrations on this page"
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
                      {currentPageRegistrations.map((item) => (
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
                              Chess SA: {item.chess_sa_id ?? "Not recorded"}
                            </p>
                            <p className="text-sm text-gray-400">
                              Rating: {item.rating ?? "Not rated"}
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

                      {totalCount === 0 && (
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

              <aside className="rounded-2xl border border-white/10 bg-zinc-900 p-6 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
                {selectedRegistration ? (
                  <>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                      Review Entry
                    </p>

                    <h2 className="mt-3 text-2xl font-bold">
                      {selectedRegistration.full_name}
                    </h2>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span
                        className={`rounded-full px-3 py-1 font-semibold ${statusClass(
                          selectedRegistration.registration_status
                        )}`}
                      >
                        Entry: {selectedRegistration.registration_status}
                      </span>
                      <span
                        className={`rounded-full px-3 py-1 font-semibold ${statusClass(
                          selectedRegistration.payment_status
                        )}`}
                      >
                        Payment: {selectedRegistration.payment_status}
                      </span>
                    </div>

                    <div className="mt-5 space-y-3 text-sm text-gray-300">
                      <p>
                        <span className="font-semibold text-white">
                          Chess SA ID:
                        </span>{" "}
                        {selectedRegistration.chess_sa_id ?? "Not recorded"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">Rating:</span>{" "}
                        {selectedRegistration.rating ?? "Not rated"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">DOB:</span>{" "}
                        {formatDate(selectedRegistration.date_of_birth)}
                      </p>
                      <p>
                        <span className="font-semibold text-white">Gender:</span>{" "}
                        {selectedRegistration.gender ?? "Not recorded"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">Club:</span>{" "}
                        {selectedRegistration.club ?? "Not recorded"}
                      </p>
                      <p>
                        <span className="font-semibold text-white">Province:</span>{" "}
                        {selectedRegistration.province ?? "Not recorded"}
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

                    <div className="mt-6 grid gap-3">
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

                      <button
                        type="button"
                        disabled={updating}
                        onClick={() => deleteRegistration(selectedRegistration)}
                        className="w-full rounded-lg border border-red-600 px-4 py-3 font-semibold text-red-300 transition hover:bg-red-600/10 disabled:opacity-60"
                      >
                        Delete Registration
                      </button>
                    </div>

                    {selectedRegistration.proof_of_payment_url && (
                      <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-semibold text-white">
                            Proof of payment
                          </p>
                          {proofPaymentHref(
                            selectedRegistration.proof_of_payment_url
                          ) && (
                            <a
                              href={
                                proofPaymentHref(
                                  selectedRegistration.proof_of_payment_url
                                ) ?? undefined
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-black transition hover:bg-gray-200"
                            >
                              Open
                            </a>
                          )}
                        </div>
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
            </div>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}
