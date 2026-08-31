import Link from "next/link";

import PublicPageShell from "@/components/PublicPageShell";

export default function PaymentResultPage({ title, message, tone }: { title: string; message: string; tone: "success" | "warning" | "error" }) {
  const styles = tone === "success" ? "border-emerald-300 bg-emerald-50 text-emerald-950" : tone === "error" ? "border-red-300 bg-red-50 text-red-950" : "border-amber-300 bg-amber-50 text-amber-950";
  return (
    <PublicPageShell>
      <main className="min-h-screen bg-[#f4f1ea] px-5 pb-20 pt-36">
        <div className={`mx-auto max-w-2xl rounded-3xl border p-8 text-center shadow-xl ${styles}`}>
          <p className="text-xs font-black uppercase tracking-[0.2em]">PCC Store</p>
          <h1 className="mt-3 text-4xl font-black">{title}</h1>
          <p className="mx-auto mt-4 max-w-xl leading-7">{message}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-3"><Link href="/store" className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white">Return to store</Link><Link href="/contact" className="rounded-xl border border-current px-5 py-3 text-sm font-black">Contact PCC</Link></div>
        </div>
      </main>
    </PublicPageShell>
  );
}
