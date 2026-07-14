"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { IdentityMatch, IdentityPlayer, buildDuplicateMatches, makePairKey } from "@/lib/identityResolver";
import { supabase } from "@/lib/supabase";

type IgnoreRow = { player_a: string; player_b: string };

const inputClass = "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function confidenceClass(confidence: string) {
  if (confidence === "High") return "bg-green-500/10 text-green-300";
  if (confidence === "Medium") return "bg-yellow-500/10 text-yellow-300";
  return "bg-red-500/10 text-red-300";
}

export default function PlayerDuplicatesPage() {
  const [players, setPlayers] = useState<IdentityPlayer[]>([]);
  const [ignoredRows, setIgnoredRows] = useState<IgnoreRow[]>([]);
  const [search, setSearch] = useState("");
  const [minimumScore, setMinimumScore] = useState(70);
  const [loading, setLoading] = useState(true);
  const [mergingKey, setMergingKey] = useState("");
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("id, full_name, chess_sa_id, fide_id, date_of_birth, email, phone, club, province, rating")
      .order("full_name", { ascending: true })
      .limit(10000);

    const { data: ignoreData } = await supabase
      .from("player_duplicate_ignores")
      .select("player_a, player_b");

    if (playerError) setMessage(`Could not load players: ${playerError.message}`);
    else {
      setPlayers((playerData ?? []) as unknown as IdentityPlayer[]);
      setIgnoredRows((ignoreData ?? []) as unknown as IgnoreRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const ignoredPairs = useMemo(() => new Set(ignoredRows.map((row) => makePairKey(row.player_a, row.player_b))), [ignoredRows]);
  const matches = useMemo(() => buildDuplicateMatches(players, ignoredPairs, minimumScore), [players, ignoredPairs, minimumScore]);

  const filteredMatches = useMemo(() => {
    const text = search.trim().toLowerCase();
    return matches.filter((match) => {
      if (!text) return true;
      return (
        match.playerA.full_name.toLowerCase().includes(text) ||
        match.playerB.full_name.toLowerCase().includes(text) ||
        (match.playerA.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (match.playerB.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (match.playerA.fide_id ?? "").toLowerCase().includes(text) ||
        (match.playerB.fide_id ?? "").toLowerCase().includes(text)
      );
    });
  }, [matches, search]);

  async function mergePlayers(match: IdentityMatch, primaryId: string, duplicateId: string) {
    const primary = match.playerA.id === primaryId ? match.playerA : match.playerB;
    const duplicate = match.playerA.id === duplicateId ? match.playerA : match.playerB;

    const confirmed = window.confirm(`Merge "${duplicate.full_name}" into "${primary.full_name}"?`);
    if (!confirmed) return;

    setMergingKey(makePairKey(primaryId, duplicateId));
    setMessage("");

    const { error } = await supabase.rpc("merge_players", {
      primary_player_id: primaryId,
      duplicate_player_id: duplicateId,
      reason: `Duplicate Centre merge. Score: ${match.score}. Reasons: ${match.reasons.join(", ")}`,
    });

    if (error) {
      setMessage(`Could not merge players: ${error.message}`);
      setMergingKey("");
      return;
    }

    setMessage(`Merged "${duplicate.full_name}" into "${primary.full_name}".`);
    setMergingKey("");
    await loadData();
  }

  async function ignorePair(match: IdentityMatch) {
    const confirmed = window.confirm("Ignore this duplicate suggestion?");
    if (!confirmed) return;

    const { error } = await supabase.from("player_duplicate_ignores").insert({
      player_a: match.playerA.id,
      player_b: match.playerB.id,
      reason: `Ignored from Duplicate Centre. Score: ${match.score}.`,
    });

    if (error) {
      setMessage(`Could not ignore pair: ${error.message}`);
      return;
    }

    setMessage("Duplicate suggestion ignored.");
    await loadData();
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin/players" className="text-sm font-semibold text-red-300 transition hover:text-red-200">
             Back to Player Centre
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">Identity Resolution</p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">Duplicate Player Centre</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Find possible duplicate profiles using IDs, contacts, date of birth, name similarity, province and club.
            </p>
          </section>

          {message && <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">{message}</p>}

          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Players scanned" value={players.length} />
            <StatCard label="Suggestions" value={matches.length} tone="yellow" />
            <StatCard label="High confidence" value={matches.filter((item) => item.confidence === "High").length} tone="green" />
            <StatCard label="Ignored" value={ignoredRows.length} />
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_220px_160px]">
              <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name, Chess SA ID or FIDE ID..." className={inputClass} />
              <select value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} className={inputClass}>
                <option value={90}>90+ High only</option>
                <option value={80}>80+ Strong</option>
                <option value={70}>70+ Suggested</option>
                <option value={60}>60+ Loose</option>
              </select>
              <button type="button" onClick={loadData} className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700">Refresh</button>
            </div>
          </section>

          {loading ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">Scanning player database...</p>
          ) : filteredMatches.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">No duplicate suggestions found.</p>
          ) : (
            <section className="mt-8 space-y-5">
              {filteredMatches.map((match) => {
                const pairKey = makePairKey(match.playerA.id, match.playerB.id);
                return (
                  <article key={pairKey} className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(match.confidence)}`}>{match.confidence} confidence</span>
                          <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">{match.score}% match</span>
                        </div>
                        <p className="mt-4 text-sm text-gray-400">{match.reasons.join("  -  ")}</p>
                      </div>
                      <button type="button" onClick={() => ignorePair(match)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500">Ignore</button>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                      <PlayerMergeCard player={match.playerA} other={match.playerB} disabled={Boolean(mergingKey)} merging={mergingKey === pairKey} onMerge={() => mergePlayers(match, match.playerA.id, match.playerB.id)} />
                      <PlayerMergeCard player={match.playerB} other={match.playerA} disabled={Boolean(mergingKey)} merging={mergingKey === pairKey} onMerge={() => mergePlayers(match, match.playerB.id, match.playerA.id)} />
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

function PlayerMergeCard({ player, other, disabled, merging, onMerge }: { player: IdentityPlayer; other: IdentityPlayer; disabled: boolean; merging: boolean; onMerge: () => void }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <Link href={`/admin/players/${player.id}`} className="text-2xl font-black text-white transition hover:text-red-300">{player.full_name}</Link>
          <div className="mt-4 grid gap-2 text-sm text-gray-400 sm:grid-cols-2">
            <p>Chess SA: {valueOrDash(player.chess_sa_id)}</p>
            <p>FIDE: {valueOrDash(player.fide_id)}</p>
            <p>DOB: {valueOrDash(player.date_of_birth)}</p>
            <p>Rating: {valueOrDash(player.rating)}</p>
            <p>Club: {valueOrDash(player.club)}</p>
            <p>Province: {valueOrDash(player.province)}</p>
          </div>
        </div>
        <button type="button" disabled={disabled} onClick={onMerge} className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60">
          {merging ? "Merging..." : `Keep this, merge ${other.full_name}`}
        </button>
      </div>
    </div>
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

