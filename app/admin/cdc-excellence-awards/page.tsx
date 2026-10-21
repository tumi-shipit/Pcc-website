"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AdminGuard from "@/components/AdminGuard";
import CdcVotingAdminPanel from "@/components/admin/CdcVotingAdminPanel";
import { supabase } from "@/lib/supabase";
import { cdcApprovedNomineeRoster, cdcAwardsSiteUrl, cdcServiceAwardCategories } from "@/lib/cdcAwards";

type Nomination = {
  id: string;
  award_year: number;
  nominee_name: string;
  nominee_surname: string;
  category: string;
  school_club: string;
  nominator_name: string;
  nominator_contact: string;
  criteria_confirmed: boolean;
  created_at: string;
  eligibility_status: "pending" | "eligible" | "ineligible";
  acceptance_status: "pending" | "accepted" | "declined";
  acceptance_token: string | null;
};

type ApprovedEntry = { category: string; ids: string[]; school_club: string; acceptance_status: Nomination["acceptance_status"] };
type ApprovedPerson = { key: string; name: string; surname: string; entries: ApprovedEntry[] };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-ZA", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Johannesburg",
  }).format(new Date(value));
}

export default function CdcAwardsAdminPage() {
  const [role, setRole] = useState<string | null>(null);
  const [rows, setRows] = useState<Nomination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [privateLinks, setPrivateLinks] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState("");
  const [databaseSetupMissing, setDatabaseSetupMissing] = useState(false);
  const canViewNominations = role === "super_admin" || role === "admin";

  const loadNominations = useCallback(async () => {
    setLoading(true);
    setError("");
    const roleResult = await supabase.rpc("current_admin_role");
    if (roleResult.error || !["super_admin", "admin"].includes(String(roleResult.data))) {
      setRole(typeof roleResult.data === "string" ? roleResult.data : "no_access");
      setLoading(false);
      return;
    }
    setRole(String(roleResult.data));
    const result = await supabase
      .from("cdc_excellence_nominations")
      .select("id, award_year, nominee_name, nominee_surname, category, school_club, nominator_name, nominator_contact, criteria_confirmed, created_at, eligibility_status, acceptance_status, acceptance_token")
      .order("created_at", { ascending: false });
    if (result.error) {
      const fallback = await supabase
        .from("cdc_excellence_nominations")
        .select("id, award_year, nominee_name, nominee_surname, category, school_club, nominator_name, nominator_contact, criteria_confirmed, created_at")
        .order("created_at", { ascending: false });
      if (fallback.error) {
        setError("Could not load nominations. Check that the CDC awards database setup has been applied to the site database.");
        setRows([]);
        setPrivateLinks({});
      } else {
        setDatabaseSetupMissing(true);
        setError("Nominations loaded. Run database/cdc_excellence_awards_acceptance_setup.sql in the website’s Supabase project to enable private nominee response links and database-level closure.");
        setRows((fallback.data ?? []).map((row) => ({ ...row, eligibility_status: "pending", acceptance_status: "pending", acceptance_token: null })) as Nomination[]);
        setPrivateLinks({});
      }
    } else {
      setDatabaseSetupMissing(false);
      setError("");
      const loadedRows = (result.data ?? []) as Nomination[];
      setRows(loadedRows);
      const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
      const savedLinks: Record<string, string> = {};
      for (const approved of cdcApprovedNomineeRoster) {
        const key = `${normalize(approved.name)}|${normalize(approved.surname)}`;
        const matchedToken = loadedRows.find((row) => row.category === approved.category
          && row.acceptance_token
          && approved.submissionNames.some(([name, surname]) => normalize(row.nominee_name) === normalize(name) && normalize(row.nominee_surname) === normalize(surname)))?.acceptance_token;
        if (matchedToken) savedLinks[key] = `${cdcAwardsSiteUrl}/cdc-excellence-awards/accept/${matchedToken}`;
      }
      setPrivateLinks(savedLinks);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadNominations(); }, 0);
    return () => window.clearTimeout(timer);
  }, [loadNominations]);

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return rows.filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (!normalizedQuery) return true;
      return [row.nominee_name, row.nominee_surname, row.category, row.school_club, row.nominator_name, row.nominator_contact]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery));
    });
  }, [category, query, rows]);

  const nomineeGroups = useMemo(() => {
    const normalize = (value: string) => value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
    const grouped = new Map<string, ApprovedPerson>();
    for (const approved of cdcApprovedNomineeRoster) {
      const key = `${normalize(approved.name)}|${normalize(approved.surname)}`;
      const matches = rows.filter((row) => row.category === approved.category && approved.submissionNames.some(([name, surname]) => normalize(row.nominee_name) === normalize(name) && normalize(row.nominee_surname) === normalize(surname)));
      const current = grouped.get(key) ?? { key, name: approved.name, surname: approved.surname, entries: [] };
      current.entries.push({
        category: approved.category,
        ids: matches.map((row) => row.id),
        school_club: matches[0]?.school_club ?? "",
        acceptance_status: matches.some((row) => row.acceptance_status === "accepted") ? "accepted" : matches.some((row) => row.acceptance_status === "declined") ? "declined" : "pending",
      });
      grouped.set(key, current);
    }
    return Array.from(grouped.values());
  }, [rows]);

  async function createAcceptanceLink(person: (typeof nomineeGroups)[number]) {
    const approvedEntries = person.entries.filter((entry) => entry.ids.length > 0);
    if (approvedEntries.length === 0) return;
    setBusyKey(person.key);
    setError("");
    const ids = approvedEntries.flatMap((entry) => entry.ids);
    const token = crypto.randomUUID();
    try {
      const result = await supabase.from("cdc_excellence_nominations").update({
        acceptance_token: token,
        acceptance_status: "pending",
        accepted_email: null,
      }).in("id", ids).select("id");
      if (result.error) {
        setError(`Could not create the private response link: ${result.error.message}`);
        return;
      }
      if ((result.data ?? []).length !== ids.length) {
        setError(`The database updated ${(result.data ?? []).length} of ${ids.length} matching nominations. Check the CDC awards admin update policy, then refresh before generating again.`);
        return;
      }
      const link = `${cdcAwardsSiteUrl}/cdc-excellence-awards/accept/${token}`;
      setPrivateLinks((current) => ({ ...current, [person.key]: link }));
      await loadNominations();
    } catch (cause) {
      setError(`Could not create the private response link: ${cause instanceof Error ? cause.message : "Unexpected network error."}`);
    } finally {
      setBusyKey("");
    }
  }

  function exportExcel() {
    const workbook = XLSX.utils.book_new();
    const data = visibleRows.map((row) => ({
      "Award year": row.award_year,
      Category: row.category,
      "Nominee name": row.nominee_name,
      "Nominee surname": row.nominee_surname,
      "School / club": row.school_club,
      "Nominator name": row.nominator_name,
      "Nominator contact": row.nominator_contact,
      "Criteria confirmed": row.criteria_confirmed ? "Yes" : "No",
      "Nominee response": row.acceptance_status,
      "Submitted at (SAST)": formatDate(row.created_at),
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    sheet["!cols"] = [
      { wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 22 }, { wch: 30 },
      { wch: 26 }, { wch: 30 }, { wch: 20 }, { wch: 24 }, { wch: 20 }, { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, "CDC Nominations");
    XLSX.writeFile(workbook, "cdc-excellence-awards-nominations-2026.xlsx");
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-300">Capricorn District Chess</p>
              <h1 className="mt-3 text-3xl font-black md:text-4xl">Excellence Awards nominations</h1>
              <p className="mt-2 text-sm text-zinc-400">Private nomination records · 2026</p>
            </div>
            {canViewNominations && (
              <button type="button" onClick={exportExcel} disabled={visibleRows.length === 0} className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40">
                Export {visibleRows.length === rows.length ? "all" : "filtered"} to Excel
              </button>
            )}
          </div>

          {role && !canViewNominations && !loading ? (
            <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-950/20 p-6">
              <h2 className="font-bold text-red-100">Admin access required</h2>
              <p className="mt-2 text-sm text-zinc-400">The CDC awards nomination list is available to Admin and Super Admin accounts.</p>
            </div>
          ) : (
            <>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <Metric label="Total nominations" value={rows.length} />
                <Metric label="Categories represented" value={new Set(rows.map((row) => row.category)).size} />
                <Metric label="Showing" value={`${visibleRows.length} / ${rows.length}`} />
              </div>

              {canViewNominations && <CdcVotingAdminPanel />}

              <section className="mt-7 rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div><h2 className="text-xl font-black">Approved nominees and response links</h2><p className="mt-1 text-sm text-zinc-400">This shortlist follows the final nominees poster. Repeated submissions are grouped together.</p></div>
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-200">Response deadline · midnight tonight (22 October)</span>
                </div>
                <div className="mt-5 space-y-4">
                  {nomineeGroups.map((person) => {
                    const link = privateLinks[person.key];
                    const hasResponded = person.entries.some((entry) => entry.acceptance_status !== "pending");
                    return <article key={person.key} className="rounded-xl border border-white/10 bg-black/20 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div><h3 className="font-bold">{person.name} {person.surname}</h3><p className="mt-1 text-xs text-zinc-500">{person.entries.reduce((sum, entry) => sum + entry.ids.length, 0)} matching submission(s)</p></div>
                        <div className="flex flex-wrap gap-2">
                          {person.entries.some((entry) => entry.ids.length > 0) && !hasResponded && <button type="button" disabled={busyKey === person.key || databaseSetupMissing} onClick={() => void createAcceptanceLink(person)} className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-black text-zinc-950 disabled:opacity-50">{busyKey === person.key ? "Creating…" : link ? "Regenerate private response link" : "Generate private response link"}</button>}
                        </div>
                      </div>
                      {link && <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input readOnly value={link} aria-label={`Private acceptance link for ${person.name} ${person.surname}`} className="min-h-10 min-w-0 flex-1 rounded-lg border border-white/10 bg-zinc-950 px-3 text-xs text-zinc-300"/><button type="button" onClick={() => void navigator.clipboard.writeText(link)} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:border-amber-300/50">Copy link</button></div>}
                      <div className="mt-4 space-y-2">
                        {person.entries.map((entry) => <div key={`${person.key}-${entry.category}`} className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-3 text-sm">
                          <span>{entry.category} <span className="ml-1 text-xs text-zinc-500">{entry.school_club && `· ${entry.school_club}`}</span></span>
                          <span className={`text-[11px] font-bold capitalize ${entry.acceptance_status === "accepted" ? "text-emerald-200" : entry.acceptance_status === "declined" ? "text-red-200" : entry.ids.length ? "text-amber-100" : "text-zinc-500"}`}>{entry.acceptance_status === "pending" && !entry.ids.length ? "No matching submission" : entry.acceptance_status}</span>
                        </div>)}
                      </div>
                    </article>;
                  })}
                </div>
              </section>

              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-zinc-900/70 p-4 md:flex-row">
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, school or contact" className="min-h-11 min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none focus:border-amber-300/70" />
                <select value={category} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm outline-none focus:border-amber-300/70">
                  <option value="all">All categories</option>
                  {cdcServiceAwardCategories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <button type="button" onClick={() => void loadNominations()} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-bold text-zinc-200 hover:border-amber-300/50">Refresh</button>
              </div>

              {error && <p role="alert" className="mt-5 rounded-xl border border-amber-300/20 bg-amber-950/20 p-4 text-sm text-amber-100">{error}</p>}
              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50">
                {loading ? <p className="p-8 text-sm text-zinc-400">Loading nominations…</p> : visibleRows.length === 0 ? (
                  <div className="p-8"><p className="font-semibold">No nominations to show yet.</p><p className="mt-2 text-sm text-zinc-400">Submitted nominations will appear here as they arrive.</p></div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
                      <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-zinc-400">
                        <tr>{["Nominee", "Category", "School / club", "Nominated by", "Criteria confirmed", "Submitted"].map((heading) => <th key={heading} className="px-4 py-4 font-bold">{heading}</th>)}</tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.07]">
                        {visibleRows.map((row) => (
                          <tr key={row.id} className="align-top hover:bg-white/[0.025]">
                            <td className="px-4 py-4"><p className="font-bold">{row.nominee_name} {row.nominee_surname}</p></td>
                            <td className="px-4 py-4 text-amber-100">{row.category}</td>
                            <td className="px-4 py-4 text-zinc-300">{row.school_club}</td>
                            <td className="px-4 py-4"><p className="text-zinc-200">{row.nominator_name}</p><p className="mt-1 text-xs text-zinc-500">{row.nominator_contact}</p></td>
                            <td className="px-4 py-4">{row.criteria_confirmed ? <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-bold text-emerald-200">Confirmed</span> : <span className="text-xs text-zinc-500">No</span>}</td>
                            <td className="whitespace-nowrap px-4 py-4 text-xs text-zinc-400">{formatDate(row.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5"><p className="text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}
