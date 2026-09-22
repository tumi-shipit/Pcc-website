"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function TournamentOnlinePayment({ tournamentId }: { tournamentId: string }) {
  const [enabled, setEnabled] = useState(false);
  const [required, setRequired] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.rpc("current_admin_role"),
      supabase.from("tournaments").select("online_payment_enabled,registration_payment_required").eq("id", tournamentId).single(),
    ]).then(([role, result]) => {
      if (cancelled) return;
      setAllowed(["super_admin", "admin"].includes(role.data));
      setEnabled(result.data?.online_payment_enabled === true);
      setRequired(result.data?.registration_payment_required === true);
      setReady(!result.error);
      if (result.error) setMessage("Could not load online payment settings. Refresh to try again.");
    });
    return () => { cancelled = true; };
  }, [tournamentId]);
  if (!allowed) return null;
  async function toggleRequired() {
    setSaving(true);
    const { data, error } = await supabase.rpc("set_tournament_payment_required", { p_tournament_id: tournamentId, p_required: !required });
    if (error || data !== true) setMessage(error?.message || "Could not save payment requirement.");
    else { setRequired(!required); if (!required) setEnabled(true); setMessage("Online-only requirement saved."); }
    setSaving(false);
  }
  async function toggle() {
    setSaving(true);
    setMessage("");
    const { data, error } = await supabase.rpc("set_tournament_online_payment", {
      p_tournament_id: tournamentId, p_enabled: !enabled,
    });
    if (error || data !== true) setMessage(error?.message || "The event was not updated. Please refresh and try again.");
    else { setEnabled(!enabled); setMessage("Payment setting saved."); }
    setSaving(false);
  }
  return <section className="my-6 rounded-2xl border border-white/10 bg-zinc-900 p-5">
    <h2 className="text-xl font-bold">Secure online registration payment</h2>
    <p className="mt-2 text-sm text-zinc-400">{ready ? `Currently ${enabled ? "enabled" : "disabled"}.` : "Settings unavailable."} Admins can change this for any event. Registration must be open and the selected section must have a payable entry fee.</p>
    <button type="button" disabled={!ready || saving} onClick={toggle} className="mt-4 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving…" : enabled ? "Disable online payment" : "Enable online payment"}</button>
    {message && <p role="status" className="mt-3 text-sm">{message}</p>}
    <div className="mt-5 border-t border-white/10 pt-5">
      <h3 className="font-bold">Online payment only: {required ? "Yes" : "No"}</h3>
      <p className="mt-2 text-sm text-zinc-400">Players must pay online before their entry can be approved. Proof uploads and manual payment labels are not accepted. Enabling this also enables online checkout; every section needs a positive entry fee.</p>
      <button type="button" disabled={!ready || saving} onClick={toggleRequired} className="mt-3 rounded-xl bg-emerald-700 px-5 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving…" : required ? "Allow other payment options" : "Require online payment"}</button>
    </div>
  </section>;
}
