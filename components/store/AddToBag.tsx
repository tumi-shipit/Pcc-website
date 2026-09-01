"use client";

import { useState } from "react";
import { useStoreCart } from "@/components/store/StoreCart";

type Props = { productId: string; slug: string; name: string; price: number; imageUrl: string | null; maxQuantity: number; apparel: boolean; checkoutOpen?: boolean };

export default function AddToBag({ productId, slug, name, price, imageUrl, maxQuantity, apparel }: Props) {
  const cart = useStoreCart();
  const [quantity, setQuantity] = useState(1);
  const [option, setOption] = useState(apparel ? "M" : "");
  const [added, setAdded] = useState(false);

  return <div className="space-y-5">
    {apparel && <fieldset><legend className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">Select size</legend><div className="mt-3 grid grid-cols-5 gap-2">{["XS","S","M","L","XL"].map((size) => <button key={size} type="button" onClick={() => setOption(size)} className={`rounded-xl border px-2 py-3 text-sm font-black ${option === size ? "border-slate-950 bg-slate-950 text-white" : "border-slate-300 bg-white"}`}>{size}</button>)}</div></fieldset>}
    <div className="flex items-end gap-3"><label className="w-28 text-xs font-black uppercase tracking-[0.14em] text-slate-600">Quantity<input type="number" min="1" max={maxQuantity} value={quantity} onChange={(event) => setQuantity(Math.min(maxQuantity, Math.max(1, Number(event.target.value) || 1)))} className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-3 text-base text-slate-950" /></label><button type="button" onClick={() => { cart.add({ productId, slug, name, price, imageUrl, option: option || undefined }, quantity); setAdded(true); }} className="flex-1 rounded-full bg-slate-950 px-5 py-4 text-sm font-black text-white transition hover:bg-red-700">{added ? "Added to bag" : "Add to bag"}</button></div>
    <p className="text-xs leading-5 text-slate-500">Secure payment by Yoco. Collection or delivery is arranged and confirmed by PCC after payment.</p>
  </div>;
}
