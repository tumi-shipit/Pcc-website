"use client";

import { useEffect, useState } from "react";

export type RecoveryReceipt = { registrationId: string; recoveryToken: string };
export const recoveryStorageKey = "pcc-registration-recovery";

export default function RegistrationRecovery({ receipt }: { receipt: RecoveryReceipt }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [entryStatus, setEntryStatus] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(true);
  const [allowsProof, setAllowsProof] = useState(false);

  useEffect(() => {
    setLink(`${window.location.origin}/register#entry=${receipt.registrationId}&recovery=${receipt.recoveryToken}`);
    setStatus("");
    setOnlineOnly(true);
    setAllowsProof(false);
    setEntryStatus("");
    let active = true;
    const form = new FormData();
    form.set("registrationId", receipt.registrationId);
    form.set("recoveryToken", receipt.recoveryToken);
    fetch("/api/registration/recovery", { method: "POST", body: form })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not check payment status.");
        if (active) { setStatus(result.paymentStatus); setEntryStatus(result.registrationStatus); setOnlineOnly(result.onlineOnly === true); setAllowsProof(result.allowsProof !== false && result.onlineOnly === false); }
      }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [receipt.registrationId, receipt.recoveryToken]);

  async function act(action: "status" | "proof" | "pay") {
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("registrationId", receipt.registrationId);
      form.set("recoveryToken", receipt.recoveryToken);
      form.set("action", action);
      if (action === "proof") {
        if (!file) throw new Error("Choose your proof of payment first.");
        form.set("file", file);
      }
      const response = await fetch(action === "pay" ? "/api/registration/checkout" : "/api/registration/recovery", action === "pay" ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(receipt) } : { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not complete this request. Your entry is still saved.");
      if (action === "pay" && result.redirectUrl) { window.location.assign(result.redirectUrl); return; }
      setStatus(result.paymentStatus);
      setEntryStatus(result.registrationStatus);
      if (typeof result.onlineOnly === "boolean") setOnlineOnly(result.onlineOnly);
      if (typeof result.allowsProof === "boolean") setAllowsProof(result.allowsProof);
      setMessage(action === "proof" ? "Proof submitted for the organiser to review. This is not yet a confirmed payment." : "Status checked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again. Your entry is still saved.");
    } finally { setBusy(false); }
  }

  const closed = status === "Paid" || ["Rejected", "Withdrawn"].includes(entryStatus);
  return <section className="mb-6 rounded-2xl border border-green-500/40 bg-zinc-900 p-5" aria-label="Saved registration">
    <h2 className="text-xl font-bold">Your saved registration</h2>
    <p className="mt-2 text-sm text-gray-300">Reference: {receipt.registrationId}</p>
    <p className="mt-2">Payment: <strong>{status || "Not yet checked"}</strong>{entryStatus && ` · Entry: ${entryStatus}`}</p>
    <p className="mt-2 text-sm text-gray-300">Do not register again. Keep your private recovery link to return to this entry. Anyone with this link can access the entry’s payment options—do not share it publicly.</p>
    <div className="mt-4 flex flex-wrap gap-3">
      {!closed && <button disabled={busy || !status} onClick={() => act("pay")} className="rounded-lg bg-green-800 px-4 py-3 font-bold text-white disabled:opacity-50">Pay now / Try again</button>}
      {!closed && !onlineOnly && <button disabled={busy} onClick={() => setMessage("You can leave this page and return using your private recovery link. Payment status is unchanged; the organiser’s payment deadline still applies.")} className="rounded-lg border border-white/30 px-4 py-3">Pay later</button>}
      <button disabled={busy} onClick={() => act("status")} className="rounded-lg border border-white/30 px-4 py-3">Check payment status</button>
      <button disabled={!link} onClick={async () => { try { await navigator.clipboard.writeText(link); setMessage("Private recovery link copied. Keep it somewhere safe."); } catch { setMessage("Copy the private link from the field below."); } }} className="rounded-lg border border-white/30 px-4 py-3">Copy recovery link</button>
    </div>
    {onlineOnly && !closed && <p className="mt-3 text-sm text-amber-200">Online payment is required. An unfinished or failed payment does not confirm your entry. Use Pay now to finish payment.</p>}
    <details className="mt-3 text-sm"><summary>Show private recovery link</summary><input aria-label="Private recovery link" readOnly value={link} onFocus={event => event.target.select()} className="mt-2 w-full rounded bg-zinc-950 p-3" /></details>
    {!closed && allowsProof && <div className="mt-4 border-t border-white/10 pt-4">
      <label className="block text-sm" htmlFor="recovery-proof">Already paid manually? Upload proof (PDF, JPEG or PNG, maximum 4 MB).</label>
      <input id="recovery-proof" type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} className="mt-2 block max-w-full text-sm" />
      <button disabled={busy || !file || !status} onClick={() => act("proof")} className="mt-3 rounded-lg border border-white/30 px-4 py-3 disabled:opacity-50">Submit proof for review</button>
    </div>}
    {message && <p role="status" className="mt-3 text-sm text-amber-200">{message}</p>}
  </section>;
}
