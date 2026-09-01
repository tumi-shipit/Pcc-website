import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import PublicPageShell from "@/components/PublicPageShell";
import AddToBag from "@/components/store/AddToBag";
import { currentProductPrice, formatRand, getStoreProduct, getStoreProducts, isEquipment, isMembership, isSaleActive, isService } from "@/lib/storeCatalogue";
import { publicPageMetadata } from "@/lib/publicMetadata";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: PageProps<"/store/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) return { title: "Product | PCC Store" };
  const title = `${product.name} | PCC Store`;
  const description = product.description ?? "Shop this product securely from the Polokwane Chess Club online store.";
  const base = publicPageMetadata({ title, description, path: `/store/${slug}`, preview: "store" });
  const image = product.primary_image_url || "/share-image?page=store";
  return { ...base, openGraph: { ...base.openGraph, images: [{ url: image, alt: product.name }] }, twitter: { ...base.twitter, images: [image] } };
}

export default async function ProductPage({ params }: PageProps<"/store/[slug]">) {
  const { slug } = await params;
  const product = await getStoreProduct(slug);
  if (!product) notFound();
  const service = isService(product);
  const all = await getStoreProducts();
  const related = all.filter((item) => item.id !== product.id && isEquipment(item) === isEquipment(product) && isMembership(item) === isMembership(product) && isService(item) === service).slice(0, 3);
  const available = product.stock_status === "available";
  const sale = isSaleActive(product);
  const price = currentProductPrice(product);
  const apparel = !isEquipment(product) && !isMembership(product) && !service;
  const images = [product.primary_image_url, product.secondary_image_url].filter(Boolean) as string[];

  return <PublicPageShell><main className="min-h-screen bg-white px-5 pb-20 pt-32 text-slate-950 sm:px-8"><div className="mx-auto max-w-7xl">
    <nav className="mb-7 flex gap-2 text-xs font-bold text-slate-500"><Link href="/store">Store</Link><span>/</span><span>{product.category}</span></nav>
    <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:gap-16">
      <section className={`grid gap-3 ${images.length > 1 ? "sm:grid-cols-2" : ""}`}>{images.length ? images.map((src, index) => <div key={src} className="relative aspect-square bg-[#f5f5f3]"><Image src={src} alt={`${product.name}${index ? " alternate view" : ""}`} fill sizes="(min-width:1024px) 30vw,100vw" className="object-contain p-4" preload={index === 0} /></div>) : <div className="flex aspect-square items-center justify-center bg-[#f5f5f3] text-8xl">{product.category.toLowerCase().includes("board") ? "♟" : "⏱"}</div>}</section>
      <section className="lg:sticky lg:top-28 lg:self-start"><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">{product.category}{product.colour ? ` · ${product.colour}` : ""}</p><h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{product.name}</h1>
        <div className="mt-5 flex items-baseline gap-3"><span className={`text-3xl font-black ${sale ? "text-red-700" : ""}`}>{formatRand(price)}</span>{sale && <><span className="text-lg text-slate-400 line-through">{formatRand(product.regular_price)}</span><span className="bg-red-100 px-2 py-1 text-xs font-black text-red-700">Save {Math.round((1 - price / product.regular_price) * 100)}%</span></>}</div>
        <p className="mt-6 text-base leading-7 text-slate-600">{product.description}</p><div className={`mt-6 inline-flex items-center gap-2 text-sm font-black ${available ? "text-emerald-700" : "text-slate-500"}`}><span className={`h-2 w-2 rounded-full ${available ? "bg-emerald-600" : "bg-slate-400"}`} />{available ? service ? "Available online" : "In stock" : product.stock_status === "coming-soon" ? "Coming soon" : "Sold out"}</div>
        <div className="mt-8 border-t border-slate-200 pt-7">{available ? <AddToBag productId={product.id} slug={product.slug} name={product.name} price={price} imageUrl={product.primary_image_url} maxQuantity={service ? 1 : Math.min(20, product.stock_quantity ?? 20)} apparel={apparel} options={product.available_options} variantStock={product.variant_stock} service={service} /> : <Link href="/contact" className="block rounded-full bg-slate-950 px-6 py-4 text-center text-sm font-black text-white">Ask PCC about availability</Link>}</div>
        <dl className="mt-9 divide-y divide-slate-200 border-y border-slate-200 text-sm"><Detail term="Product" value={product.category} /><Detail term="Format" value={service ? "Profile image service" : product.colour || "As shown"} /><Detail term="Payment" value="Secure online payment" /><Detail term="Fulfilment" value={service ? "PCC contacts you to collect and approve your portrait" : "Collection or delivery selected at checkout"} /></dl>
      </section>
    </div>
    {related.length > 0 && <section className="mt-24"><h2 className="text-3xl font-black tracking-tight">You may also like</h2><div className="mt-7 grid gap-5 sm:grid-cols-3">{related.map((item) => <Link key={item.id} href={`/store/${item.slug}`} className="group"><div className="relative aspect-square bg-[#f5f5f3]">{item.primary_image_url && <Image src={item.primary_image_url} alt={item.name} fill sizes="33vw" className="object-contain p-4" />}</div><h3 className="mt-3 font-black group-hover:underline">{item.name}</h3><p className="mt-1 text-sm">{formatRand(currentProductPrice(item))}</p></Link>)}</div></section>}
  </div></main></PublicPageShell>;
}

function Detail({ term, value }: { term: string; value: string }) { return <div className="grid grid-cols-[8rem_1fr] gap-4 py-4"><dt className="font-black">{term}</dt><dd className="text-slate-600">{value}</dd></div>; }
