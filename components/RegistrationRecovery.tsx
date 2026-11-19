"use client";

import { useEffect, useRef, useState } from "react";

export type RecoveryReceipt = { registrationId: string; recoveryToken: string };
export const recoveryStorageKey = "pcc-registration-recovery";

export default function RegistrationRecovery({ receipt }: { receipt: RecoveryReceipt }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [entryStatus, setEntryStatus] = useState("");
  const [message, setMessage] = useState("");
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [onlinePaymentEnabled, setOnlinePaymentEnabled] = useState(false);
  const proofFileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setStatus("");
    setOnlineOnly(false);
    setOnlinePaymentEnabled(false);
    setEntryStatus("");
    let active = true;
    const form = new FormData();
    form.set("registrationId", receipt.registrationId);
    form.set("recoveryToken", receipt.recoveryToken);
    fetch("/api/registration/recovery", { method: "POST", body: form })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Could not check payment status.");
        if (active) { setStatus(result.paymentStatus); setEntryStatus(result.registrationStatus); setOnlineOnly(result.onlineOnly === true); setOnlinePaymentEnabled(result.onlinePaymentEnabled === true); }
      }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [receipt.registrationId, receipt.recoveryToken]);

  async function act(action: "status" | "proof" | "pay", proofFile?: File) {
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.set("registrationId", receipt.registrationId);
      form.set("recoveryToken", receipt.recoveryToken);
      form.set("action", action);
      if (action === "proof") {
        if (!proofFile) throw new Error("Choose your proof of payment first.");
        form.set("file", proofFile);
      }
      const response = await fetch(action === "pay" ? "/api/registration/checkout" : "/api/registration/recovery", action === "pay" ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...receipt, brand: "gambitbase" }) } : { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Could not complete this request. Your entry is still saved.");
      if (action === "pay" && result.redirectUrl) { window.location.assign(result.redirectUrl); return; }
      setStatus(result.paymentStatus);
      setEntryStatus(result.registrationStatus);
      if (typeof result.onlineOnly === "boolean") setOnlineOnly(result.onlineOnly);
      if (typeof result.onlinePaymentEnabled === "boolean") setOnlinePaymentEnabled(result.onlinePaymentEnabled);
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
        {!closed && onlinePaymentEnabled && <button disabled={busy || !status} onClick={() => act("pay")} className="rounded-full bg-[#d5ab5d] px-4 py-2.5 text-xs font-extrabold text-[#142239] transition hover:bg-[#c59635] disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Opening payment…" : status ? "Pay now" : "Checking…"}</button>}
        {!closed && !onlineOnly && <button type="button" onClick={() => setMessage("Your registration is saved. You can return to pay later using your private recovery link.")} className="rounded-full border border-[#d9d3c6] px-4 py-2.5 text-xs font-bold text-[#536176] transition hover:border-[#a87517] hover:text-[#142239]">Pay later</button>}
        {!closed && !onlineOnly && <>
          <input ref={proofFileInput} type="file" accept="application/pdf,image/jpeg,image/png" disabled={busy} onChange={event => { const selectedFile = event.target.files?.[0]; event.target.value = ""; if (selectedFile) void act("proof", selectedFile); }} className="sr-only" aria-label="Choose proof of payment" />
          <button type="button" disabled={busy} onClick={() => proofFileInput.current?.click()} className="rounded-full border border-[#d9d3c6] px-4 py-2.5 text-xs font-bold text-[#536176] transition hover:border-[#a87517] hover:text-[#142239] disabled:opacity-50">{busy ? "Sending POP…" : "Send POP"}</button>
        </>}
      </div>
    </div>
    {message && <p role="status" className="mt-3 text-xs text-[#73520f]">{message}</p>}
  </section>;
}
