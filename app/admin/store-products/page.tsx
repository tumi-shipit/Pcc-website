"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

import AdminGuard from "@/components/AdminGuard";
import { resizeImageForUpload } from "@/lib/imageCompression";
import { supabase } from "@/lib/supabase";

type StockStatus = "available" | "out-of-stock" | "coming-soon";

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
  stock_status: StockStatus;
  stock_quantity: number | null;
  primary_image_url: string | null;
  secondary_image_url: string | null;
  published: boolean;
  featured: boolean;
  display_order: number;
};

type ProductForm = {
  name: string;
  slug: string;
  description: string;
  category: string;
  colour: string;
  regular_price: string;
  sale_price: string;
  sale_label: string;
  sale_starts_at: string;
  sale_ends_at: string;
  stock_status: StockStatus;
  stock_quantity: string;
  primary_image_url: string;
  secondary_image_url: string;
  published: boolean;
  featured: boolean;
  display_order: string;
};

const emptyForm: ProductForm = {
  name: "",
  slug: "",
  description: "",
  category: "Equipment",
  colour: "",
  regular_price: "",
  sale_price: "",
  sale_label: "Special",
  sale_starts_at: "",
  sale_ends_at: "",
  stock_status: "available",
  stock_quantity: "",
  primary_image_url: "",
  secondary_image_url: "",
  published: false,
  featured: false,
  display_order: "0",
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500";

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toLocalDateTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}

function isSaleActive(product: StoreProduct) {
  if (product.sale_price === null || product.sale_price >= product.regular_price) return false;
  const now = Date.now();
  return (!product.sale_starts_at || new Date(product.sale_starts_at).getTime() <= now) &&
    (!product.sale_ends_at || new Date(product.sale_ends_at).getTime() > now);
}

export default function StoreProductsAdminPage() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<"primary" | "secondary" | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("store_products")
      .select("*")
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (loadError) {
      setError(
        loadError.message.includes("store_products")
          ? "The store database has not been installed yet. Run database/store_products_setup.sql in Supabase."
          : loadError.message
      );
    } else {
      setProducts((data ?? []) as StoreProduct[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Initial data hydration is intentionally handled by the authenticated browser client.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadProducts();
  }, [loadProducts]);

  const activeSpecials = useMemo(() => products.filter(isSaleActive).length, [products]);

  function updateField<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startEdit(product: StoreProduct) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      slug: product.slug,
      description: product.description ?? "",
      category: product.category,
      colour: product.colour ?? "",
      regular_price: String(product.regular_price),
      sale_price: product.sale_price === null ? "" : String(product.sale_price),
      sale_label: product.sale_label ?? "Special",
      sale_starts_at: toLocalDateTime(product.sale_starts_at),
      sale_ends_at: toLocalDateTime(product.sale_ends_at),
      stock_status: product.stock_status,
      stock_quantity: product.stock_quantity === null ? "" : String(product.stock_quantity),
      primary_image_url: product.primary_image_url ?? "",
      secondary_image_url: product.secondary_image_url ?? "",
      published: product.published,
      featured: product.featured,
      display_order: String(product.display_order),
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
  }

  async function uploadImage(event: ChangeEvent<HTMLInputElement>, target: "primary" | "secondary") {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setUploading(target);
    setError("");
    try {
      const uploadFile = await resizeImageForUpload(file, { maxDimension: 1800, quality: 0.86 });
      const extension = uploadFile.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${editingId ?? "new"}/${Date.now()}-${target}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(path, uploadFile, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      updateField(target === "primary" ? "primary_image_url" : "secondary_image_url", data.publicUrl);
      setMessage(`${target === "primary" ? "Main" : "Second"} image uploaded. Save the product to keep it.`);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Could not upload image.");
    } finally {
      setUploading(null);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    const regularPrice = Number(form.regular_price);
    const salePrice = form.sale_price ? Number(form.sale_price) : null;
    if (!form.name.trim() || !Number.isFinite(regularPrice) || regularPrice < 0) {
      setError("A product name and valid regular price are required.");
      setSaving(false);
      return;
    }
    if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice >= regularPrice)) {
      setError("The special price must be lower than the regular price.");
      setSaving(false);
      return;
    }

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.slug || form.name),
      description: form.description.trim() || null,
      category: form.category.trim() || "Equipment",
      colour: form.colour.trim() || null,
      regular_price: regularPrice,
      sale_price: salePrice,
      sale_label: salePrice === null ? null : form.sale_label.trim() || "Special",
      sale_starts_at: salePrice !== null && form.sale_starts_at ? new Date(form.sale_starts_at).toISOString() : null,
      sale_ends_at: salePrice !== null && form.sale_ends_at ? new Date(form.sale_ends_at).toISOString() : null,
      stock_status: form.stock_status,
      stock_quantity: form.stock_quantity === "" ? null : Math.max(0, Number(form.stock_quantity)),
      primary_image_url: form.primary_image_url.trim() || null,
      secondary_image_url: form.secondary_image_url.trim() || null,
      published: form.published,
      featured: form.featured,
      display_order: Number(form.display_order) || 0,
    };

    const result = editingId
      ? await supabase.from("store_products").update(payload).eq("id", editingId)
      : await supabase.from("store_products").insert(payload);

    if (result.error) {
      setError(result.error.message);
    } else {
      setMessage(editingId ? "Product updated." : "Product created.");
      setEditingId(null);
      setForm(emptyForm);
      await loadProducts();
    }
    setSaving(false);
  }

  async function deleteProduct(product: StoreProduct) {
    if (!window.confirm(`Delete ${product.name}? This cannot be undone.`)) return;
    setError("");
    const { error: deleteError } = await supabase.from("store_products").delete().eq("id", product.id);
    if (deleteError) setError(deleteError.message);
    else {
      setMessage(`${product.name} deleted.`);
      if (editingId === product.id) resetForm();
      await loadProducts();
    }
  }

  async function togglePublished(product: StoreProduct) {
    const { error: updateError } = await supabase
      .from("store_products")
      .update({ published: !product.published })
      .eq("id", product.id);
    if (updateError) setError(updateError.message);
    else await loadProducts();
  }

  const discount = form.sale_price && Number(form.regular_price) > 0
    ? Math.round((1 - Number(form.sale_price) / Number(form.regular_price)) * 100)
    : 0;

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.22em] text-red-300">Store manager</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight">Products, stock and specials</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
                Add product images, update prices, schedule specials, control stock and choose what appears publicly.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/store" target="_blank" className="rounded-xl bg-white px-4 py-3 text-sm font-black text-zinc-950">
                View public store
              </Link>
              <Link href="/admin/store-preview" className="rounded-xl border border-white/15 px-4 py-3 text-sm font-black text-white">
                Design library
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <Stat label="Products" value={String(products.length)} />
            <Stat label="Published" value={String(products.filter((item) => item.published).length)} />
            <Stat label="Active specials" value={String(activeSpecials)} />
          </div>

          {(error || message) && (
            <div className={`mt-6 rounded-xl border px-4 py-3 text-sm font-bold ${error ? "border-red-500/40 bg-red-950/40 text-red-200" : "border-emerald-500/40 bg-emerald-950/40 text-emerald-200"}`}>
              {error || message}
            </div>
          )}

          <form onSubmit={saveProduct} className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-5 shadow-2xl shadow-black/30 md:p-7">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-red-300">{editingId ? "Editing product" : "New product"}</p>
                <h2 className="mt-2 text-2xl font-black">{editingId ? form.name : "Add to the catalogue"}</h2>
              </div>
              {editingId && <button type="button" onClick={resetForm} className="rounded-xl border border-white/15 px-4 py-2 text-sm font-bold">Cancel editing</button>}
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <Field label="Product name"><input className={inputClass} value={form.name} onChange={(event) => { updateField("name", event.target.value); if (!editingId) updateField("slug", slugify(event.target.value)); }} required /></Field>
              <Field label="Web address"><input className={inputClass} value={form.slug} onChange={(event) => updateField("slug", slugify(event.target.value))} placeholder="automatic-from-product-name" /></Field>
              <Field label="Category"><input className={inputClass} value={form.category} onChange={(event) => updateField("category", event.target.value)} placeholder="Chess clock, Apparel, Chessboard" /></Field>
              <Field label="Colour / model"><input className={inputClass} value={form.colour} onChange={(event) => updateField("colour", event.target.value)} /></Field>
              <div className="lg:col-span-2"><Field label="Description"><textarea className={`${inputClass} min-h-28`} value={form.description} onChange={(event) => updateField("description", event.target.value)} /></Field></div>
              <Field label="Regular price (R)"><input type="number" min="0" step="0.01" className={inputClass} value={form.regular_price} onChange={(event) => updateField("regular_price", event.target.value)} required /></Field>
              <Field label={`Special price (R)${discount > 0 ? ` — ${discount}% off` : ""}`}><input type="number" min="0" step="0.01" className={inputClass} value={form.sale_price} onChange={(event) => updateField("sale_price", event.target.value)} placeholder="Leave empty for no special" /></Field>
              <Field label="Special badge"><input className={inputClass} value={form.sale_label} onChange={(event) => updateField("sale_label", event.target.value)} placeholder="Weekend special" /></Field>
              <Field label="Stock status"><select className={inputClass} value={form.stock_status} onChange={(event) => updateField("stock_status", event.target.value as StockStatus)}><option value="available">Available</option><option value="out-of-stock">Out of stock</option><option value="coming-soon">Coming soon</option></select></Field>
              <Field label="Special starts"><input type="datetime-local" className={inputClass} value={form.sale_starts_at} onChange={(event) => updateField("sale_starts_at", event.target.value)} /></Field>
              <Field label="Special ends"><input type="datetime-local" className={inputClass} value={form.sale_ends_at} onChange={(event) => updateField("sale_ends_at", event.target.value)} /></Field>
              <Field label="Stock quantity (optional)"><input type="number" min="0" step="1" className={inputClass} value={form.stock_quantity} onChange={(event) => updateField("stock_quantity", event.target.value)} /></Field>
              <Field label="Display order"><input type="number" step="1" className={inputClass} value={form.display_order} onChange={(event) => updateField("display_order", event.target.value)} /></Field>
              <ImageField label="Main product image" url={form.primary_image_url} uploading={uploading === "primary"} onUpload={(event) => void uploadImage(event, "primary")} onRemove={() => updateField("primary_image_url", "")} />
              <ImageField label="Second image (optional)" url={form.secondary_image_url} uploading={uploading === "secondary"} onUpload={(event) => void uploadImage(event, "secondary")} onRemove={() => updateField("secondary_image_url", "")} />
            </div>

            <div className="mt-6 flex flex-wrap gap-5 rounded-2xl border border-white/10 bg-zinc-950 p-4">
              <Check label="Published on public store" checked={form.published} onChange={(value) => updateField("published", value)} />
              <Check label="Featured product" checked={form.featured} onChange={(value) => updateField("featured", value)} />
            </div>
            <button type="submit" disabled={saving || Boolean(uploading)} className="mt-6 rounded-xl bg-red-600 px-6 py-3 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">
              {saving ? "Saving..." : editingId ? "Save changes" : "Create product"}
            </button>
          </form>

          <section className="mt-10">
            <h2 className="text-2xl font-black">Catalogue</h2>
            {loading ? <p className="mt-4 text-zinc-400">Loading products...</p> : (
              <div className="mt-5 grid gap-5 lg:grid-cols-2">
                {products.map((product) => (
                  <article key={product.id} className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
                    <div className="grid grid-cols-[9rem_1fr]">
                      <div className="relative min-h-44 bg-zinc-800">
                        {product.primary_image_url ? <Image src={product.primary_image_url} alt={product.name} fill sizes="144px" className="object-contain" /> : <div className="flex h-full items-center justify-center px-3 text-center text-xs font-bold text-zinc-500">No product image</div>}
                      </div>
                      <div className="p-5">
                        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase tracking-wide">
                          <span className={`rounded-full px-2.5 py-1 ${product.published ? "bg-emerald-500/15 text-emerald-300" : "bg-zinc-800 text-zinc-400"}`}>{product.published ? "Published" : "Hidden"}</span>
                          <span className="rounded-full bg-white/10 px-2.5 py-1 text-zinc-300">{product.stock_status.replaceAll("-", " ")}</span>
                          {isSaleActive(product) && <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-red-200">{product.sale_label || "Special"}</span>}
                        </div>
                        <p className="mt-3 text-xs font-bold uppercase tracking-wide text-zinc-500">{product.category}</p>
                        <h3 className="mt-1 text-xl font-black">{product.name}</h3>
                        <div className="mt-3 flex items-baseline gap-2">
                          {isSaleActive(product) ? <><span className="text-xl font-black text-red-300">R{product.sale_price?.toLocaleString("en-ZA")}</span><span className="text-sm font-bold text-zinc-500 line-through">R{product.regular_price.toLocaleString("en-ZA")}</span></> : <span className="text-xl font-black">R{product.regular_price.toLocaleString("en-ZA")}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-white/10 p-4">
                      <button type="button" onClick={() => startEdit(product)} className="rounded-lg bg-white px-4 py-2 text-sm font-black text-zinc-950">Edit</button>
                      <button type="button" onClick={() => void togglePublished(product)} className="rounded-lg border border-white/15 px-4 py-2 text-sm font-bold">{product.published ? "Hide" : "Publish"}</button>
                      <button type="button" onClick={() => void deleteProduct(product)} className="ml-auto rounded-lg border border-red-500/40 px-4 py-2 text-sm font-bold text-red-300">Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5"><p className="text-xs font-black uppercase tracking-[0.16em] text-zinc-500">{label}</p><p className="mt-2 text-3xl font-black">{value}</p></div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 block text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{label}</span>{children}</label>;
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex cursor-pointer items-center gap-3 text-sm font-bold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-red-600" />{label}</label>;
}

function ImageField({ label, url, uploading, onUpload, onRemove }: { label: string; url: string; uploading: boolean; onUpload: (event: ChangeEvent<HTMLInputElement>) => void; onRemove: () => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-400">{label}</p>
      <div className="rounded-2xl border border-dashed border-white/15 bg-zinc-950 p-4">
        {url && <div className="relative mb-4 aspect-[8/5] overflow-hidden rounded-xl bg-white"><Image src={url} alt="Product upload preview" fill sizes="50vw" className="object-contain" /></div>}
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-black text-zinc-950"><input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={onUpload} className="sr-only" />{uploading ? "Uploading..." : url ? "Replace image" : "Upload image"}</label>
          {url && <button type="button" onClick={onRemove} className="text-sm font-bold text-red-300">Remove</button>}
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">Recommended: 1600 × 1600 px square, product centred, WebP or JPEG, ideally under 1 MB.</p>
      </div>
    </div>
  );
}
