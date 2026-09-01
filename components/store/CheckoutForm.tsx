"use client";

import { FormEvent, useState } from "react";

export default function CheckoutForm({ productId, maxQuantity }: { productId: string; maxQuantity: number }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          quantity: Number(form.get("quantity")),
          customerName: form.get("customerName"),
          customerEmail: form.get("customerEmail"),
          customerPhone: form.get("customerPhone"),
        }),
      });
      const result = (await response.json()) as { redirectUrl?: string; error?: string };
      if (!response.ok || !result.redirectUrl) throw new Error(result.error || "Could not start payment.");
      window.location.assign(result.redirectUrl);
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Could not start payment.");
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/70">
      <h2 className="text-2xl font-black">Your details</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">PCC will use these details to confirm your order and arrange collection or delivery.</p>
      <div className="mt-6 grid gap-4">
        <label className="text-sm font-bold">Full name<input name="customerName" required maxLength={100} autoComplete="name" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-600" /></label>
        <label className="text-sm font-bold">Email address<input name="customerEmail" type="email" required maxLength={180} autoComplete="email" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-600" /></label>
        <label className="text-sm font-bold">Phone number<input name="customerPhone" type="tel" required minLength={7} maxLength={40} autoComplete="tel" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-600" /></label>
        <label className="text-sm font-bold">Quantity<input name="quantity" type="number" min="1" max={maxQuantity} defaultValue="1" required className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-red-600" /></label>
      </div>
      {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-800">{error}</p>}
      <button type="submit" disabled={submitting} className="mt-6 w-full rounded-xl bg-slate-950 px-5 py-3.5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? "Opening secure payment..." : "Pay securely online"}</button>
      <p className="mt-4 text-center text-xs leading-5 text-slate-500">PCC does not receive or keep your card details.</p>
    </form>
  );
}
