import { publicSupabase } from "@/lib/publicSupabase";

export type StockStatus = "available" | "out-of-stock" | "coming-soon";

export type StoreProduct = {
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
  stock_status: StockStatus;
  stock_quantity: number | null;
  primary_image_url: string | null;
  secondary_image_url: string | null;
  featured: boolean;
  display_order: number;
  available_options?: string[];
  variant_stock?: Record<string, number>;
  organisation_id?: string | null;
  organisations?: { id: string; name: string; logo_url: string | null } | null;
};

export const storeProductFields = "id,name,slug,description,category,colour,regular_price,sale_price,sale_label,sale_starts_at,sale_ends_at,stock_status,stock_quantity,primary_image_url,secondary_image_url,featured,display_order,available_options,variant_stock,organisation_id,organisations(id,name,logo_url)";

const fallbackProducts: StoreProduct[] = [
  { id: "mat", name: "PCC Tournament Chess Mat", slug: "pcc-tournament-chess-mat", description: "A faux-leather tournament chess mat for club, school and competition play.", category: "Chessboard", colour: "Faux leather", regular_price: 160, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "available", stock_quantity: null, primary_image_url: null, secondary_image_url: null, featured: false, display_order: 1 },
  { id: "ys902", name: "YS-902 Digital Chess Clock", slug: "ys-902-digital-chess-clock", description: "A digital chess clock for timed games, training and tournament play.", category: "Chess clock", colour: "YS-902", regular_price: 400, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "available", stock_quantity: null, primary_image_url: null, secondary_image_url: null, featured: false, display_order: 2 },
  { id: "ps1688", name: "PS-1688 Tournament Chess Clock", slug: "ps-1688-tournament-chess-clock", description: "A tournament-grade digital clock for timed competition games.", category: "Chess clock", colour: "PS-1688", regular_price: 750, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "available", stock_quantity: null, primary_image_url: "/images/store/ps-1688-chess-clock.jpg", secondary_image_url: null, featured: false, display_order: 3 },
  { id: "hqt101", name: "HQT101 Digital Chess Clock", slug: "hqt101-digital-chess-clock", description: "A practical digital chess clock for club and tournament games.", category: "Chess clock", colour: "HQT101", regular_price: 600, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "available", stock_quantity: null, primary_image_url: "/images/store/hqt101-chess-clock.png", secondary_image_url: null, featured: false, display_order: 4 },
  { id: "polo", name: "PCC Chess Pieces Polo", slug: "pcc-chess-pieces-polo", description: "A white short-sleeve polo featuring PCC branding and chess-piece artwork.", category: "Polo", colour: "White", regular_price: 550, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "out-of-stock", stock_quantity: null, primary_image_url: "/images/store/pcc-white-polo-front.png", secondary_image_url: "/images/store/pcc-white-polo-back-fixed.png", featured: false, display_order: 5 },
  { id: "hoodie", name: "PCC Club Hoodie", slug: "pcc-club-hoodie", description: "A red pullover hoodie featuring PCC branding and a front pouch pocket.", category: "Hoodie", colour: "Red", regular_price: 750, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "out-of-stock", stock_quantity: null, primary_image_url: "/images/store/pcc-club-hoodie.png", secondary_image_url: null, featured: false, display_order: 6 },
  { id: "jacket", name: "PCC Tournament Jacket", slug: "pcc-tournament-jacket", description: "A black zip-up jacket featuring PCC branding and a tournament-ready finish.", category: "Jacket", colour: "Black", regular_price: 1200, sale_price: null, sale_label: null, sale_starts_at: null, sale_ends_at: null, stock_status: "out-of-stock", stock_quantity: null, primary_image_url: "/images/store/pcc-tournament-jacket.png", secondary_image_url: null, featured: false, display_order: 7 },
  { id: "profile-photo", name: "PCC Player Profile Photo Upgrade", slug: "pcc-player-profile-photo-upgrade", description: "Add a professionally presented portrait to your PCC player profile. After payment, PCC will contact you to collect and approve the correct image for your profile.", category: "PCC Profile Service", colour: "Digital service", regular_price: 50, sale_price: 10, sale_label: "September special", sale_starts_at: "2026-08-31T22:00:00.000Z", sale_ends_at: "2026-09-30T22:00:00.000Z", stock_status: "available", stock_quantity: null, primary_image_url: "/images/store/pcc-profile-photo-upgrade.png", secondary_image_url: null, featured: true, display_order: 8 },
];

const fallbackSellers: Record<string, string> = {
  "pcc-tournament-chess-mat": "Limpopo Chess Academy",
  "ys-902-digital-chess-clock": "Limpopo Chess Academy",
  "ps-1688-tournament-chess-clock": "Limpopo Chess Academy",
  "hqt101-digital-chess-clock": "Limpopo Chess Academy",
};

for (const product of fallbackProducts) {
  product.organisation_id = null;
  product.organisations = { id: "fallback", name: fallbackSellers[product.slug] ?? "Polokwane Chess Club", logo_url: null };
}

for (const product of fallbackProducts) {
  product.available_options = ["polo", "hoodie", "jacket"].includes(product.id) ? ["XS", "S", "M", "L", "XL"] : [];
  product.variant_stock = {};
}

export function isEquipment(product: StoreProduct) {
  return ["chessboard", "chess clock", "equipment"].includes(product.category.toLowerCase());
}

export function isMembership(product: StoreProduct) {
  return product.category.toLowerCase().includes("membership");
}

export function isService(product: StoreProduct) {
  return product.category.toLowerCase().includes("service");
}

export function isSaleActive(product: StoreProduct) {
  if (product.sale_price === null || product.sale_price >= product.regular_price) return false;
  const now = Date.now();
  return (!product.sale_starts_at || new Date(product.sale_starts_at).getTime() <= now)
    && (!product.sale_ends_at || new Date(product.sale_ends_at).getTime() > now);
}

export function currentProductPrice(product: StoreProduct) {
  return isSaleActive(product) ? product.sale_price! : product.regular_price;
}

export function formatRand(value: number) {
  return new Intl.NumberFormat("en-ZA", { style: "currency", currency: "ZAR", maximumFractionDigits: 0 }).format(value);
}

function withApprovedProductMedia(product: StoreProduct) {
  if (product.slug !== "pcc-chess-pieces-polo") return product;
  return {
    ...product,
    primary_image_url: "/images/store/pcc-white-polo-front.png",
    secondary_image_url: "/images/store/pcc-white-polo-back-fixed.png",
  };
}

export async function getStoreProducts() {
  const { data, error } = await publicSupabase
    .from("store_products")
    .select(storeProductFields)
    .eq("published", true)
    .order("featured", { ascending: false })
    .order("display_order", { ascending: true });
  const products = !error && data?.length ? data as unknown as StoreProduct[] : fallbackProducts;
  return products.map(withApprovedProductMedia);
}

export async function getStoreProduct(slug: string) {
  const { data } = await publicSupabase
    .from("store_products")
    .select(storeProductFields)
    .eq("slug", slug)
    .eq("published", true)
    .maybeSingle();
  const product = data as unknown as StoreProduct | null ?? fallbackProducts.find((item) => item.slug === slug) ?? null;
  return product ? withApprovedProductMedia(product) : null;
}
