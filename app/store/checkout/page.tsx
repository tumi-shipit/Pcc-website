import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import PublicPageShell from "@/components/PublicPageShell";
import CheckoutForm from "@/components/store/CheckoutForm";
import { publicSupabase } from "@/lib/publicSupabase";
import { activeProductPrice } from "@/lib/storePayments";

export const dynamic = "force-dynamic";

export default async function StoreCheckoutPage({ searchParams }: { searchParams: Promise<{ product?: string }> }) {
  const { product: productId } = await searchParams;
  if (!productId) notFound();

  const { data: product } = await publicSupabase
    .from("store_products")
    .select("id,name,description,regular_price,sale_price,sale_starts_at,sale_ends_at,stock_status,stock_quantity,primary_image_url,published")
    .eq("id", productId)
    .eq("published", true)
    .maybeSingle();
  if (!product) notFound();

  const checkoutOpen = process.env.STORE_CHECKOUT_ENABLED === "true";
  const price = activeProductPrice(product);
  const maxQuantity = Math.max(1, Math.min(20, product.stock_quantity ?? 20));

  return (
    <PublicPageShell>
      <main className="min-h-screen bg-[#f4f1ea] px-5 pb-14 pt-32 text-slate-950 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <Link href="/store" className="text-sm font-black text-red-700">← Back to store</Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
              <div className="relative aspect-square bg-white">{product.primary_image_url ? <Image src={product.primary_image_url} alt={product.name} fill sizes="(min-width:1024px) 40vw, 100vw" className="object-contain" /> : <div className="flex h-full items-center justify-center text-6xl">♟</div>}</div>
              <div className="border-t border-slate-100 p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">Order summary</p><h1 className="mt-2 text-3xl font-black">{product.name}</h1><p className="mt-3 text-sm leading-6 text-slate-600">{product.description}</p><p className="mt-5 text-3xl font-black">R{price.toLocaleString("en-ZA")}</p></div>
            </section>
            {checkoutOpen && product.stock_status === "available" ? <CheckoutForm productId={product.id} maxQuantity={maxQuantity} /> : <div className="rounded-3xl border border-amber-300 bg-amber-50 p-6"><h2 className="text-2xl font-black">Online payment is not open yet</h2><p className="mt-3 leading-7 text-amber-950">Secure online checkout is still in controlled testing. Contact PCC to order this product for now.</p><Link href="/contact" className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Contact PCC</Link></div>}
          </div>
        </div>
      </main>
    </PublicPageShell>
  );
}
