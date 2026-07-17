// Path: components/admin/AdminSearchBar.tsx
"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminSearchBar() {
  const [q, setQ] = useState("");
  const router = useRouter();

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (q.trim()) router.push(`/admin/search?q=${encodeURIComponent(q)}`);
      }}
      className="rounded-2xl border border-white/10 bg-zinc-900 p-3 shadow-2xl shadow-black/20"
    >
      <div className="grid gap-3 md:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="admin-global-search">
          Search admin records
        </label>
        <input
          id="admin-global-search"
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search players, tournaments, news, IDs, emails..."
          className="min-h-12 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 text-sm font-semibold text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500"
        />
        <button
          type="submit"
          className="min-h-12 rounded-xl bg-red-600 px-6 text-sm font-black text-white transition hover:bg-red-700"
        >
          Search
        </button>
      </div>
    </form>
  );
}
