"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useStoreCart } from "@/components/store/StoreCart";

const methods = [
  { id: "collection", title: "Collection", detail: "Free · Address shown after payment", fee: 0 },
  { id: "polokwane_delivery", title: "Polokwane delivery", detail: "Same day or next day", fee: 70 },
  { id: "paxi_store", title: "PAXI store to store", detail: "3–7 days", fee: 150 },
  { id: "paxi_home", title: "PAXI home to home", detail: "3–7 days", fee: 170 },
] as const;

export default function CartCheckout({ checkoutOpen }: { checkoutOpen: boolean }) {
  const cart = useStoreCart();
  const [customerName, setName] = useState("");
  const [customerEmail, setEmail] = useState("");
  const [customerPhone, setPhone] = useState("");
  const [fulfillmentMethod, setMethod] = useState<(typeof methods)[number]["id"]>("collection");
  const [deliveryAddress, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasService = cart.lines.some((line) => line.service);
  const selected = methods.find((method) => method.id === fulfillmentMethod)!;

  async function pay() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/store/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.lines.map((line) => ({ productId: line.productId, quantity: line.quantity, option: line.option })), customerName, customerEmail, customerPhone, fulfillmentMethod, deliveryAddress }) });
      const body = await response.json() as { redirectUrl?: string; error?: string };
      if (!response.ok || !body.redirectUrl) throw new Error(body.error || "Could not start payment.");
      window.location.assign(body.redirectUrl);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Could not start payment."); setLoading(false); }
  }

  if (!cart.lines.length) return <div className="py-24 text-center"><h1 className="text-4xl font-black">Your bag is empty.</h1><p className="mt-3 text-slate-500">Choose equipment, clubwear or a PCC service to begin.</p><Link href="/store" className="mt-7 inline-block rounded-full bg-slate-950 px-7 py-3.5 text-sm font-black text-white">Continue shopping</Link></div>;
  return <div className="grid gap-10 lg:grid-cols-[1fr_25rem]">
    <section><h1 className="text-4xl font-black tracking-tight sm:text-5xl">Your bag</h1><div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">{cart.lines.map((line) => <article key={`${line.productId}-${line.option || ""}`} className="grid grid-cols-[7rem_1fr] gap-5 py-6"><div className="relative aspect-square bg-[#f5f5f3]">{line.imageUrl && <Image src={line.imageUrl} alt={line.name} fill sizes="112px" className="object-contain p-2" />}</div><div><div className="flex justify-between gap-4"><div><Link href={`/store/${line.slug}`} className="font-black hover:underline">{line.name}</Link>{line.option && <p className="mt-1 text-xs text-slate-500">Option: {line.option}</p>}</div><p className="font-black">R{(line.price * line.quantity).toLocaleString("en-ZA")}</p></div><div className="mt-4 flex items-center gap-4">{!line.service && <label className="text-xs font-bold">Qty <input type="number" min="1" max={line.maxQuantity ?? 20} value={line.quantity} onChange={(event) => cart.update(line.productId, line.option, Number(event.target.value) || 1)} className="ml-2 w-16 rounded-lg border border-slate-300 px-2 py-2" /></label>}<button type="button" onClick={() => cart.remove(line.productId, line.option)} className="text-xs font-black underline">Remove</button></div></div></article>)}</div></section>
    <aside className="h-fit bg-[#f5f5f3] p-6 lg:sticky lg:top-28"><h2 className="text-2xl font-black">Order summary</h2><div className="mt-5 space-y-2 border-b border-slate-300 pb-5 text-sm"><div className="flex justify-between"><span>{cart.count} items</span><strong>R{cart.total.toLocaleString("en-ZA")}</strong></div><div className="flex justify-between"><span>{selected.title}</span><strong>{selected.fee ? `R${selected.fee}` : "Free"}</strong></div><div className="flex justify-between pt-2 text-lg"><strong>Total</strong><strong>R{(cart.total + selected.fee).toLocaleString("en-ZA")}</strong></div></div>
      <fieldset className="mt-6"><legend className="text-xs font-black uppercase tracking-[.14em] text-slate-600">Collection or delivery</legend><div className="mt-3 space-y-2">{methods.map((method) => <label key={method.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${fulfillmentMethod === method.id ? "border-slate-950 bg-white" : "border-slate-300"}`}><input type="radio" name="fulfilment" checked={fulfillmentMethod === method.id} onChange={() => setMethod(method.id)} className="mt-1" /><span className="flex-1 text-sm"><strong className="block">{method.title} · {method.fee ? `R${method.fee}` : "Free"}</strong><span className="text-xs text-slate-500">{method.detail}</span></span></label>)}</div></fieldset>
      {fulfillmentMethod !== "collection" && <label className="mt-4 block text-xs font-black uppercase tracking-[.14em] text-slate-600">{fulfillmentMethod === "paxi_store" ? "Destination PAXI store and contact details" : "Delivery address"}<textarea value={deliveryAddress} onChange={(event) => setAddress(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-normal normal-case tracking-normal text-slate-950" /></label>}
      <div className="mt-6 space-y-4"><input aria-label="Full name" placeholder="Full name" value={customerName} onChange={(event) => setName(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /><input aria-label="Email address" type="email" placeholder="Email address" value={customerEmail} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /><input aria-label="Phone number" placeholder="Phone number" value={customerPhone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3" /></div>
      {error && <p className="mt-4 text-sm font-bold text-red-700">{error}</p>}<button type="button" disabled={!checkoutOpen || loading || !customerName || !customerEmail || !customerPhone || (fulfillmentMethod !== "collection" && deliveryAddress.length < 10)} onClick={() => void pay()} className="mt-6 w-full rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white disabled:cursor-not-allowed disabled:bg-slate-300">{checkoutOpen ? loading ? "Opening secure payment…" : "Pay securely online" : "Online ordering opens soon"}</button>
      <p className="mt-4 text-xs leading-5 text-slate-500">PCC does not receive or keep your card details. The collection address is provided only after confirmed payment. A courier of your choice can also be arranged by contacting PCC before ordering. {hasService && "For profile services, PCC contacts you after payment."}</p><Link href="/store/policies" className="mt-3 inline-block text-xs font-black underline">Delivery, returns and payment information</Link>
    </aside>
  </div>;
}
