import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import MembershipScanner from "@/components/admin/MembershipScanner";

export default function MembershipScannerPage(){return <AdminGuard><main className="min-h-screen bg-zinc-950 px-5 pb-20 pt-28 text-white"><div className="mx-auto max-w-7xl"><Link href="/admin/membership" className="text-xs font-black uppercase tracking-[.2em] text-red-300">← Membership centre</Link><h1 className="mt-3 text-4xl font-black">Membership card scanner</h1><p className="mt-3 max-w-3xl text-zinc-400">Scan a member’s digital card at a PCC session and open the live verification result.</p><div className="mt-8"><MembershipScanner/></div></div></main></AdminGuard>}
