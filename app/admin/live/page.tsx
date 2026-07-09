"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";

export default function AdminLiveRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/operations");
  }, [router]);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-zinc-900 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Redirecting
          </p>
          <h1 className="mt-3 text-3xl font-black">Live moved to Operations</h1>
          <p className="mt-3 text-sm text-gray-400">
            The old global Live page is now the Operations Centre.
          </p>
          <Link
            href="/admin/operations"
            className="mt-6 inline-block rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Open Operations Centre
          </Link>
        </div>
      </main>
    </AdminGuard>
  );
}
