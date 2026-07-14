"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  date_of_birth: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  email: string | null;
  phone: string | null;
  verification_status: string | null;
  profile_photo_url: string | null;
};

const inputClass = "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function missingLabel(player: Player) {
  const missing: string[] = [];
  if (!player.chess_sa_id) missing.push("Chess SA ID");
  if (!player.fide_id) missing.push("FIDE ID");
  if (!player.date_of_birth) missing.push("DOB");
  if (!player.province) missing.push("Province");
  if (!player.club) missing.push("Club");
  if (!player.profile_photo_url) missing.push("Photo");
  return missing;
}

export default function PlayerVerificationQueuePage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("Needs Review");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPlayers() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("players")
      .select("id, full_name, chess_sa_id, fide_id, date_of_birth, club, province, rating, email, phone, verification_status, profile_photo_url")
      .order("full_name", { ascending: true })
      .limit(10000);

    if (error) setMessage(`Could not load verification queue: ${error.message}`);
    else setPlayers((data ?? []) as unknown as Player[]);

    setLoading(false);
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  const filteredPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return players.filter((player) => {
      const missing = missingLabel(player);

      const matchesSearch =
        !text ||
        player.full_name.toLowerCase().includes(text) ||
        (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (player.fide_id ?? "").toLowerCase().includes(text) ||
        (player.club ?? "").toLowerCase().includes(text) ||
        (player.province ?? "").toLowerCase().includes(text);

      const matchesFilter =
        filter === "All" ||
        (filter === "Needs Review" && player.verification_status !== "Verified") ||
        (filter === "Verified" && player.verification_status === "Verified") ||
        (filter === "Missing Chess SA" && !player.chess_sa_id) ||
        (filter === "Missing FIDE" && !player.fide_id) ||
        (filter === "Missing DOB" && !player.date_of_birth) ||
        (filter === "Missing Photo" && !player.profile_photo_url) ||
        (filter === "Incomplete" && missing.length > 0);

      return matchesSearch && matchesFilter;
    });
  }, [players, search, filter]);

  async function markVerified(player: Player) {
    setMessage("");

    const { error } = await supabase
      .from("players")
      .update({ verification_status: "Verified", updated_at: new Date().toISOString() })
      .eq("id", player.id);

    if (error) {
      setMessage(`Could not verify player: ${error.message}`);
      return;
    }

    setMessage(`${player.full_name} verified.`);
    await loadPlayers();
  }

  const stats = useMemo(() => {
    return {
      total: players.length,
      verified: players.filter((player) => player.verification_status === "Verified").length,
      needsReview: players.filter((player) => player.verification_status !== "Verified").length,
      incomplete: players.filter((player) => missingLabel(player).length > 0).length,
    };
  }, [players]);

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin/players" className="text-sm font-semibold text-red-300 transition hover:text-red-200">
             Back to Player Centre
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">Verification Queue</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">Player Identity Review</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Review players with missing IDs, incomplete profiles and pending verification status.
            </p>
          </section>

          {message && <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">{message}</p>}

          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Players" value={stats.total} />
            <StatCard label="Verified" value={stats.verified} tone="green" />
            <StatCard label="Needs Review" value={stats.needsReview} tone="yellow" />
            <StatCard label="Incomplete" value={stats.incomplete} tone="red" />
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_240px_180px_240px]">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, Chess SA ID, FIDE ID, club..." className={inputClass} />
              <select value={filter} onChange={(event) => setFilter(event.target.value)} className={inputClass}>
                <option>Needs Review</option>
                <option>All</option>
                <option>Verified</option>
                <option>Incomplete</option>
                <option>Missing Chess SA</option>
                <option>Missing FIDE</option>
                <option>Missing DOB</option>
                <option>Missing Photo</option>
              </select>
              <Link href="/admin/players/duplicates" className="rounded-xl bg-red-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700">Duplicates</Link>
              <Link
  href="/admin/players/verify/import"
  className="rounded-xl border border-red-500 bg-zinc-950 px-5 py-3 text-center text-sm font-bold text-red-300 transition hover:bg-red-600 hover:text-white"
>
  Bulk Verify
</Link>
            </div>
          </section>

          {loading ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">Loading verification queue...</p>
          ) : filteredPlayers.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">No players found.</p>
          ) : (
            <section className="mt-8 space-y-4">
              {filteredPlayers.map((player) => {
                const missing = missingLabel(player);
                return (
                  <article key={player.id} className="rounded-3xl border border-white/10 bg-zinc-900 p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${player.verification_status === "Verified" ? "bg-green-500/10 text-green-300" : "bg-yellow-500/10 text-yellow-300"}`}>
                            {player.verification_status ?? "Pending"}
                          </span>
                          {missing.length > 0 && <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-300">Missing {missing.length}</span>}
                        </div>

                        <Link href={`/admin/players/${player.id}`} className="mt-4 block text-2xl font-black text-white transition hover:text-red-300">{player.full_name}</Link>

                        <div className="mt-3 grid gap-2 text-sm text-gray-400 md:grid-cols-3">
                          <p>Chess SA: {player.chess_sa_id ?? "-"}</p>
                          <p>FIDE: {player.fide_id ?? "-"}</p>
                          <p>DOB: {player.date_of_birth ?? "-"}</p>
                          <p>Club: {player.club ?? "-"}</p>
                          <p>Province: {player.province ?? "-"}</p>
                          <p>Rating: {player.rating ?? "-"}</p>
                        </div>

                        {missing.length > 0 && <p className="mt-3 text-sm text-red-200">Missing: {missing.join(", ")}</p>}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/players/${player.id}`} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500">Review</Link>
                        {player.verification_status !== "Verified" && (
                          <button type="button" onClick={() => markVerified(player)} className="rounded-xl bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700">Verify</button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

function StatCard({ label, value, tone = "default" }: { label: string; value: string | number; tone?: "default" | "green" | "yellow" | "red" }) {
  const valueClass = tone === "green" ? "text-green-300" : tone === "yellow" ? "text-yellow-300" : tone === "red" ? "text-red-300" : "text-white";
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

