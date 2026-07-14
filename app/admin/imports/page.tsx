"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import type { ImportSession } from "@/lib/pccTypes";
import { formatDateTime, singleRelation } from "@/lib/supabaseHelpers";
import { supabase } from "@/lib/supabase";

type ImportSessionQueryRow = Omit<ImportSession, "tournaments"> & {
  tournaments:
    | {
        id: string;
        tournament_name: string;
      }
    | {
        id: string;
        tournament_name: string;
      }[]
    | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function normalizeImportSession(row: ImportSessionQueryRow): ImportSession {
  return {
    ...row,
    tournaments: singleRelation(row.tournaments),
  };
}

export default function AdminImportsHistoryPage() {
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [filter, setFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadSessions() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("import_sessions")
      .select(
        "id, import_type, source_page, tournament_id, file_name, status, total_rows, matched_rows, unmatched_rows, created_rows, updated_rows, skipped_rows, failed_rows, summary, created_at, tournaments(id, tournament_name)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      setMessage(`Could not load import history: ${error.message}`);
    } else {
      const rows = (data ?? []) as ImportSessionQueryRow[];
      setSessions(rows.map(normalizeImportSession));
    }

    setLoading(false);
  }

  useEffect(() => {
    loadSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    if (filter === "All") return sessions;
    return sessions.filter((session) => session.import_type === filter);
  }, [sessions, filter]);

  const importTypes = useMemo(() => {
    return ["All", ...Array.from(new Set(sessions.map((session) => session.import_type)))];
  }, [sessions]);

  const totals = useMemo(() => {
    return {
      imports: sessions.length,
      rows: sessions.reduce((sum, session) => sum + session.total_rows, 0),
      matched: sessions.reduce((sum, session) => sum + session.matched_rows, 0),
      failed: sessions.reduce((sum, session) => sum + session.failed_rows, 0),
    };
  }, [sessions]);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Admin Home
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Import Centre
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Import History
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Track Swiss Manager imports, historical tournament imports,
              player imports and rating imports in one place.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Import sessions" value={totals.imports} />
            <StatCard label="Rows imported" value={totals.rows} />
            <StatCard label="Matched rows" value={totals.matched} tone="green" />
            <StatCard label="Failed rows" value={totals.failed} tone="red" />
          </section>

          <section className="mt-8 grid gap-4 md:grid-cols-[1fr_240px_160px]">
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <p className="text-sm text-gray-400">Showing</p>
              <p className="mt-2 text-3xl font-black">{filteredSessions.length}</p>
            </div>

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              className={inputClass}
            >
              {importTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "All" ? "All import types" : type}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={loadSessions}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
            >
              Refresh
            </button>
          </section>

          {loading ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
              Loading import history...
            </p>
          ) : filteredSessions.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
              No import sessions found.
            </p>
          ) : (
            <section className="mt-8 overflow-auto rounded-3xl border border-white/10 bg-zinc-900">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="p-4">Date</th>
                    <th className="p-4">Type</th>
                    <th className="p-4">File</th>
                    <th className="p-4">Tournament</th>
                    <th className="p-4">Total</th>
                    <th className="p-4">Matched</th>
                    <th className="p-4">Unmatched</th>
                    <th className="p-4">Created</th>
                    <th className="p-4">Failed</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredSessions.map((session) => (
                    <tr key={session.id} className="border-t border-white/10">
                      <td className="p-4 text-gray-300">
                        {formatDateTime(session.created_at)}
                      </td>

                      <td className="p-4 font-bold text-white">
                        {session.import_type}
                      </td>

                      <td className="p-4 text-gray-300">
                        {session.file_name ?? "-"}
                      </td>

                      <td className="p-4">
                        {session.tournaments ? (
                          <Link
                            href={`/admin/tournaments/${session.tournaments.id}`}
                            className="font-semibold text-red-300 transition hover:text-red-200"
                          >
                            {session.tournaments.tournament_name}
                          </Link>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>

                      <td className="p-4 text-gray-300">{session.total_rows}</td>
                      <td className="p-4 text-green-300">{session.matched_rows}</td>
                      <td className="p-4 text-yellow-300">{session.unmatched_rows}</td>
                      <td className="p-4 text-blue-300">{session.created_rows}</td>
                      <td className="p-4 text-red-300">{session.failed_rows}</td>

                      <td className="p-4">
                        <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                          {session.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      </main>
    </AdminGuard>
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

