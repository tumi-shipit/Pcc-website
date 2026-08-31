import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import PublicPageShell from "@/components/PublicPageShell";
import { publicSupabase } from "@/lib/publicSupabase";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PCC Chess Store | Equipment and Club Apparel",
  description: "Shop tournament chess equipment and Polokwane Chess Club apparel. View current prices, stock and specials.",
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
  return (!product.sale_starts_at || new Date(product.sale_starts_at).getTime() <= now) && (!product.sale_ends_at || new Date(product.sale_ends_at).getTime() > now);
}

async function getProducts() {
  const { data, error } = await publicSupabase.from("store_products").select("id,name,slug,description,category,colour,regular_price,sale_price,sale_label,sale_starts_at,sale_ends_at,stock_status,stock_quantity,primary_image_url,secondary_image_url,featured,display_order").eq("published", true).order("featured", { ascending: false }).order("display_order", { ascending: true });
  return !error && data ? (data as StoreProduct[]) : fallbackProducts;
}

export default async function StorePage() {
  const products = await getProducts();
  const equipment = products.filter((product) => ["chessboard", "chess clock", "equipment"].includes(product.category.toLowerCase()));
  const apparel = products.filter((product) => !equipment.includes(product));
  const checkoutOpen = process.env.STORE_CHECKOUT_ENABLED === "true";
  const availableCount = products.filter((product) => product.stock_status === "available").length;

  return (
    <PublicPageShell>
      <main className="min-h-screen bg-[#f6f4ef] pt-[88px] text-slate-950">
        <div className="bg-red-700 px-4 py-2.5 text-center text-xs font-black uppercase tracking-[0.14em] text-white">PCC Store · Prices in South African rand · Stock managed by the club</div>

        <section className="relative overflow-hidden bg-slate-950 px-5 py-16 text-white sm:px-8 lg:py-24">
          <div className="absolute inset-0 opacity-[0.08] [background-image:linear-gradient(45deg,#fff_25%,transparent_25%),linear-gradient(-45deg,#fff_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#fff_75%),linear-gradient(-45deg,transparent_75%,#fff_75%)] [background-position:0_0,0_24px,24px_-24px,-24px_0] [background-size:48px_48px]" />
          <div className="relative mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div><p className="text-xs font-black uppercase tracking-[0.25em] text-red-300">Official PCC Store</p><h1 className="mt-4 max-w-4xl text-5xl font-black leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">Built for players.<br /><span className="text-red-500">Ready for competition.</span></h1><p className="mt-6 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Tournament equipment and club apparel selected for the Polokwane chess community.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#equipment" className="rounded-xl bg-red-600 px-5 py-3 text-sm font-black text-white transition hover:bg-red-500">Shop equipment</a><a href="#apparel" className="rounded-xl border border-white/20 bg-white/5 px-5 py-3 text-sm font-black text-white transition hover:bg-white/10">View apparel</a></div></div>
            <div className="grid grid-cols-2 gap-3"><HeroStat value={String(products.length)} label="Products" /><HeroStat value={String(availableCount)} label="Available now" /><HeroStat value="ZAR" label="Local pricing" /><HeroStat value="PCC" label="Club managed" /></div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white px-5 py-5 sm:px-8"><div className="mx-auto grid max-w-7xl gap-4 text-sm sm:grid-cols-3"><TrustItem title="Current stock" text="Availability is updated by PCC administrators." /><TrustItem title="Secure checkout" text={checkoutOpen ? "Payments are completed on Yoco’s hosted checkout." : "Yoco checkout is undergoing final controlled testing."} /><TrustItem title="Direct support" text="PCC assists with product and order questions." /></div></section>

        <ProductSection id="equipment" eyebrow="Tournament essentials" title="Chess equipment" description="Boards and clocks for schools, clubs, training and competition." products={equipment} checkoutOpen={checkoutOpen} />
        <ProductSection id="apparel" eyebrow="Represent the club" title="PCC apparel" description="Official clubwear concepts with current availability shown on every item." products={apparel} checkoutOpen={checkoutOpen} muted />

        <section className="px-5 pb-16 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-5 rounded-3xl bg-slate-950 p-7 text-white sm:flex-row sm:items-center sm:justify-between lg:p-10"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">Need help choosing?</p><h2 className="mt-2 text-3xl font-black">Speak directly to PCC.</h2><p className="mt-2 text-sm leading-6 text-slate-300">Ask about stock, quantities, collection or product details before ordering.</p></div><Link href="/contact" className="shrink-0 rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-slate-950">Contact the club</Link></div></section>
      </main>
    </PublicPageShell>
  );
}

function ProductSection({ id, eyebrow, title, description, products, checkoutOpen, muted = false }: { id: string; eyebrow: string; title: string; description: string; products: StoreProduct[]; checkoutOpen: boolean; muted?: boolean }) {
  if (products.length === 0) return null;
  return <section id={id} className={`scroll-mt-24 px-5 py-14 sm:px-8 lg:py-20 ${muted ? "bg-[#ede9e1]" : ""}`}><div className="mx-auto max-w-7xl"><div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">{eyebrow}</p><h2 className="mt-2 text-4xl font-black tracking-tight">{title}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{description}</p></div><span className="text-sm font-black text-slate-500">{products.length} {products.length === 1 ? "product" : "products"}</span></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{products.map((product) => <ProductCard key={product.id} product={product} checkoutOpen={checkoutOpen} />)}</div></div></section>;
}

function ProductCard({ product, checkoutOpen }: { product: StoreProduct; checkoutOpen: boolean }) {
  const onSale = isSaleActive(product);
  const available = product.stock_status === "available";
  const statusLabel = available ? "In stock" : product.stock_status === "coming-soon" ? "Coming soon" : "Out of stock";
  const currentPrice = onSale ? product.sale_price : product.regular_price;
  return <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_10px_35px_rgba(15,23,42,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_45px_rgba(15,23,42,0.12)]"><div className="relative aspect-square overflow-hidden bg-[#f8f8f6]">{product.primary_image_url ? <Image src={product.primary_image_url} alt={product.name} fill sizes="(min-width:1024px) 25vw,(min-width:640px) 50vw,100vw" className="object-contain p-3 transition duration-500 group-hover:scale-[1.03]" /> : <ProductPlaceholder category={product.category} model={product.colour} />}<span className={`absolute left-3 top-3 rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-white ${available ? "bg-emerald-700" : "bg-slate-900"}`}>{statusLabel}</span>{onSale && <span className="absolute right-3 top-3 rounded-full bg-red-600 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-white">{product.sale_label || "Special"}</span>}</div><div className="flex flex-1 flex-col p-5"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">{product.category}{product.colour ? ` · ${product.colour}` : ""}</p><h3 className="mt-2 text-xl font-black leading-tight tracking-tight">{product.name}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{product.description}</p><div className="mt-auto pt-6"><div className="flex items-end gap-2"> <span className={`text-2xl font-black ${onSale ? "text-red-700" : "text-slate-950"}`}>R{currentPrice?.toLocaleString("en-ZA")}</span>{onSale && <span className="pb-1 text-sm font-bold text-slate-400 line-through">R{product.regular_price.toLocaleString("en-ZA")}</span>}</div>{available ? <Link href={checkoutOpen ? `/store/checkout?product=${product.id}` : "/contact"} className="mt-4 block w-full rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-red-700">{checkoutOpen ? "Buy now" : "Contact to order"}</Link> : <button type="button" disabled className="mt-4 w-full cursor-not-allowed rounded-xl bg-slate-100 px-4 py-3 text-sm font-black text-slate-400">{statusLabel}</button>}</div></div></article>;
}

function ProductPlaceholder({ category, model }: { category: string; model: string | null }) {
  const isBoard = category.toLowerCase().includes("board");
  return <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#fff,#e8e6e1)] p-6 text-center"><span className="text-7xl text-slate-800" aria-hidden="true">{isBoard ? "♟" : "⏱"}</span><p className="mt-4 text-xs font-black uppercase tracking-[0.18em] text-slate-500">{category}</p>{model && <p className="mt-1 text-sm font-black text-slate-800">{model}</p>}<p className="mt-3 text-[11px] font-semibold text-slate-400">Product photo coming soon</p></div>;
}

function HeroStat({ value, label }: { value: string; label: string }) { return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur"><p className="text-2xl font-black text-white">{value}</p><p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p></div>; }
function TrustItem({ title, text }: { title: string; text: string }) { return <div className="border-l-2 border-red-600 pl-4"><p className="font-black text-slate-950">{title}</p><p className="mt-1 text-xs leading-5 text-slate-500">{text}</p></div>; }
