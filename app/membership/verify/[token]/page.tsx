import Link from "next/link";
import PublicPageShell from "@/components/PublicPageShell";
import { createServerSupabase } from "@/lib/serverSupabase";

export const dynamic = "force-dynamic";

function displayDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00Z`)) : "Not recorded";
}

export default async function VerifyMembershipPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const validToken = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(token);
  const { data } = validToken ? await createServerSupabase().from("membership_orders").select("plan_name,member_name,starts_on,expires_on,status,order_number").eq("verification_token", token).eq("status", "paid").maybeSingle() : { data: null };
  const today = new Date().toISOString().slice(0, 10);
  const active = Boolean(data?.expires_on && data.expires_on >= today);

  return <PublicPageShell><main className="min-h-screen bg-zinc-950 px-5 pb-20 pt-36 text-white"><div className="mx-auto max-w-xl"><section className={`overflow-hidden rounded-3xl border ${data ? active ? "border-emerald-500/40" : "border-amber-500/40" : "border-red-500/40"} bg-zinc-900 shadow-2xl`}><div className={`h-2 ${data ? active ? "bg-emerald-500" : "bg-amber-500" : "bg-red-600"}`} /><div className="p-8 text-center"><p className="text-xs font-black uppercase tracking-[.25em] text-zinc-400">PCC membership verification</p><div className={`mx-auto mt-6 grid h-20 w-20 place-items-center rounded-full text-4xl ${data ? active ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400" : "bg-red-500/15 text-red-400"}`}>{data ? active ? "✓" : "!" : "×"}</div><h1 className="mt-5 text-4xl font-black">{data ? active ? "Active member" : "Membership expired" : "Invalid card"}</h1>{data ? <div className="mt-7 space-y-3 rounded-2xl bg-black/20 p-5 text-left text-sm"><Row label="Member" value={data.member_name}/><Row label="Plan" value={data.plan_name}/><Row label="Valid from" value={displayDate(data.starts_on)}/><Row label="Valid until" value={displayDate(data.expires_on)}/><Row label="Reference" value={data.order_number}/></div> : <p className="mt-5 leading-7 text-zinc-400">This QR code is not connected to a confirmed PCC membership.</p>}<p className="mt-6 text-xs leading-5 text-zinc-500">Checked live against Polokwane Chess Club membership records.</p><Link href="/membership" className="mt-7 inline-flex rounded-full bg-white px-6 py-3 text-sm font-black text-zinc-950">View membership plans</Link></div></section></div></main></PublicPageShell>;
}

function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-5 border-b border-white/10 pb-3 last:border-0 last:pb-0"><span className="text-zinc-500">{label}</span><strong className="text-right">{value}</strong></div>; }
