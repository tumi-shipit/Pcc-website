"use client";

import Image from "next/image";
import { useState } from "react";

type Plan = { id: string; name: string; duration_months: number; price: number; description: string | null; card_image_url: string | null };

export default function MembershipPlanCard({ plan }: { plan: Plan }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [chessa, setChessa] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pay() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/membership/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ planId: plan.id, memberName: name, memberEmail: email, memberPhone: phone, chessSaId: chessa }) });
      const body = await response.json() as { redirectUrl?: string; error?: string };
      if (!response.ok || !body.redirectUrl) throw new Error(body.error || "Could not open payment.");
      location.assign(body.redirectUrl);
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : "Could not open payment.");
      setBusy(false);
    }
  }

  return <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-950/5">
    <div className="relative aspect-[1.586/1] bg-slate-100">{plan.card_image_url ? <Image src={plan.card_image_url} alt={`${plan.name} membership card`} fill sizes="(min-width:768px) 50vw,100vw" className="object-contain" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-slate-950 to-red-800 p-8 text-center text-white"><div><p className="text-xs font-black uppercase tracking-[.25em] text-red-200">Polokwane Chess Club</p><p className="mt-3 text-3xl font-black">{plan.name}</p><p className="mt-3 text-sm text-slate-300">Digital card design coming soon</p></div></div>}</div>
    <div className="p-6">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black">{plan.name}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{plan.description || `${plan.duration_months} month PCC membership.`}</p></div><p className="text-2xl font-black text-red-700">R{plan.price.toLocaleString("en-ZA")}</p></div>
      {!open ? <button onClick={() => setOpen(true)} className="mt-6 w-full rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white">Choose this plan</button> : <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
        <input aria-label="Member full name" placeholder="Member full name" value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        <input aria-label="Member email" type="email" placeholder="Member email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        <input aria-label="Member phone" placeholder="Member phone" value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        <input aria-label="Chess SA ID" placeholder="Chess SA ID (optional)" value={chessa} onChange={(event) => setChessa(event.target.value)} className="w-full rounded-xl border border-slate-300 px-4 py-3" />
        {error && <p className="text-sm font-bold text-red-700">{error}</p>}
        <button disabled={busy || !name || !email || !phone} onClick={() => void pay()} className="w-full rounded-full bg-red-700 px-5 py-4 text-sm font-black text-white disabled:bg-slate-300">{busy ? "Opening secure payment…" : "Pay securely online"}</button>
        <p className="text-center text-xs leading-5 text-slate-500">PCC does not receive or keep your card details.</p>
      </div>}
      <p className="mt-4 text-xs leading-5 text-slate-500">Membership begins when payment is verified. Renewal periods are added after an existing active period.</p>
    </div>
  </article>;
}
