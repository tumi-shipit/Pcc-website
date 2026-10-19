"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { cdcServiceAwardCategories } from "@/lib/cdcAwards";

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
};

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

  const loadNominations = useCallback(async () => {
    setLoading(true);
    setError("");
    const roleResult = await supabase.rpc("current_admin_role");
    if (roleResult.error || roleResult.data !== "super_admin") {
      setRole(typeof roleResult.data === "string" ? roleResult.data : "no_access");
      setLoading(false);
      return;
    }
    setRole("super_admin");
    const result = await supabase
      .from("cdc_excellence_nominations")
      .select("id, award_year, nominee_name, nominee_surname, category, school_club, nominator_name, nominator_contact, criteria_confirmed, created_at")
      .order("created_at", { ascending: false });
    if (result.error) {
      setError("Could not load nominations. Check that the CDC awards database setup has been applied to the site database.");
      setRows([]);
    } else {
      setRows((result.data ?? []) as Nomination[]);
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
      "Submitted at (SAST)": formatDate(row.created_at),
    }));
    const sheet = XLSX.utils.json_to_sheet(data);
    sheet["!cols"] = [
      { wch: 12 }, { wch: 30 }, { wch: 22 }, { wch: 22 }, { wch: 30 },
      { wch: 26 }, { wch: 30 }, { wch: 20 }, { wch: 24 },
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
            {role === "super_admin" && (
              <button type="button" onClick={exportExcel} disabled={visibleRows.length === 0} className="rounded-xl bg-amber-300 px-5 py-3 text-sm font-black text-zinc-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40">
                Export {visibleRows.length === rows.length ? "all" : "filtered"} to Excel
              </button>
            )}
          </div>

          {role && role !== "super_admin" && !loading ? (
            <div className="mt-8 rounded-2xl border border-red-400/20 bg-red-950/20 p-6">
              <h2 className="font-bold text-red-100">Super admin access required</h2>
              <p className="mt-2 text-sm text-zinc-400">The CDC awards nomination list is restricted to the designated awards administrator.</p>
            </div>
          ) : (
            <>
              <div className="mt-7 grid gap-4 sm:grid-cols-3">
                <Metric label="Total nominations" value={rows.length} />
                <Metric label="Categories represented" value={new Set(rows.map((row) => row.category)).size} />
                <Metric label="Showing" value={`${visibleRows.length} / ${rows.length}`} />
              </div>

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
