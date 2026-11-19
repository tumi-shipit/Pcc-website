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
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    const path = "/gambitbase/register";
    setLink(`${window.location.origin}${path}#entry=${receipt.registrationId}&recovery=${receipt.recoveryToken}`);
    setStatus("");
    setOnlineOnly(true);
    setEntryStatus("");
    let active = true;
    const form = new FormData();
    form.set("registrationId", receipt.registrationId);
    form.set("recoveryToken", receipt.recoveryToken);
    fetch("/api/registration/recovery", { method: "POST", body: form })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not check payment status.");
        if (active) { setStatus(result.paymentStatus); setEntryStatus(result.registrationStatus); setOnlineOnly(result.onlineOnly === true); }
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
      const response = await fetch(action === "pay" ? "/api/registration/checkout" : "/api/registration/recovery", action === "pay" ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...receipt, brand: "gambitbase" }) } : { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not complete this request. Your entry is still saved.");
      if (action === "pay" && result.redirectUrl) { window.location.assign(result.redirectUrl); return; }
      setStatus(result.paymentStatus);
      setEntryStatus(result.registrationStatus);
      if (typeof result.onlineOnly === "boolean") setOnlineOnly(result.onlineOnly);
      setMessage(action === "proof" ? "Proof submitted for the organiser to review. This is not yet a confirmed payment." : "Status checked.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again. Your entry is still saved.");
    } finally { setBusy(false); }
  }

  const paid = status === "Paid";
  const closed = paid || ["Rejected", "Withdrawn"].includes(entryStatus);
  const paymentLabel = status || "Checking payment";
  return <section className="mb-6 rounded-xl border border-[#d9d3c6] bg-white p-4 shadow-sm md:p-5" aria-label="Saved registration">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black ${paid ? "bg-[#e6f2e9] text-[#247148]" : "bg-[#f5efdf] text-[#8a6419]"}`} aria-hidden="true">{paid ? "✓" : "♟"}</span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-[#142239]">Your registration is saved</h2>
          <p className="mt-1 text-xs text-[#58677a]">Payment: <strong className="text-[#142239]">{paymentLabel}</strong>{entryStatus ? ` · Entry: ${entryStatus}` : ""}</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {!closed && onlineOnly && <button disabled={busy || !status} onClick={() => act("pay")} className="rounded-full bg-[#d5ab5d] px-4 py-2.5 text-xs font-extrabold text-[#142239] transition hover:bg-[#c59635] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Opening payment…" : status ? "Pay now" : "Checking…"}</button>}
        {!closed && <button type="button" onClick={() => setMessage("Your registration is saved. You can return to pay later using your private recovery link.")} className="rounded-full border border-[#d9d3c6] px-4 py-2.5 text-xs font-bold text-[#536176] transition hover:border-[#a87517] hover:text-[#142239]">Pay later</button>}
        {!closed && !onlineOnly && <div className="flex items-center gap-2">
          <input id="recovery-proof" type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => setFile(event.target.files?.[0] ?? null)} className="max-w-[180px] text-xs text-[#536176] file:mr-2 file:rounded-full file:border-0 file:bg-[#f5efdf] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#142239]" aria-label="Choose POP file" />
          <button disabled={busy || !file} onClick={() => act("proof")} className="rounded-full border border-[#d9d3c6] px-3.5 py-2.5 text-xs font-bold text-[#536176] disabled:opacity-50">Submit POP</button>
        </div>}
        <button type="button" aria-expanded={manageOpen} onClick={() => setManageOpen((open) => !open)} className="rounded-full border border-[#d9d3c6] px-3 py-2 text-xs font-semibold text-[#536176] transition hover:border-[#a87517] hover:text-[#142239]">{manageOpen ? "Hide details" : "Details"}</button>
      </div>
    </div>

    {manageOpen && <div className="mt-4 border-t border-[#ece7dd] pt-4">
      <p className="text-xs leading-5 text-[#58677a]">You do not need to register again. Keep your private recovery link safe; anyone with it can access this entry&apos;s payment options.</p>
      <p className="mt-2 text-xs text-[#657286]">Reference: {receipt.registrationId}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => act("status")} className="rounded-lg border border-[#d9d3c6] px-3.5 py-2.5 text-xs font-semibold text-[#536176]">Check payment status</button>
        <button disabled={!link} onClick={async () => { try { await navigator.clipboard.writeText(link); setMessage("Private recovery link copied. Keep it somewhere safe."); } catch { setMessage("Copy the private link from the field below."); } }} className="rounded-lg border border-[#d9d3c6] px-3.5 py-2.5 text-xs font-semibold text-[#536176]">Copy recovery link</button>
      </div>
      {onlineOnly && !closed && <p className="mt-3 text-xs leading-5 text-[#73520f]">Online payment is required. The entry is not confirmed until payment succeeds.</p>}
      <details className="mt-3 text-xs text-[#536176]"><summary className="cursor-pointer font-semibold">Show private recovery link</summary><input aria-label="Private recovery link" readOnly value={link} onFocus={event => event.target.select()} className="mt-2 w-full rounded-lg border border-[#d9d3c6] bg-[#f8f6f0] p-3 text-[#142239]" /></details>
    </div>}
    {message && <p role="status" className="mt-3 text-xs text-[#73520f]">{message}</p>}
  </section>;
}
