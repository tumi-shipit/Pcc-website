"use client";
import { useCallback, useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
type Entry = { id: string; first_name: string; surname: string; username: string; email: string; platform: string; payment_status: string; registration_status: string; created_at: string; tournaments: { tournament_name: string } | null; tournament_sections: { section_name: string } | null };
const columns = "id,first_name,surname,username,email,platform,payment_status,registration_status,created_at,tournaments(tournament_name),tournament_sections(section_name)";
const size = 100;
export default function OnlineRegistrationList({ tournamentId }: { tournamentId?: string }) {
  const [rows, setRows] = useState<Entry[]>([]);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    setBusy(true);
    let query = supabase.from("online_registrations").select(columns, { count: "exact" }).order("created_at", { ascending: false }).order("id");
    if (tournamentId) query = query.eq("tournament_id", tournamentId);
    const { data, error, count } = await query.range(page * size, (page + 1) * size - 1);
    if (error) { setRows([]); setMessage("Online entries could not be loaded. Check that the online-registration migration is installed, then refresh."); }
    else { setRows((data ?? []) as unknown as Entry[]); setCount(count ?? 0); setMessage(""); }
    setBusy(false);
  }, [tournamentId, page]);
  useEffect(() => { void load(); }, [load]);
  async function exportEntries() {
    setBusy(true); setMessage("");
    try {
      const entries: Entry[] = [];
      for (let offset = 0; ; offset += 1000) {
        let query = supabase.from("online_registrations").select(columns).order("created_at").order("id");
        if (tournamentId) query = query.eq("tournament_id", tournamentId);
        const { data, error } = await query.range(offset, offset + 999);
        if (error) throw new Error("Export failed. Refresh and try again.");
        entries.push(...((data ?? []) as unknown as Entry[]));
        if (!data || data.length < 1000) break;
      }
      const sheet = XLSX.utils.json_to_sheet(entries.map(r => ({
        Reference: r.id, Tournament: r.tournaments?.tournament_name ?? "", Section: r.tournament_sections?.section_name ?? "",
        Platform: r.platform === "lichess" ? "Lichess" : "Chess.com", "First name": r.first_name, Surname: r.surname,
        Username: r.username, "Contact email": r.email, "Entry status": r.registration_status, "Payment status": r.payment_status, "Registered at": r.created_at,
      })));
      const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Online entries");
      XLSX.writeFile(book, "online-tournament-entries.xlsx");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Export failed."); }
    finally { setBusy(false); }
  }
  return <section className="mx-auto my-6 max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-5">
    <h2 className="text-xl font-bold">Online tournament entries ({count})</h2>
    <p className="mt-2 text-sm text-zinc-400">Lichess and Chess.com entries are kept separately from PCC player profiles. Payment is marked Paid only after confirmation.</p>
    <div className="my-3 flex gap-3"><button disabled={busy} onClick={load} className="rounded border border-white/20 px-3 py-2">Refresh</button><button disabled={busy || !count} onClick={exportEntries} className="rounded bg-green-800 px-3 py-2">Export all online entries{tournamentId ? " for this event" : ""}</button></div>
    <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{["Event / Section", "Name", "Platform / Username", "Contact email", "Payment", "Entry status"].map(h => <th className="p-2" key={h}>{h}</th>)}</tr></thead><tbody>{rows.map(r => <tr key={r.id} className="border-t border-white/10">
      <td className="p-2">{r.tournaments?.tournament_name}<br />{r.tournament_sections?.section_name}</td><td className="p-2">{r.first_name} {r.surname}</td><td className="p-2">{r.platform === "lichess" ? "Lichess" : "Chess.com"}<br />{r.username}</td><td className="p-2">{r.email}</td><td className="p-2">{r.payment_status}</td>
      <td className="p-2"><select aria-label={"Entry status for " + r.username} value={r.registration_status} disabled={busy} className="rounded bg-zinc-950 p-2" onChange={async e => {
        setBusy(true);
        const { error } = await supabase.rpc("update_online_registration_status", { p_registration_id: r.id, p_status: e.target.value });
        if (error) { setMessage(error.message); setBusy(false); } else await load();
      }}>{["Pending", "Approved", "Rejected", "Withdrawn"].map(s => <option key={s}>{s}</option>)}</select></td>
    </tr>)}</tbody></table></div>
    {!rows.length && !busy && !message && <p className="mt-3 text-sm">No online entries.</p>}
    <div className="mt-3 flex gap-3"><button disabled={busy || page === 0} onClick={() => setPage(p => p - 1)}>Previous</button><span>Page {page + 1}</span><button disabled={busy || (page + 1) * size >= count} onClick={() => setPage(p => p + 1)}>Next</button></div>
    {message && <p role="status" className="mt-3 text-amber-200">{message}</p>}
  </section>;
}
