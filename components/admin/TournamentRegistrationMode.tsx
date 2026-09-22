"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
export default function TournamentRegistrationMode({ tournamentId }: { tournamentId: string }) {
  const [mode, setMode] = useState("standard");
  const [locked, setLocked] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    supabase.rpc("get_tournament_registration_settings", { p_tournament_id: tournamentId }).then(({ data, error }) => {
      if (!active) return;
      setAllowed(!error && Boolean(data));
      setMode(data?.mode ?? "standard");
      setLocked(error ? true : data?.locked !== false);
      if (error) setMessage("Could not check registration settings. Refresh to retry.");
    });
    return () => { active = false; };
  }, [tournamentId]);
  if (!allowed) return null;
  return <section className="my-6 rounded-2xl border border-white/10 bg-zinc-900 p-5">
    <h2 className="text-xl font-bold">Registration mode</h2>
    <p className="my-3 text-sm text-zinc-300">Standard uses PCC player profiles. Online events collect names, a platform username and contact email. The mode locks once entries exist.</p>
    <label>Registration platform <select aria-label="Registration platform" value={mode} disabled={locked || busy} className="rounded bg-zinc-950 p-3" onChange={async e => {
      const next = e.target.value; setBusy(true); setMessage("");
      const { data, error } = await supabase.rpc("set_tournament_registration_mode", { p_tournament_id: tournamentId, p_mode: next });
      if (error || data !== true) setMessage(error?.message || "Could not save registration mode.");
      else { setMode(next); setMessage("Registration mode saved."); }
      setBusy(false);
    }}><option value="standard">Standard</option><option value="lichess">Lichess</option><option value="chesscom">Chess.com</option></select></label>
    {locked && <p className="mt-2 text-sm">Mode changes are unavailable once entries exist or entry checks cannot complete.</p>}
    {message && <p role="status" className="mt-2">{message}</p>}
  </section>;
}
