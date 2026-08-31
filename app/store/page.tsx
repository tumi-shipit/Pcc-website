import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";

import PublicPageShell from "@/components/PublicPageShell";

import hoodieRedBack from "../admin/store-preview/assets/hoodie-red-back.png";
import hoodieRed from "../admin/store-preview/assets/hoodie-red.png";
import jacketBlackBack from "../admin/store-preview/assets/jacket-black-back.png";
import jacketBlack from "../admin/store-preview/assets/jacket-black.png";
import poloWhiteBack from "../admin/store-preview/assets/polo-v2-white-back.png";
import poloWhite from "../admin/store-preview/assets/polo-v2-white.png";

export const metadata: Metadata = {
  title: "PCC Store | Polokwane Chess Club",
  description:
    "Browse the Polokwane Chess Club apparel catalogue. Current products are displayed as out of stock until ordering opens.",
};

type StoreProduct = {
  name: string;
  category: string;
  colour: string;
  description: string;
  price: number;
  availability: "available" | "out-of-stock";
  front?: StaticImageData;
  back?: StaticImageData;
};

const products: StoreProduct[] = [
  {
    name: "PCC Tournament Chess Mat",
    category: "Chessboard",
    colour: "Faux leather",
    description:
      "A faux-leather tournament chess mat for club, school and competition play.",
    price: 160,
    availability: "available",
  },
  {
    name: "YS-902 Digital Chess Clock",
    category: "Chess clock",
    colour: "YS-902",
    description:
      "The YS-902 digital chess-clock model for timed games and tournament play.",
    price: 400,
    availability: "available",
  },
  {
    name: "PS-1688 Tournament Chess Clock",
    category: "Chess clock",
    colour: "PS-1688",
    description:
      "The PS-1688 digital tournament chess-clock model for timed competition games.",
    price: 750,
    availability: "available",
  },
  {
    name: "HQT101 Digital Chess Clock",
    category: "Chess clock",
    colour: "HQT101",
    description:
      "The HQT101 digital chess-clock model for club and tournament games.",
    price: 600,
    availability: "available",
  },
  {
    name: "PCC Chess Pieces Polo",
    category: "Polo",
    colour: "White",
    description:
      "A white short-sleeve polo featuring PCC branding, South African flag detail and chess-piece artwork.",
    price: 550,
    availability: "out-of-stock",
    front: poloWhite,
    back: poloWhiteBack,
  },
  {
    name: "PCC Club Hoodie",
    category: "Hoodie",
    colour: "Red",
    description:
      "A red pullover hoodie featuring PCC branding, chessboard detail and a front pouch pocket.",
    price: 750,
    availability: "out-of-stock",
    front: hoodieRed,
    back: hoodieRedBack,
  },
  {
    name: "PCC Tournament Jacket",
    category: "Jacket",
    colour: "Black",
    description:
      "A black zip-up jacket featuring PCC branding, South African flag detail and a chessboard finish.",
    price: 1200,
    availability: "out-of-stock",
    front: jacketBlack,
    back: jacketBlackBack,
  },
];

export default function StorePage() {
  return (
    <PublicPageShell>
      <main className="min-h-screen bg-[#f4f1ea] text-slate-950">
        <section className="border-b border-white/10 bg-slate-950 px-5 py-16 text-white sm:px-8 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-400">
              PCC Store
            </p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
              Club apparel, made for the chess community.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
              Shop tournament equipment and preview the first PCC apparel
              collection. Online payment will open after the secure checkout is ready.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 text-sm font-bold">
              <span className="rounded-full bg-white/10 px-4 py-2">7 products</span>
              <span className="rounded-full bg-emerald-500/15 px-4 py-2 text-emerald-200">
                Equipment available
              </span>
              <span className="rounded-full bg-red-500/15 px-4 py-2 text-red-200">
                Apparel out of stock
              </span>
            </div>
          </div>
        </section>

        <section className="px-5 py-12 sm:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
                  Current catalogue
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight">PCC apparel</h2>
              </div>
              <p className="text-sm font-semibold text-slate-600">Prices shown in South African rand</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {products.map((product) => (
                <article
                  key={product.name}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
                >
                  <div className="relative">
                    {product.front && product.back ? (
                      <div className="grid grid-cols-2 gap-px bg-slate-200">
                        <ProductImage image={product.front} alt={`${product.name} front view`} label="Front" />
                        <ProductImage image={product.back} alt={`${product.name} back view`} label="Back" />
                      </div>
                    ) : (
                      <EquipmentPreview product={product} />
                    )}
                    <span
                      className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-lg ${
                        product.availability === "available" ? "bg-emerald-700" : "bg-slate-950"
                      }`}
                    >
                      {product.availability === "available" ? "Available" : "Out of stock"}
                    </span>
                  </div>

                  <div className="p-6">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">
                      {product.category} / {product.colour}
                    </p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight">{product.name}</h3>
                    <p className="mt-3 min-h-20 text-sm leading-6 text-slate-600">
                      {product.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                      <span className="text-xl font-black text-slate-950">
                        R{product.price.toLocaleString("en-ZA")}
                      </span>
                      {product.availability === "available" ? (
                        <Link
                          href="/contact"
                          className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-red-700"
                        >
                          Contact to order
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="cursor-not-allowed rounded-xl bg-slate-200 px-4 py-2.5 text-sm font-black text-slate-500"
                        >
                          Out of stock
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <aside className="mt-8 rounded-2xl border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-950">
              <strong>Ordering notice:</strong> Available equipment can currently be ordered by
              contacting PCC. Online payment will only open after secure checkout is fully ready.
            </aside>
          </div>
        </section>
      </main>
    </PublicPageShell>
  );
}

function EquipmentPreview({ product }: { product: StoreProduct }) {
  return (
    <div className="flex aspect-[8/5] flex-col items-center justify-center bg-[radial-gradient(circle_at_top,#334155,#0f172a_68%)] px-6 text-center text-white">
      <span className="text-6xl" aria-hidden="true">
        {product.category === "Chessboard" ? "♟" : "⏱"}
      </span>
      <p className="mt-4 text-xs font-black uppercase tracking-[0.2em] text-slate-300">
        {product.category}
      </p>
      <p className="mt-1 text-lg font-black">{product.colour}</p>
      <p className="mt-3 text-xs font-semibold text-slate-400">Supplier image coming soon</p>
    </div>
  );
}

function ProductImage({
  image,
  alt,
  label,
}: {
  image: StaticImageData;
  alt: string;
  label: string;
}) {
  return (
    <div className="relative aspect-[4/5] overflow-hidden bg-slate-100">
      <Image
        src={image}
        alt={alt}
        fill
        placeholder="blur"
        sizes="(min-width: 1024px) 16vw, 50vw"
        className="object-cover"
      />
      <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-700 backdrop-blur">
        {label}
      </span>
    </div>
  );
}
