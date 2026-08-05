import type { Metadata } from "next";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import hoodieBlackBack from "./assets/hoodie-black-back.png";
import hoodieBlack from "./assets/hoodie-black.png";
import hoodieRedBack from "./assets/hoodie-red-back.png";
import hoodieRed from "./assets/hoodie-red.png";
import hoodieWhiteBack from "./assets/hoodie-white-back.png";
import hoodieWhite from "./assets/hoodie-white.png";
import jacketBlackBack from "./assets/jacket-black-back.png";
import jacketBlack from "./assets/jacket-black.png";
import jacketRedBack from "./assets/jacket-red-back.png";
import jacketRed from "./assets/jacket-red.png";
import jacketWhiteBack from "./assets/jacket-white-back.png";
import jacketWhite from "./assets/jacket-white.png";
import poloClassicBlackBack from "./assets/polo-classic-black-back.png";
import poloClassicBlackCaptain from "./assets/polo-classic-black-captain.png";
import poloClassicBlackManager from "./assets/polo-classic-black-manager.png";
import poloClassicBlack from "./assets/polo-classic-black.png";
import poloClassicRedBack from "./assets/polo-classic-red-back.png";
import poloClassicRed from "./assets/polo-classic-red.png";
import poloClassicWhiteBack from "./assets/polo-classic-white-back.png";
import poloClassicWhiteCaptain from "./assets/polo-classic-white-captain.png";
import poloClassicWhiteManager from "./assets/polo-classic-white-manager.png";
import poloClassicWhite from "./assets/polo-classic-white.png";
import poloV2BlackBack from "./assets/polo-v2-black-back.png";
import poloV2BlackCaptain from "./assets/polo-v2-black-captain.png";
import poloV2BlackManager from "./assets/polo-v2-black-manager.png";
import poloV2Black from "./assets/polo-v2-black.png";
import poloV2RedBack from "./assets/polo-v2-red-back.png";
import poloV2Red from "./assets/polo-v2-red.png";
import poloV2WhiteBack from "./assets/polo-v2-white-back.png";
import poloV2WhiteCaptain from "./assets/polo-v2-white-captain.png";
import poloV2WhiteManager from "./assets/polo-v2-white-manager.png";
import poloV2White from "./assets/polo-v2-white.png";

export const metadata: Metadata = {
  title: "PCC Store Preview | Admin",
  description: "Private PCC merchandise draft preview.",
  robots: {
    index: false,
    follow: false,
  },
};

type ProductDraft = {
  name: string;
  collection: string;
  category: string;
  colour: string;
  front: StaticImageData;
  back?: StaticImageData;
  status: string;
  variants: string[];
  note: string;
};

const products: ProductDraft[] = [
  {
    name: "Classic Tournament Polo",
    collection: "Classic Tournament",
    category: "Polo",
    colour: "Black",
    front: poloClassicBlack,
    back: poloClassicBlackBack,
    status: "Design draft",
    variants: ["Player", "Captain", "Manager"],
    note: "Core black club polo with red trim and checkerboard lower body.",
  },
  {
    name: "Classic Tournament Polo",
    collection: "Classic Tournament",
    category: "Polo",
    colour: "Red",
    front: poloClassicRed,
    back: poloClassicRedBack,
    status: "Design draft",
    variants: ["Player"],
    note: "Red colourway for team presentation and tournament visibility.",
  },
  {
    name: "Classic Tournament Polo",
    collection: "Classic Tournament",
    category: "Polo",
    colour: "White",
    front: poloClassicWhite,
    back: poloClassicWhiteBack,
    status: "Design draft",
    variants: ["Player", "Captain", "Manager"],
    note: "White colourway for warmer events and clean club presentation.",
  },
  {
    name: "Classic Captain Polo",
    collection: "Classic Tournament",
    category: "Polo",
    colour: "Black",
    front: poloClassicBlackCaptain,
    status: "Role draft",
    variants: ["Captain"],
    note: "Role text placement preview for leadership/team wear.",
  },
  {
    name: "Classic Manager Polo",
    collection: "Classic Tournament",
    category: "Polo",
    colour: "Black",
    front: poloClassicBlackManager,
    status: "Role draft",
    variants: ["Manager"],
    note: "Manager version for tournament staff or club representatives.",
  },
  {
    name: "Classic Captain Polo",
    collection: "Classic Tournament",
    category: "Polo",
    colour: "White",
    front: poloClassicWhiteCaptain,
    status: "Role draft",
    variants: ["Captain"],
    note: "White captain version for role comparison.",
  },
  {
    name: "Classic Manager Polo",
    collection: "Classic Tournament",
    category: "Polo",
    colour: "White",
    front: poloClassicWhiteManager,
    status: "Role draft",
    variants: ["Manager"],
    note: "White manager version for role comparison.",
  },
  {
    name: "Chess Pieces Polo V2",
    collection: "Chess Pieces V2",
    category: "Polo",
    colour: "Black",
    front: poloV2Black,
    back: poloV2BlackBack,
    status: "Design draft",
    variants: ["Player", "Captain", "Manager"],
    note: "Second collection with chess-piece illustration and stronger sport identity.",
  },
  {
    name: "Chess Pieces Polo V2",
    collection: "Chess Pieces V2",
    category: "Polo",
    colour: "Red",
    front: poloV2Red,
    back: poloV2RedBack,
    status: "Design draft",
    variants: ["Player"],
    note: "Red V2 colourway with the chess-piece composition.",
  },
  {
    name: "Chess Pieces Polo V2",
    collection: "Chess Pieces V2",
    category: "Polo",
    colour: "White",
    front: poloV2White,
    back: poloV2WhiteBack,
    status: "Design draft",
    variants: ["Player", "Captain", "Manager"],
    note: "White V2 colourway with a cleaner presentation feel.",
  },
  {
    name: "V2 Captain Polo",
    collection: "Chess Pieces V2",
    category: "Polo",
    colour: "Black",
    front: poloV2BlackCaptain,
    status: "Role draft",
    variants: ["Captain"],
    note: "Captain role version from the V2 concept set.",
  },
  {
    name: "V2 Manager Polo",
    collection: "Chess Pieces V2",
    category: "Polo",
    colour: "Black",
    front: poloV2BlackManager,
    status: "Role draft",
    variants: ["Manager"],
    note: "Manager role version from the V2 concept set.",
  },
  {
    name: "V2 Captain Polo",
    collection: "Chess Pieces V2",
    category: "Polo",
    colour: "White",
    front: poloV2WhiteCaptain,
    status: "Role draft",
    variants: ["Captain"],
    note: "White captain role version from the V2 set.",
  },
  {
    name: "V2 Manager Polo",
    collection: "Chess Pieces V2",
    category: "Polo",
    colour: "White",
    front: poloV2WhiteManager,
    status: "Role draft",
    variants: ["Manager"],
    note: "White manager role version from the V2 set.",
  },
  {
    name: "PCC Hoodie",
    collection: "Warm-up Range",
    category: "Hoodie",
    colour: "Black",
    front: hoodieBlack,
    back: hoodieBlackBack,
    status: "Manufacturer review",
    variants: ["Supporter", "Team"],
    note: "Warm-up and supporter concept with club identity.",
  },
  {
    name: "PCC Hoodie",
    collection: "Warm-up Range",
    category: "Hoodie",
    colour: "Red",
    front: hoodieRed,
    back: hoodieRedBack,
    status: "Manufacturer review",
    variants: ["Supporter", "Team"],
    note: "Red hoodie colourway for comparison.",
  },
  {
    name: "PCC Hoodie",
    collection: "Warm-up Range",
    category: "Hoodie",
    colour: "White",
    front: hoodieWhite,
    back: hoodieWhiteBack,
    status: "Manufacturer review",
    variants: ["Supporter", "Team"],
    note: "White hoodie colourway for catalogue review.",
  },
  {
    name: "PCC Tracksuit Jacket",
    collection: "Warm-up Range",
    category: "Jacket",
    colour: "Black",
    front: jacketBlack,
    back: jacketBlackBack,
    status: "Manufacturer review",
    variants: ["Team", "Official"],
    note: "Team jacket concept for officials, players and travel.",
  },
  {
    name: "PCC Tracksuit Jacket",
    collection: "Warm-up Range",
    category: "Jacket",
    colour: "Red",
    front: jacketRed,
    back: jacketRedBack,
    status: "Manufacturer review",
    variants: ["Team", "Official"],
    note: "Red jacket option for range comparison.",
  },
  {
    name: "PCC Tracksuit Jacket",
    collection: "Warm-up Range",
    category: "Jacket",
    colour: "White",
    front: jacketWhite,
    back: jacketWhiteBack,
    status: "Manufacturer review",
    variants: ["Team", "Official"],
    note: "White jacket option for range comparison.",
  },
];

const collectionNames = Array.from(new Set(products.map((item) => item.collection)));

export default function AdminStorePreviewPage() {
  return (
    <AdminGuard>
      <main className="min-h-screen bg-[#f3f0ea] px-4 pb-16 pt-28 text-zinc-950 md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/admin/home"
              className="text-sm font-black text-red-700 transition hover:text-red-600"
            >
              Back to Admin
            </Link>
            <Link
              href="/store"
              className="rounded-full border border-zinc-300 bg-white px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-zinc-700 transition hover:border-red-500 hover:text-red-700"
            >
              Public coming soon page
            </Link>
          </div>

          <section className="mt-6 overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-2xl shadow-zinc-300/40">
            <div className="grid gap-0 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="p-6 md:p-10">
                <p className="text-sm font-black uppercase tracking-[0.28em] text-red-700">
                  Private Store Draft
                </p>
                <h1 className="mt-4 max-w-3xl text-4xl font-black leading-tight md:text-6xl">
                  PCC Merchandise Showroom
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-zinc-600">
                  Internal store preview for apparel concepts while PCC finalises
                  product range, manufacturing, pricing and order flow.
                </p>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  <StoreStat label="Draft items" value={products.length} />
                  <StoreStat label="Collections" value={collectionNames.length} />
                  <StoreStat label="Checkout" value="Off" />
                </div>
              </div>

              <div className="bg-[linear-gradient(135deg,#111_0%,#2b0505_55%,#d9d2c5_55%,#f8f6f1_100%)] p-6 md:p-10">
                <div className="rounded-[1.5rem] bg-white/92 p-5 shadow-2xl">
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-red-700">
                    Store status
                  </p>
                  <h2 className="mt-3 text-2xl font-black">Not ready for public sales</h2>
                  <p className="mt-3 text-sm leading-6 text-zinc-600">
                    Draft visuals stay in this admin-only workspace. The public
                    store remains a coming-soon page until the manufacturer and
                    final catalogue are confirmed.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-8 grid gap-6">
            {collectionNames.map((collection) => {
              const collectionProducts = products.filter(
                (product) => product.collection === collection
              );

              return (
                <div
                  key={collection}
                  className="rounded-[1.5rem] border border-zinc-200 bg-white p-4 shadow-xl shadow-zinc-300/30 md:p-6"
                >
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-red-700">
                        Collection
                      </p>
                      <h2 className="mt-2 text-2xl font-black">{collection}</h2>
                    </div>
                    <p className="text-sm font-bold text-zinc-500">
                      {collectionProducts.length} draft products
                    </p>
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {collectionProducts.map((item) => (
                      <ProductCard key={`${item.name}-${item.colour}`} item={item} />
                    ))}
                  </div>
                </div>
              );
            })}
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function ProductCard({ item }: { item: ProductDraft }) {
  return (
    <article className="overflow-hidden rounded-[1.25rem] border border-zinc-200 bg-[#fbfaf7] shadow-lg shadow-zinc-200/70">
      <div className="grid grid-cols-2 gap-0 bg-[#ebe4d8]">
        <ProductImage image={item.front} label="Front" name={item.name} />
        <ProductImage image={item.back ?? item.front} label={item.back ? "Back" : "Alt"} name={item.name} />
      </div>

      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-700">
              {item.category} / {item.colour}
            </p>
            <h3 className="mt-2 text-lg font-black leading-tight">{item.name}</h3>
          </div>
          <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-black text-red-700">
            {item.status}
          </span>
        </div>

        <p className="mt-3 text-sm leading-6 text-zinc-600">{item.note}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {item.variants.map((variant) => (
            <span
              key={`${item.name}-${item.colour}-${variant}`}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-bold text-zinc-600"
            >
              {variant}
            </span>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black uppercase tracking-[0.16em]">
          <div className="rounded-lg bg-zinc-950 px-3 py-2 text-white">Price TBC</div>
          <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-600">
            Sizes TBC
          </div>
        </div>
      </div>
    </article>
  );
}

function ProductImage({
  image,
  label,
  name,
}: {
  image: StaticImageData;
  label: string;
  name: string;
}) {
  return (
    <div className="relative aspect-[4/5] border-r border-white/50 last:border-r-0">
      <Image
        src={image}
        alt={`${name} ${label.toLowerCase()} view`}
        fill
        sizes="(min-width: 1280px) 18vw, (min-width: 640px) 25vw, 50vw"
        className="object-contain p-3"
      />
      <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-zinc-700">
        {label}
      </span>
    </div>
  );
}

function StoreStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-[#f8f6f1] p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
    </div>
  );
}
