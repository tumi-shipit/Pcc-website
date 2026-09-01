"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartLine = {
  productId: string;
  slug: string;
  name: string;
  price: number;
  imageUrl: string | null;
  quantity: number;
  option?: string;
  maxQuantity?: number;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  total: number;
  add: (line: Omit<CartLine, "quantity">, quantity?: number) => void;
  update: (productId: string, option: string | undefined, quantity: number) => void;
  remove: (productId: string, option?: string) => void;
  clear: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const key = "pcc-store-bag-v1";

function sameLine(a: Pick<CartLine, "productId" | "option">, b: Pick<CartLine, "productId" | "option">) {
  return a.productId === b.productId && (a.option || "") === (b.option || "");
}

export function StoreCartProvider({ children }: { children: React.ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = JSON.parse(localStorage.getItem(key) || "[]") as CartLine[];
        setLines(Array.isArray(stored) ? stored.filter((line) => line.productId && line.quantity > 0) : []);
      } catch { setLines([]); }
      setReady(true);
    });
  }, []);

  useEffect(() => { if (ready) localStorage.setItem(key, JSON.stringify(lines)); }, [lines, ready]);

  const value = useMemo<CartContextValue>(() => ({
    lines,
    count: lines.reduce((sum, line) => sum + line.quantity, 0),
    total: lines.reduce((sum, line) => sum + line.price * line.quantity, 0),
    add(line, quantity = 1) {
      setLines((current) => {
        const found = current.find((item) => sameLine(item, line));
        const maximum = Math.min(20, Math.max(1, line.maxQuantity ?? 20));
        if (!found) return [...current, { ...line, quantity: Math.min(maximum, Math.max(1, quantity)) }];
        return current.map((item) => sameLine(item, line) ? { ...item, quantity: Math.min(maximum, item.quantity + quantity) } : item);
      });
    },
    update(productId, option, quantity) {
      if (quantity <= 0) setLines((current) => current.filter((line) => !sameLine(line, { productId, option })));
      else setLines((current) => current.map((line) => sameLine(line, { productId, option }) ? { ...line, quantity: Math.min(line.maxQuantity ?? 20, 20, quantity) } : line));
    },
    remove(productId, option) { setLines((current) => current.filter((line) => !sameLine(line, { productId, option }))); },
    clear() { setLines([]); },
  }), [lines]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useStoreCart() {
  const value = useContext(CartContext);
  if (!value) throw new Error("useStoreCart must be used within StoreCartProvider");
  return value;
}

export function StoreBagLink() {
  const { count } = useStoreCart();
  return <Link href="/store/cart" className="fixed bottom-5 right-5 z-40 flex items-center gap-3 rounded-full bg-slate-950 px-5 py-3.5 text-sm font-black text-white shadow-2xl shadow-black/25 transition hover:bg-red-700" aria-label={`Shopping bag with ${count} items`}><span aria-hidden="true">Bag</span><span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-xs text-slate-950">{count}</span></Link>;
}
