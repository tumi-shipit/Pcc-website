"use client";

import { useState } from "react";
import { useStoreCart } from "@/components/store/StoreCart";

type Props = { productId: string; slug: string; name: string; price: number; imageUrl: string | null; maxQuantity: number; apparel?: boolean; options?: string[]; variantStock?: Record<string, number>; service?: boolean };

export default function AddToBag({ productId, slug, name, price, imageUrl, maxQuantity, apparel = false, options = [], variantStock = {}, service = false }: Props) {
  const cart = useStoreCart();
  const effectiveOptions = options.length ? options : apparel ? ["XS", "S", "M", "L", "XL"] : [];
  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState(effectiveOptions.find((value) => (variantStock[value] ?? 1) > 0) ?? "");
  const [added, setAdded] = useState(false);

  return <div className="space-y-5">
    {effectiveOptions.length > 0 && <fieldset><legend className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Select option</legend><div className="mt-3 grid grid-cols-5 gap-2">{effectiveOptions.map((value) => { const soldOut = variantStock[value] === 0; return <button key={value} type="button" disabled={soldOut} onClick={() => setOption(value)} className={`rounded-xl border px-2 py-3 text-sm font-black disabled:cursor-not-allowed disabled:opacity-35 ${option === value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}>{value}</button>; })}</div></fieldset>}
    <div className="flex items-end gap-3">{!service&&<label className="w-28 text-xs font-black uppercase tracking-[0.14em] text-slate-600">Quantity<input type="number" min="1" max={option && variantStock[option] ? Math.min(maxQuantity, variantStock[option]) : maxQuantity} value={quantity} onChange={(event) => setQuantity(Math.min(maxQuantity, Math.max(1, Number(event.target.value) || 1)))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-base text-slate-950" /></label>}<button type="button" disabled={effectiveOptions.length > 0 && !option} onClick={() => { cart.add({ productId, slug, name, price, imageUrl, option: option || undefined, maxQuantity, service }, service?1:quantity); setAdded(true); }} className="flex-1 rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-red-700 disabled:bg-slate-300">{added ? "Added to bag" : service?"Add profile upgrade":"Add to bag"}</button></div>
    <p className="text-xs leading-5 text-slate-500">{service ? "Pay securely online. PCC will contact you after payment to collect and approve the portrait for the correct player profile." : "Pay securely online. Collection or delivery is arranged and confirmed by PCC after payment."} PCC does not receive or keep your card details.</p>
  </div>;
}
