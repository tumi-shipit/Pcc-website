import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import PublicPageShell from "@/components/PublicPageShell";
import { publicSupabase } from "@/lib/publicSupabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PCC Store | Polokwane Chess Club",
  description: "Shop Polokwane Chess Club tournament equipment and club apparel.",
};

type StoreProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string;
  colour: string | null;
  regular_price: number;
  sale_price: number | null;
  sale_label: string | null;
  sale_starts_at: string | null;
  sale_ends_at: string | null;
  stock_status: "available" | "out-of-stock" | "coming-soon";
  stock_quantity: number | null;
  primary_image_url: string | null;
  secondary_image_url: string | null;
  featured: boolean;
  display_order: number;
};

const fallbackProducts: StoreProduct[] = [
  { id: "mat", name: "PCC Tournament Chess Mat", slug: "pcc-tournament-chess-mat", description: "A faux-leather tournament chess mat for club, school and competition play.", category: "Chessboard", colour: "Faux leather", regular_price: 160, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "available", stock_quantity: null, primary_image_url: null, secondary_image_url: null, featured: false, display_order: 1 },
  { id: "ys902", name: "YS-902 Digital Chess Clock", slug: "ys-902-digital-chess-clock", description: "The YS-902 digital chess-clock model for timed games and tournament play.", category: "Chess clock", colour: "YS-902", regular_price: 400, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "available", stock_quantity: null, primary_image_url: null, secondary_image_url: null, featured: false, display_order: 2 },
  { id: "ps1688", name: "PS-1688 Tournament Chess Clock", slug: "ps-1688-tournament-chess-clock", description: "The PS-1688 digital tournament chess-clock model for timed competition games.", category: "Chess clock", colour: "PS-1688", regular_price: 750, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "available", stock_quantity: null, primary_image_url: "/images/store/ps-1688-chess-clock.jpg", secondary_image_url: null, featured: false, display_order: 3 },
  { id: "hqt101", name: "HQT101 Digital Chess Clock", slug: "hqt101-digital-chess-clock", description: "The HQT101 digital chess-clock model for club and tournament games.", category: "Chess clock", colour: "HQT101", regular_price: 600, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "available", stock_quantity: null, primary_image_url: "/images/store/hqt101-chess-clock.png", secondary_image_url: null, featured: false, display_order: 4 },
  { id: "polo", name: "PCC Chess Pieces Polo", slug: "pcc-chess-pieces-polo", description: "A white short-sleeve polo featuring PCC branding, South African flag detail and chess-piece artwork.", category: "Polo", colour: "White", regular_price: 550, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "out-of-stock", stock_quantity: null, primary_image_url: "/images/store/pcc-chess-pieces-polo.png", secondary_image_url: "/images/store/pcc-chess-pieces-polo-back.png", featured: false, display_order: 5 },
  { id: "hoodie", name: "PCC Club Hoodie", slug: "pcc-club-hoodie", description: "A red pullover hoodie featuring PCC branding, chessboard detail and a front pouch pocket.", category: "Hoodie", colour: "Red", regular_price: 750, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "out-of-stock", stock_quantity: null, primary_image_url: "/images/store/pcc-club-hoodie.png", secondary_image_url: null, featured: false, display_order: 6 },
  { id: "jacket", name: "PCC Tournament Jacket", slug: "pcc-tournament-jacket", description: "A black zip-up jacket featuring PCC branding, South African flag detail and a chessboard finish.", category: "Jacket", colour: "Black", regular_price: 1200, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "out-of-stock", stock_quantity: null, primary_image_url: "/images/store/pcc-tournament-jacket.png", secondary_image_url: null, featured: false, display_order: 7 },
];

function isSaleActive(product: StoreProduct) {
  if (product.sale_price === null || product.sale_price >= product.regular_price) return false;
  const now = Date.now();
  return (!product.sale_starts_at || new Date(product.sale_starts_at).getTime() <= now) &&
    (!product.sale_ends_at || new Date(product.sale_ends_at).getTime() > now);
}

async function getProducts() {
  const { data, error } = await publicSupabase
    .from("store_products")
    .select("id,name,slug,description,category,colour,regular_price,sale_price,sale_label,sale_starts_at,sale_ends_at,stock_status,stock_quantity,primary_image_url,secondary_image_url,featured,display_order")
    .eq("published", true)
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true });

  return !error && data ? (data as StoreProduct[]) : fallbackProducts;
}

export default async function StorePage() {
  const products = await getProducts();
  const availableCount = products.filter((product) => product.stock_status === "available").length;

  return (
    <PublicPageShell>
      <main className="min-h-screen bg-[#f4f1ea] text-slate-950">
        <section className="border-b border-white/10 bg-slate-950 px-5 py-16 text-white sm:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">PCC Store</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">Chess equipment and club apparel.</h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Browse PCC products, current prices and active specials. Online payment will open after secure checkout is ready.</p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
              <span className="rounded-full bg-white/10 px-4 py-2">{products.length} products</span>
              <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-emerald-200">{availableCount} available</span>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Current catalogue</p><h2 className="mt-2 text-3xl font-black tracking-tight">PCC products</h2></div>
              <p className="text-sm font-semibold text-slate-600">Prices shown in South African rand</p>
            </div>

            {products.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center"><h2 className="text-2xl font-black">No products are currently published</h2><p className="mt-3 text-slate-600">Please check again soon.</p></div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-3">
                {products.map((product) => <ProductCard key={product.id} product={product} />)}
              </div>
            )}

            <aside className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950"><strong>Ordering notice:</strong> Available products can currently be ordered by contacting PCC. Online payment will only open after secure checkout is fully ready.</aside>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}

function ProductCard({ product }: { product: StoreProduct }) {
  const onSale = isSaleActive(product);
  const statusLabel = product.stock_status === "available" ? "Available" : product.stock_status === "coming-soon" ? "Coming soon" : "Out of stock";

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
      <div className="relative">
        {product.primary_image_url ? (
          product.secondary_image_url ? (
            <div className="grid grid-cols-2 gap-px bg-slate-200"><ProductImage url={product.primary_image_url} alt={`${product.name} first view`} label="Front" /><ProductImage url={product.secondary_image_url} alt={`${product.name} second view`} label="Back" /></div>
          ) : (
            <SingleProductImage url={product.primary_image_url} alt={product.name} />
          )
        ) : <EquipmentPreview product={product} />}
        <span className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-lg ${product.stock_status === "available" ? "bg-emerald-700" : "bg-slate-950"}`}>{statusLabel}</span>
        {onSale && <span className="absolute right-4 top-4 rounded-full bg-red-600 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-lg">{product.sale_label || "Special"}</span>}
      </div>
      <div className="p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{product.category}{product.colour ? ` / ${product.colour}` : ""}</p>
        <h3 className="mt-2 text-2xl font-black tracking-tight">{product.name}</h3>
        <p className="mt-3 min-h-20 text-sm leading-6 text-slate-600">{product.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
          <div>{onSale ? <><p className="text-xl font-black text-red-700">R{product.sale_price?.toLocaleString("en-ZA")}</p><p className="text-sm font-bold text-slate-400 line-through">R{product.regular_price.toLocaleString("en-ZA")}</p></> : <span className="text-xl font-black">R{product.regular_price.toLocaleString("en-ZA")}</span>}</div>
          {product.stock_status === "available" ? <Link href="/contact" className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700">Contact to order</Link> : <button type="button" disabled className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-black text-slate-500">{statusLabel}</button>}
        </div>
      </div>
    </article>
  );
}

function SingleProductImage({ url, alt }: { url: string; alt: string }) {
  return <div className="relative aspect-[8/5] overflow-hidden bg-white"><Image src={url} alt={alt} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-contain" /></div>;
}

function EquipmentPreview({ product }: { product: StoreProduct }) {
  return <div className="flex aspect-[8/5] flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#334155,#0f172a_68%)] px-6 text-center text-white"><span className="text-6xl" aria-hidden="true">{product.category.toLowerCase().includes("board") ? "♟" : "⏱"}</span><p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-300">{product.category}</p><p className="mt-1 text-lg font-black">{product.colour}</p><p className="mt-3 text-xs font-semibold text-slate-400">Product image coming soon</p></div>;
}

function ProductImage({ url, alt, label }: { url: string; alt: string; label: string }) {
  return <div className="relative aspect-[4/5] overflow-hidden bg-white"><Image src={url} alt={alt} fill sizes="(min-width: 1024px) 16vw, 50vw" className="object-cover" /><span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 backdrop-blur">{label}</span></div>;
}
