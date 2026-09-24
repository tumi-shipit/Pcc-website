"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatCalendarDate } from "@/lib/dateHelpers";

import { attachPaymentOrders, paymentRequest, paymentSource, paymentDate, paymentCsv, confirmedYocoPayment, type PaymentReferences } from "@/lib/paymentDesk";

type PaymentTab =
  | "All"
  | "Proof Submitted"
  | "Approved Unpaid"
  | "Paid"
  | "Rejected"
  | "All Unpaid";

type PaymentRow = PaymentReferences & {
  registration_id: string;
  created_at: string;
  payment_status: string;
  proof_of_payment_url: string | null;
  registration_status: string;
  full_name: string;
  chess_sa_id: string | null;
  email: string;
  phone: string;
  tournament_name: string;
  section_name: string | null;
  rating: number | null;
  club: string | null;
  province: string | null;
};

type PaymentStats = {
  proofSubmitted: number;
  approvedUnpaid: number;
  paid: number;
  rejected: number;
  allUnpaid: number;
};

const emptyStats: PaymentStats = {
  proofSubmitted: 0,
  approvedUnpaid: 0,
  paid: 0,
  rejected: 0,
  allUnpaid: 0,
};

const pageSize = 50;

function statusClass(status: string) {
  if (status === "Paid" || status === "Approved") {
    return "bg-green-500/10 text-green-200";
  }
  if (status === "Rejected") return "bg-red-500/10 text-red-200";
  if (status === "Proof Submitted") return "bg-purple-500/10 text-purple-200";
  return "bg-yellow-500/10 text-yellow-200";
}

function formatDate(date: string) {
  return formatCalendarDate(date, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminPaymentsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading payment desk...
          </div>
        </main>
      }
    >
      <AdminGuard><AdminPaymentsContent /></AdminGuard>
    </Suspense>
  );
}

function AdminPaymentsContent() {
  const searchParams = useSearchParams();
  const requestedTournament = searchParams.get("tournament");

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [stats, setStats] = useState<PaymentStats>(emptyStats);
  const [tournaments, setTournaments] = useState<string[]>([]);
  const [sections, setSections] = useState<string[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRow, setSelectedRow] = useState<PaymentRow | null>(null);
  const [activeTab, setActiveTab] = useState<PaymentTab>("All");
  const [search, setSearch] = useState("");
  const [tournamentFilter, setTournamentFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [referenceMessage, setReferenceMessage] = useState("");
  const [statsMessage, setStatsMessage] = useState("");
  const [statsLoading, setStatsLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const [exportingYoco, setExportingYoco] = useState(false);
  const [filtersReady, setFiltersReady] = useState(false);
  const loadVersion = useRef(0);
  const loadAbort = useRef<AbortController | null>(null);

  function applyBaseFilters(query: any) {
    let nextQuery = query;
    const searchText = search.trim().replace(/[,%()."_]/g, " ");

    if (tournamentFilter !== "All") {
      nextQuery = nextQuery.eq("tournament_name", tournamentFilter);
    }

    if (sectionFilter === "No section") {
      nextQuery = nextQuery.is("section_name", null);
    } else if (sectionFilter !== "All") {
      nextQuery = nextQuery.eq("section_name", sectionFilter);
    }

    if (searchText) {
      const pattern = `%${searchText}%`;
      nextQuery = nextQuery.or(
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

    return nextQuery;
  }

  function applyPaymentTab(query: any, tab: PaymentTab) {
    if (tab === "All") return query;
    if (tab === "Proof Submitted") return query.eq("payment_status", "Proof Submitted");
    if (tab === "Approved Unpaid") {
      return query
        .eq("registration_status", "Approved")
        .not("payment_status", "eq", "Paid");
    }
    if (tab === "Paid") return query.eq("payment_status", "Paid");
    if (tab === "Rejected") return query.eq("payment_status", "Rejected");
    return query.not("payment_status", "eq", "Paid");
  }

  async function countTab(tab: PaymentTab, signal: AbortSignal) {
    const { count, error } = await paymentRequest<any>(applyPaymentTab(
      applyBaseFilters(supabase.from("registration_details").select("registration_id", { count: "exact", head: true })), tab
    ).abortSignal(signal), signal);
    if (error) throw new Error(error.message);
    return count ?? 0;
  }

  async function loadStats(signal: AbortSignal) {
    const [proofSubmitted, approvedUnpaid, paid, rejected, allUnpaid] = await Promise.all([
      countTab("Proof Submitted", signal), countTab("Approved Unpaid", signal), countTab("Paid", signal),
      countTab("Rejected", signal), countTab("All Unpaid", signal),
    ]);
    return { proofSubmitted, approvedUnpaid, paid, rejected, allUnpaid };
  }

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    async function loadOptions() {
      try {
        const { data, error } = await paymentRequest(supabase.from("tournaments").select("id,tournament_name")
          .order("tournament_name").abortSignal(controller.signal), controller.signal);
        if (error) throw new Error(error.message);
        if (!active) return;
        const events = data ?? [];
        setTournaments(Array.from(new Set(events.map(event => event.tournament_name as string))));
        if (requestedTournament) setTournamentFilter(events.find(event => event.id === requestedTournament)?.tournament_name ?? requestedTournament);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load event filters. Retry to load payments.");
      } finally {
        clearTimeout(timeout);
        if (active) setFiltersReady(true);
      }
    }
    void loadOptions();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [requestedTournament]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    async function loadSections() {
      try {
        let query = supabase.from("tournament_sections").select("section_name,tournaments!inner(tournament_name)");
        if (tournamentFilter !== "All") query = query.eq("tournaments.tournament_name", tournamentFilter);
        const { data, error } = await paymentRequest(query.order("section_name").abortSignal(controller.signal), controller.signal);
        if (error) throw new Error(error.message);
        if (active) setSections(Array.from(new Set((data ?? []).map(row => row.section_name as string))).concat("No section"));
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load sections.");
      } finally { clearTimeout(timeout); }
    }
    if (filtersReady) void loadSections();
    return () => { active = false; controller.abort(); clearTimeout(timeout); };
  }, [tournamentFilter, filtersReady, refresh]);

  async function loadPayments() {
    loadAbort.current?.abort();
    const controller = new AbortController();
    loadAbort.current = controller;
    const version = ++loadVersion.current;
    const current = () => version === loadVersion.current && !controller.signal.aborted;
    setLoading(true); setMessage(""); setReferenceMessage(""); setSelectedRow(null);
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const { data, error, count } = await paymentRequest<any>(applyPaymentTab(
        applyBaseFilters(supabase.from("registration_details").select("*", { count: "exact" })), activeTab
      ).order("created_at", { ascending: false }).order("registration_id")
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1).abortSignal(controller.signal), controller.signal);
      if (error) throw new Error(error.message);
      if (!current()) return;
      const loaded = (data ?? []) as PaymentRow[];
      setRows(loaded.map(row => ({ ...row, orderLookupFailed: true })));
      setTotalCount(count ?? 0);
      setLoading(false);
      setReferenceMessage("Loading payment sources and references…");
      try {
        const enriched = await attachPaymentOrders(supabase, loaded, controller.signal);
        if (current()) {
          setRows(enriched);
          setSelectedRow(selected => enriched.find(row => row.registration_id === selected?.registration_id) ?? null);
          setReferenceMessage("");
        }
      } catch {
        if (version === loadVersion.current) setReferenceMessage("Payment sources, references and dates could not be loaded. Retry to check them; entries are shown below.");
      }
    } catch (error) {
      if (version === loadVersion.current) {
        setRows([]); setTotalCount(0);
        setMessage(controller.signal.aborted ? "Payment loading timed out. Please retry." : error instanceof Error ? error.message : "Could not load payments. Please retry.");
      }
    } finally {
      clearTimeout(timeout);
      if (version === loadVersion.current) setLoading(false);
    }
  }

  useEffect(() => {
    if (!filtersReady) return;
    const timer = setTimeout(() => { void loadPayments(); }, 250);
    return () => { clearTimeout(timer); loadVersion.current += 1; loadAbort.current?.abort(); };
  }, [activeTab, currentPage, search, sectionFilter, tournamentFilter, filtersReady, refresh]);

  useEffect(() => {
    if (!filtersReady) return;
    let active = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const timer = setTimeout(() => {
      setStatsLoading(true); setStatsMessage("");
      loadStats(controller.signal).then(value => { if (active) setStats(value); })
        .catch(() => { if (active) { setStats(emptyStats); setStatsMessage("Payment counts are unavailable. The payment list can still be used."); } })
        .finally(() => { clearTimeout(timeout); if (active) setStatsLoading(false); });
    }, 250);
    return () => { active = false; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [search, sectionFilter, tournamentFilter, filtersReady, refresh]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const displayStart = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const displayEnd = Math.min(currentPage * pageSize, totalCount);
  const selectedRows = useMemo(() => {
    const ids = new Set(selectedIds);
    return rows.filter((row) => ids.has(row.registration_id));
  }, [rows, selectedIds]);

  function toggleSelection(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((currentId) => currentId !== id)
        : [...current, id]
    );
  }

  function togglePageSelection() {
    const pageIds = rows.map((row) => row.registration_id);
    const allSelected =
      pageIds.length > 0 && pageIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((current) => current.filter((id) => !pageIds.includes(id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...pageIds])));
  }

  async function updateRegistrations(
    ids: string[],
    changes: {
      payment_status?: "Pending" | "Proof Submitted" | "Paid" | "Rejected";
      registration_status?: "Pending" | "Approved" | "Rejected" | "Withdrawn";
    }
  ) {
    if (ids.length === 0) {
      setMessage("Select at least one payment first.");
      return;
    }

    setUpdating(true);
    setMessage("");

    try {
      const signal = AbortSignal.timeout(15000);
      const { error } = await paymentRequest(supabase.rpc("admin_batch_update_registration_status", {
        p_registration_ids: ids,
        p_payment_status: changes.payment_status ?? null,
        p_registration_status: changes.registration_status ?? null,
      }).abortSignal(signal), signal);
      if (error) throw new Error(error.message);
      setSelectedIds([]);
      setRefresh(value => value + 1);
    } catch (error) {
      setMessage(`Could not confirm the payment update: ${error instanceof Error ? error.message : "Request failed."} Refresh to check the saved status before retrying.`);
    } finally {
      setUpdating(false);
    }
  }

  async function openProof(row: PaymentRow) {
    if (!row.proof_of_payment_url) {
      setMessage("This registration has no proof of payment uploaded.");
      return;
    }

    if (
      row.proof_of_payment_url.startsWith("http://") ||
      row.proof_of_payment_url.startsWith("https://")
    ) {
      window.open(row.proof_of_payment_url, "_blank", "noopener,noreferrer");
      return;
    }

    const { data, error } = await supabase.storage
      .from("proof-of-payments")
      .createSignedUrl(row.proof_of_payment_url, 60 * 60);

    if (error || !data?.signedUrl) {
      setMessage(`Could not open proof of payment: ${error?.message ?? "No link returned."}`);
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function exportYocoCsv() {
    setExportingYoco(true); setMessage("");
    try {
      const exportRows: PaymentRow[] = [];
      for (let offset = 0; ; offset += 500) {
        const signal = AbortSignal.timeout(15000);
        const { data, error } = await paymentRequest<any>(applyPaymentTab(
          applyBaseFilters(supabase.from("registration_details").select("*")), activeTab
        ).order("registration_id").range(offset, offset + 499).abortSignal(signal), signal);
        if (error) throw new Error(error.message);
        const batch = (data ?? []) as PaymentRow[];
        const enriched = await attachPaymentOrders(supabase, batch, signal);
        exportRows.push(...enriched.filter(confirmedYocoPayment));
        if (batch.length < 500) break;
      }
      if (!exportRows.length) { setMessage("No confirmed live Yoco payments match the current filters. Choose All or Paid to include paid entries."); return; }
      const csv = paymentCsv([
        ["Event", "Section", "Player", "Email", "Payment source", "Amount", "Currency", "Payment confirmed (South African time)", "Payment confirmed (UTC)", "Entry reference", "Payment order reference", "Yoco payment reference", "Yoco checkout reference"],
        ...exportRows.map(row => [row.tournament_name, row.section_name, row.full_name, row.email,
          paymentSource(row), Number(row.order!.amount).toFixed(2), row.order!.currency, paymentDate(row), row.order!.paid_at,
          row.registration_id, row.order!.id, row.order!.yoco_payment_id, row.order!.yoco_checkout_id]),
      ]);
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const link = document.createElement("a"); link.href = url;
      link.download = "pcc-yoco-payments-" + tournamentFilter.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".csv";
      link.click(); URL.revokeObjectURL(url);
      setMessage("Exported " + exportRows.length + " confirmed Yoco payments matching your filters.");
    } catch (error) {
      setMessage(error instanceof Error ? "Yoco export failed: " + error.message : "Could not export Yoco payments. Please retry.");
    } finally { setExportingYoco(false); }
  }

  async function exportUnpaidCsv() {
    const exportRows: PaymentRow[] = [];
    let from = 0;
    const batchSize = 1000;

    while (true) {
      const { data, error } = await applyPaymentTab(
        applyBaseFilters(supabase.from("registration_details").select("*")),
        "All Unpaid"
      )
        .order("tournament_name", { ascending: true })
        .order("section_name", { ascending: true, nullsFirst: false })
        .order("full_name", { ascending: true })
        .range(from, from + batchSize - 1);

      if (error) {
        setMessage(`Could not export unpaid players: ${error.message}`);
        return;
      }

      const batch = (data ?? []) as unknown as PaymentRow[];
      exportRows.push(...batch);
      if (batch.length < batchSize) break;
      from += batchSize;
    }

    const headers = [
      "Full Name",
      "Chess SA ID",
      "Tournament",
      "Section",
      "Payment Status",
      "Registration Status",
      "Email",
      "Phone",
    ];
    const csv = [headers, ...exportRows.map((row) => [
      row.full_name,
      row.chess_sa_id ?? "",
      row.tournament_name,
      row.section_name ?? "",
      row.payment_status,
      row.registration_status,
      row.email,
      row.phone,
    ])]
      .map((line) =>
        line.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")
      )
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pcc-unpaid-players.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { label: PaymentTab; count: number }[] = [
    { label: "All", count: stats.paid + stats.allUnpaid },
    { label: "Proof Submitted", count: stats.proofSubmitted },
    { label: "Approved Unpaid", count: stats.approvedUnpaid },
    { label: "All Unpaid", count: stats.allUnpaid },
    { label: "Paid", count: stats.paid },
    { label: "Rejected", count: stats.rejected },
  ];

  return (
    <>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            PCC Admin
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black md:text-5xl">
                Payment Review Desk
              </h1>
              <p className="mt-3 max-w-3xl text-gray-400">
                Review proof of payment, mark entries paid, and export unpaid
                follow-up lists without leaving the payment queue.
              </p>
            </div>

            <button
              type="button"
              onClick={exportUnpaidCsv}
              className="rounded-lg border border-white/10 bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
            >
              Export unpaid CSV
            </button>
          </div>

          <button type="button" disabled={exportingYoco || !filtersReady} onClick={exportYocoCsv} className="mt-4 mr-3 rounded-lg bg-green-800 px-4 py-2 font-semibold disabled:opacity-50">{exportingYoco ? "Exporting Yoco payments…" : "Export confirmed Yoco payments (current filters)"}</button>
          <button type="button" onClick={() => { setSelectedIds([]); setRefresh(value => value + 1); }} className="mt-4 rounded-lg border border-white/20 px-4 py-2">Refresh / retry payments</button>
          {(statsMessage || referenceMessage) && <p role="status" className="mt-3 text-sm text-amber-200">{statsMessage} {referenceMessage}</p>}
          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Proof submitted" value={statsLoading ? "…" : statsMessage ? "—" : stats.proofSubmitted} tone="purple" />
            <StatCard label="Approved unpaid" value={statsLoading ? "…" : statsMessage ? "—" : stats.approvedUnpaid} tone="blue" />
            <StatCard label="All unpaid" value={statsLoading ? "…" : statsMessage ? "—" : stats.allUnpaid} tone="yellow" />
            <StatCard label="Paid" value={statsLoading ? "…" : statsMessage ? "—" : stats.paid} tone="green" />
            <StatCard label="Rejected" value={statsLoading ? "…" : statsMessage ? "—" : stats.rejected} tone="red" />
          </div>

          <section className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4">
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.label}
                  type="button"
                  onClick={() => { setActiveTab(tab.label); setCurrentPage(1); setSelectedIds([]); }}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    activeTab === tab.label
                      ? "bg-red-600 text-white"
                      : "bg-zinc-950 text-gray-300 hover:bg-zinc-800"
                  }`}
                >
                  {tab.label} ({statsLoading ? "…" : statsMessage ? "—" : tab.count})
                </button>
              ))}
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-[1.3fr_1fr_1fr_auto]">
              <input
                value={search}
                onChange={(event) => { setSearch(event.target.value); setCurrentPage(1); setSelectedIds([]); }}
                placeholder="Search player, Chess SA ID, phone, email..."
                className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
              />

              <select
                value={tournamentFilter}
                onChange={(event) => { setTournamentFilter(event.target.value); setSectionFilter("All"); setCurrentPage(1); setSelectedIds([]); }}
                className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
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
                onChange={(event) => { setSectionFilter(event.target.value); setCurrentPage(1); setSelectedIds([]); }}
                className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
              >
                <option value="All">All sections</option>
                {sections.map((section) => (
                  <option key={section} value={section}>
                    {section}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTournamentFilter("All");
                  setSectionFilter("All");
                  setActiveTab("All"); setCurrentPage(1); setSelectedIds([]);
                }}
                className="rounded-lg border border-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:border-red-500"
              >
                Reset
              </button>
            </div>
          </section>

          <section className="mt-6 grid gap-4 xl:grid-cols-[1fr_420px]">
            <div>
              <div className="mb-4 rounded-xl border border-white/10 bg-zinc-900 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-gray-400">
                    Showing{" "}
                    <span className="font-semibold text-white">
                      {totalCount === 0 ? "0" : `${displayStart}-${displayEnd}`}
                    </span>{" "}
                    of <span className="font-semibold text-white">{totalCount}</span>
                  </p>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={togglePageSelection}
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-red-500"
                    >
                      Select page
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRegistrations(selectedIds, { payment_status: "Paid" })}
                      disabled={updating || selectedIds.length === 0}
                      className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Mark paid
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRegistrations(selectedIds, { payment_status: "Rejected" })}
                      disabled={updating || selectedIds.length === 0}
                      className="rounded-lg border border-red-500/40 px-3 py-2 text-sm font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedIds([])}
                      disabled={selectedIds.length === 0}
                      className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-gray-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                {selectedRows.length > 0 && (
                  <p className="mt-3 truncate text-xs text-gray-500">
                    {selectedRows.map((row) => row.full_name).join(", ")}
                  </p>
                )}
              </div>

              {message && (
                <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                  {message}
                </p>
              )}

              {loading ? (
                <p className="rounded-xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
                  Loading payments...
                </p>
              ) : rows.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-zinc-900 p-6 text-center text-gray-400">
                  No payments found.
                </p>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10">
                      <thead className="bg-zinc-900">
                        <tr>
                          <th className="p-4 text-left">
                            <input
                              type="checkbox"
                              checked={
                                rows.length > 0 &&
                                rows.every((row) => selectedIds.includes(row.registration_id))
                              }
                              onChange={togglePageSelection}
                              className="h-4 w-4 accent-red-600"
                              aria-label="Select all payments on this page"
                            />
                          </th>
                          <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Player
                          </th>
                          <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Event
                          </th>
                          <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Payment
                          </th>
                          <th className="p-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                            Action
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10 bg-zinc-950">
                        {rows.map((row) => (
                          <tr
                            key={row.registration_id}
                            className={
                              selectedRow?.registration_id === row.registration_id
                                ? "bg-red-600/10"
                                : ""
                            }
                          >
                            <td className="p-4 align-top">
                              <input
                                type="checkbox"
                                checked={selectedIds.includes(row.registration_id)}
                                onChange={() => toggleSelection(row.registration_id)}
                                className="h-4 w-4 accent-red-600"
                                aria-label={`Select ${row.full_name}`}
                              />
                            </td>
                            <td className="p-4 align-top">
                              <p className="font-semibold text-white">{row.full_name}</p>
                              <p className="mt-1 text-sm text-gray-400">
                                Chess SA: {row.chess_sa_id ?? "Not recorded"}
                              </p>
                              <p className="text-sm text-gray-500">
                                {row.phone} | {row.email}
                              </p>
                            </td>
                            <td className="p-4 align-top">
                              <p className="font-semibold text-white">
                                {row.tournament_name}
                              </p>
                              <p className="mt-1 text-sm text-gray-400">
                                {row.section_name ?? "No section"}
                              </p>
                            </td>
                            <td className="p-4 align-top">
                              <span
                                className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                                  row.payment_status
                                )}`}
                              >
                                {row.payment_status}
                              </span>
                              <p className="mt-2 text-sm text-gray-300">{paymentSource(row)}</p>
                              <p className="mt-1 text-xs text-gray-400">Paid: {paymentDate(row)}</p>
                              <p className="mt-1 break-all text-xs text-gray-400">Payment reference: {row.order?.yoco_payment_id || "Not recorded"}</p>
                              <p className="mt-1 break-all text-xs text-gray-500">Entry reference: {row.registration_id}</p>
                              <p className="mt-2 text-xs text-gray-500">
                                Registered {formatDate(row.created_at)}
                              </p>
                            </td>
                            <td className="p-4 align-top">
                              <button
                                type="button"
                                onClick={() => setSelectedRow(row)}
                                className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-gray-200"
                              >
                                Review
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="mt-4 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="text-sm font-semibold text-gray-300">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="rounded-lg border border-white/10 px-3 py-2 text-sm font-semibold text-white transition hover:border-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-zinc-900 p-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
              {selectedRow ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                    Payment review
                  </p>
                  <h2 className="mt-3 text-2xl font-black text-white">
                    {selectedRow.full_name}
                  </h2>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${statusClass(
                        selectedRow.payment_status
                      )}`}
                    >
                      Payment: {selectedRow.payment_status}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 font-semibold ${statusClass(
                        selectedRow.registration_status
                      )}`}
                    >
                      Entry: {selectedRow.registration_status}
                    </span>
                  </div>

                  <div className="mt-5 space-y-3 text-sm text-gray-300">
                    <p>
                      <span className="font-semibold text-white">Tournament:</span>{" "}
                      {selectedRow.tournament_name}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Section:</span>{" "}
                      {selectedRow.section_name ?? "No section"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Chess SA:</span>{" "}
                      {selectedRow.chess_sa_id ?? "Not recorded"}
                    </p>
                    <p>
                      <span className="font-semibold text-white">Contact:</span>{" "}
                      {selectedRow.phone}
                    </p>
                    <p className="break-all">
                      <span className="font-semibold text-white">Email:</span>{" "}
                      {selectedRow.email}
                    </p>
                  </div>

                  <dl className="mt-5 space-y-3 break-all text-sm text-gray-300">
                    <div><dt className="font-semibold text-white">Payment source</dt><dd>{paymentSource(selectedRow)}</dd></div>
                    <div><dt className="font-semibold text-white">Payment confirmed (South African time)</dt><dd>{paymentDate(selectedRow)}</dd></div>
                    <div><dt className="font-semibold text-white">Entry reference</dt><dd>{selectedRow.registration_id}</dd></div>
                    <div><dt className="font-semibold text-white">Payment order reference</dt><dd>{selectedRow.order?.id || "Not recorded"}</dd></div>
                    <div><dt className="font-semibold text-white">Yoco payment reference</dt><dd>{selectedRow.order?.yoco_payment_id || "Not recorded"}</dd></div>
                    <div><dt className="font-semibold text-white">Yoco checkout reference</dt><dd>{selectedRow.order?.yoco_checkout_id || "Not recorded"}</dd></div>
                    {selectedRow.order && <div><dt className="font-semibold text-white">Online order</dt><dd>{selectedRow.order.currency} {Number(selectedRow.order.amount).toFixed(2)} · {selectedRow.order.status}</dd></div>}
                  </dl>
                  <div className="mt-6 grid gap-3">
                    <button
                      type="button"
                      onClick={() => openProof(selectedRow)}
                      disabled={!selectedRow.proof_of_payment_url}
                      className="rounded-lg bg-white px-4 py-3 font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Open proof of payment
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateRegistrations([selectedRow.registration_id], {
                          payment_status: "Paid",
                        })
                      }
                      disabled={updating}
                      className="rounded-lg bg-green-600 px-4 py-3 font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      Mark paid
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateRegistrations([selectedRow.registration_id], {
                          payment_status: "Rejected",
                        })
                      }
                      disabled={updating}
                      className="rounded-lg border border-red-500/40 px-4 py-3 font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                    >
                      Reject payment
                    </button>
                  </div>

                  {selectedRow.proof_of_payment_url && (
                    <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm">
                      <p className="font-semibold text-white">Proof path</p>
                      <p className="mt-2 break-all text-gray-400">
                        {selectedRow.proof_of_payment_url}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex min-h-96 items-center justify-center text-center text-gray-400">
                  Select a payment to review proof and update the payment status.
                </div>
              )}
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "purple" | "blue" | "yellow" | "green" | "red";
}) {
  const toneClass = {
    purple: "text-purple-300 border-purple-500/20 bg-purple-500/10",
    blue: "text-blue-300 border-blue-500/20 bg-blue-500/10",
    yellow: "text-yellow-300 border-yellow-500/20 bg-yellow-500/10",
    green: "text-green-300 border-green-500/20 bg-green-500/10",
    red: "text-red-300 border-red-500/20 bg-red-500/10",
  }[tone];

  return (
    <div className={`rounded-xl border p-4 ${toneClass}`}>
      <p className="text-sm text-gray-300">{label}</p>
      <p className="mt-2 text-3xl font-black">{value}</p>
    </div>
  );
}
