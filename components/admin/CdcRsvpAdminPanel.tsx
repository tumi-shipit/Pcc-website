"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Rsvp = {
  id: string;
  nominee_name: string;
  nominee_surname: string;
  respondent_role: "nominee" | "guest";
  nominee_host_name: string;
  nomination_categories: string[];
  email: string;
  phone: string | null;
  attending: boolean;
  guest_count: number;
  dietary_requirements: string | null;
  created_at: string;
};

export default function CdcRsvpAdminPanel() {
  const [rows, setRows] = useState<Rsvp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("cdc_excellence_awards_rsvps")
      .select("id, nominee_name, nominee_surname, respondent_role, nominee_host_name, nomination_categories, email, phone, attending, guest_count, dietary_requirements, created_at")
      .order("created_at", { ascending: false });
    if (queryError) {
      setError("RSVPs are unavailable. Apply database/cdc_excellence_awards_rsvp_setup.sql to enable RSVP storage.");
      setRows([]);
    } else {
      setError("");
      setRows((data ?? []) as Rsvp[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const attendingRows = rows.filter((row) => row.attending);
  const attendeeTotal = attendingRows.reduce((total, row) => total + 1 + row.guest_count, 0);

  async function deleteRsvp(row: Rsvp) {
    const person = `${row.nominee_name} ${row.nominee_surname}`;
    if (!window.confirm(`Delete the RSVP for ${person}? This cannot be undone.`)) return;
    setDeletingId(row.id);
    setError("");
    setNotice("");
    const { error: deleteError, data } = await supabase
      .from("cdc_excellence_awards_rsvps")
      .delete()
      .eq("id", row.id)
      .select("id");
    setDeletingId(null);
    if (deleteError || !data?.length) {
      setError(deleteError?.message || "The RSVP could not be deleted. Check admin access and try again.");
      return;
    }
    setRows((current) => current.filter((item) => item.id !== row.id));
    setNotice(`RSVP for ${person} deleted.`);
  }

  return (
    <section className="mt-7 rounded-2xl border border-amber-300/20 bg-zinc-900/70 p-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div><h2 className="text-xl font-black">Nominee RSVPs</h2><p className="mt-1 text-sm text-zinc-400">Attendance and guest count for the awards evening.</p></div>
        <div className="flex items-center gap-4 text-sm"><span className="text-emerald-200">{attendingRows.length} attending</span><span className="text-zinc-300">{attendeeTotal} seats</span><span className="text-zinc-400">{rows.length - attendingRows.length} unable</span><button type="button" onClick={() => void load()} className="rounded-lg border border-white/15 px-3 py-2 text-xs font-bold hover:border-amber-300/50">Refresh</button></div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl border border-amber-300/20 bg-amber-950/20 p-4 text-sm text-amber-100">{error}</p>}
      {notice && <p role="status" className="mt-4 rounded-xl border border-emerald-300/20 bg-emerald-950/20 p-4 text-sm text-emerald-100">{notice}</p>}
      <div className="mt-5 overflow-x-auto rounded-xl border border-white/10">
        {loading ? <p className="p-5 text-sm text-zinc-400">Loading RSVPs…</p> : rows.length === 0 ? <p className="p-5 text-sm text-zinc-400">No RSVPs have been submitted yet.</p> : (
          <table className="w-full min-w-[1200px] border-collapse text-left text-sm">
            <thead className="bg-white/[0.04] text-xs uppercase tracking-wider text-zinc-400"><tr>{["Person", "Categories", "RSVP for nominee", "Response", "Contact", "Guest", "Dietary requirements", "Received", "Actions"].map((heading) => <th key={heading} className="px-4 py-3 font-bold">{heading}</th>)}</tr></thead>
            <tbody className="divide-y divide-white/[0.07]">{rows.map((row) => <tr key={row.id} className="align-top hover:bg-white/[0.025]">
              <td className="px-4 py-3"><p className="font-semibold">{row.nominee_name} {row.nominee_surname}</p><p className="mt-1 text-xs capitalize text-zinc-500">{row.respondent_role}</p></td>
              <td className="px-4 py-3 text-zinc-300">{row.respondent_role === "guest" ? "—" : row.nomination_categories?.length ? row.nomination_categories.join(", ") : "Not recorded"}</td>
              <td className="px-4 py-3 text-amber-100">{row.nominee_host_name}</td>
              <td className={`px-4 py-3 font-semibold ${row.attending ? "text-emerald-200" : "text-zinc-400"}`}>{row.attending ? "Attending" : "Unable to attend"}</td>
              <td className="px-4 py-3 text-zinc-300">{row.email}{row.phone && <span className="mt-1 block text-xs text-zinc-500">{row.phone}</span>}</td>
              <td className="px-4 py-3 text-zinc-400">{row.respondent_role === "guest" ? "Guest of nominee above" : "—"}</td>
              <td className="px-4 py-3 text-zinc-400">{row.dietary_requirements || "—"}</td>
              <td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-500">{new Intl.DateTimeFormat("en-ZA", { dateStyle: "medium", timeStyle: "short", timeZone: "Africa/Johannesburg" }).format(new Date(row.created_at))}</td>
              <td className="px-4 py-3"><button type="button" disabled={deletingId === row.id} onClick={() => void deleteRsvp(row)} className="rounded-lg border border-red-400/30 px-3 py-2 text-xs font-bold text-red-200 hover:border-red-300 hover:bg-red-950/40 disabled:cursor-wait disabled:opacity-50">{deletingId === row.id ? "Deleting…" : "Delete"}</button></td>
            </tr>)}</tbody>
          </table>
        )}
      </div>
    </section>
  );
}
