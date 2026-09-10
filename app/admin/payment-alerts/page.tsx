"use client";

import { useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

export default function PaymentAlertsPage() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [link, setLink] = useState("");
  const [status, setStatus] = useState<{ connected: boolean; tokenConfigured?: boolean; pending?: number } | null>(null);

  async function action(action: string) {
    setBusy(true); setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error("Please sign in again.");
      const response = await fetch("/api/admin/telegram", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}` }, body: JSON.stringify({ action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Request failed.");
      if (result.link) setLink(result.link);
      if (typeof result.connected === "boolean") setStatus(result);
      if (result.message) setMessage(result.message);
      if (action === "connect") setLink("");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }

  const button = "rounded-lg border border-white/20 px-4 py-3 font-semibold disabled:opacity-50";
  return <AdminGuard><main className="mx-auto max-w-3xl p-4 text-white md:p-8">
    <h1 className="text-3xl font-bold">Payment alerts</h1>
    <p className="mt-3 text-gray-300">Receive a Telegram notification for confirmed online tournament, store and membership payments. Only the super admin can connect or change the recipient.</p>
    <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <h2 className="text-xl font-bold">1. Check setup</h2>
      <button disabled={busy} onClick={() => action("status")} className={`${button} mt-3`}>Check connection</button>
      {status && <p className="mt-3">Chat: {status.connected ? "Connected" : "Not connected"}{status.tokenConfigured !== undefined && ` · Bot token: ${status.tokenConfigured ? "Configured" : "Missing"}`}{status.pending !== undefined && ` · Pending alerts: ${status.pending}`}</p>}
      <h2 className="mt-6 text-xl font-bold">2. Connect your Telegram</h2>
      <p className="mt-2 text-sm text-gray-300">Open the private link on the phone where you want alerts and tap Start. Return here to confirm. This replaces any previously connected recipient. Do not share the link.</p>
      <button disabled={busy} onClick={() => action("begin")} className={`${button} mt-3`}>Create private connection link</button>
      {link && <div className="mt-3 space-y-3">
        <a href={link} target="_blank" rel="noreferrer" className="block rounded-lg bg-green-800 p-3 font-bold">Open Telegram and tap Start</a>
        <input aria-label="Private Telegram connection link" value={link} readOnly onFocus={event => event.target.select()} className="w-full rounded bg-zinc-950 p-3 text-sm" />
        <button disabled={busy} onClick={() => action("connect")} className={button}>I tapped Start — connect this chat</button>
      </div>}
      <h2 className="mt-6 text-xl font-bold">3. Verify the phone alert</h2>
      <p className="mt-2 text-sm text-gray-300">Enable Telegram notifications and sound on your phone. Silent mode and Do Not Disturb can suppress alerts.</p>
      <button disabled={busy} onClick={() => action("test")} className={`${button} mt-3 bg-green-800`}>Send test alert</button>
      <button disabled={busy} onClick={() => action("retry")} className={`${button} ml-2 mt-3`}>Retry pending alerts</button>
      {message && <p role="status" className="mt-4 text-amber-200">{message}</p>}
    </section>
    <p className="mt-4 text-sm text-gray-400">Test-mode payments do not send real-payment alerts. Manual cash approvals are not included in this first version. Pending alerts can be retried here; a test alert verifies Telegram delivery, not the complete payment flow.</p>
  </main></AdminGuard>;
}
