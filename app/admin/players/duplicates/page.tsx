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

function profileStrength(player: IdentityPlayer) {
  let score = 0;

  if (player.verification_status === "Verified") score += 50;
  if (player.chess_sa_id) score += 40;
  if (player.fide_id) score += 35;
  if (player.date_of_birth) score += 20;
  if (player.email) score += 12;
  if (player.phone) score += 12;
  if (player.club) score += 8;
  if (player.province) score += 8;
  if (player.rating) score += 5;

  return score;
}

function chooseBulkPrimary(match: IdentityMatch) {
  const playerAStrength = profileStrength(match.playerA);
  const playerBStrength = profileStrength(match.playerB);

  if (playerAStrength > playerBStrength) {
    return { primary: match.playerA, duplicate: match.playerB };
  }

  if (playerBStrength > playerAStrength) {
    return { primary: match.playerB, duplicate: match.playerA };
  }

  return match.playerA.full_name.localeCompare(match.playerB.full_name) <= 0
    ? { primary: match.playerA, duplicate: match.playerB }
    : { primary: match.playerB, duplicate: match.playerA };
}

export default function PlayerDuplicatesPage() {
  const [players, setPlayers] = useState<IdentityPlayer[]>([]);
  const [ignoredRows, setIgnoredRows] = useState<IgnoreRow[]>([]);
  const [search, setSearch] = useState("");
  const [minimumScore, setMinimumScore] = useState(70);
  const [loading, setLoading] = useState(true);
  const [mergingKey, setMergingKey] = useState("");
  const [selectedPairKeys, setSelectedPairKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [message, setMessage] = useState("");

  async function loadData() {
    setLoading(true);
    setMessage("");

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("id, full_name, chess_sa_id, fide_id, date_of_birth, email, phone, club, province, rating, verification_status")
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

  const selectedMatches = useMemo(
    () =>
      matches.filter((match) =>
        selectedPairKeys.has(makePairKey(match.playerA.id, match.playerB.id))
      ),
    [matches, selectedPairKeys]
  );

  function togglePairSelection(pairKey: string) {
    setSelectedPairKeys((current) => {
      const next = new Set(current);

      if (next.has(pairKey)) {
        next.delete(pairKey);
      } else {
        next.add(pairKey);
      }

      return next;
    });
  }

  function selectFilteredMatches() {
    setSelectedPairKeys(
      new Set(
        filteredMatches.map((match) =>
          makePairKey(match.playerA.id, match.playerB.id)
        )
      )
    );
  }

  function selectHighConfidenceMatches() {
    setSelectedPairKeys(
      new Set(
        filteredMatches
          .filter((match) => match.confidence === "High")
          .map((match) => makePairKey(match.playerA.id, match.playerB.id))
      )
    );
  }

  function clearSelection() {
    setSelectedPairKeys(new Set());
  }

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
    setSelectedPairKeys(new Set());
    await loadData();
  }

  async function ignorePair(match: IdentityMatch) {
    const reason = window.prompt(
      `Why should "${match.playerA.full_name}" and "${match.playerB.full_name}" not be merged?`,
      "Not the same person"
    );
    if (reason === null) return;

    const cleanReason = reason.trim() || "Not the same person";

    const { error } = await supabase.from("player_duplicate_ignores").insert({
      player_a: match.playerA.id,
      player_b: match.playerB.id,
      reason: `${cleanReason}. Score: ${match.score}. Reasons: ${match.reasons.join(", ")}`,
    });

    if (error) {
      setMessage(`Could not mark players as separate: ${error.message}`);
      return;
    }

    setMessage("Marked as not the same person. This pair will not be suggested again.");
    setSelectedPairKeys((current) => {
      const next = new Set(current);
      next.delete(makePairKey(match.playerA.id, match.playerB.id));
      return next;
    });
    await loadData();
  }

  async function ignoreSelectedPairs() {
    if (selectedMatches.length === 0 || mergingKey) return;

    const confirmed = window.confirm(
      `Mark ${selectedMatches.length} selected duplicate suggestion(s) as not the same person?`
    );
    if (!confirmed) return;

    setMergingKey("bulk-ignore");
    setMessage("Marking selected pairs as not duplicates...");

    const { error } = await supabase.from("player_duplicate_ignores").insert(
      selectedMatches.map((match) => ({
        player_a: match.playerA.id,
        player_b: match.playerB.id,
        reason: `Bulk marked not duplicate. Score: ${match.score}. Reasons: ${match.reasons.join(", ")}`,
      }))
    );

    if (error) {
      setMessage(`Could not mark selected pairs: ${error.message}`);
      setMergingKey("");
      return;
    }

    setMessage(`${selectedMatches.length} selected pair(s) marked as not duplicates.`);
    setSelectedPairKeys(new Set());
    setMergingKey("");
    await loadData();
  }

  async function mergeSelectedPairs() {
    if (selectedMatches.length === 0 || mergingKey) return;

    const seenPlayerIds = new Set<string>();
    const overlappingMatches = selectedMatches.filter((match) => {
      const hasOverlap =
        seenPlayerIds.has(match.playerA.id) || seenPlayerIds.has(match.playerB.id);

      seenPlayerIds.add(match.playerA.id);
      seenPlayerIds.add(match.playerB.id);

      return hasOverlap;
    });

    if (overlappingMatches.length > 0) {
      setMessage(
        "Some selected pairs share the same player. Clear the selection and choose only pairs where each player appears once."
      );
      return;
    }

    const mergePlan = selectedMatches.map((match) => ({
      match,
      ...chooseBulkPrimary(match),
    }));

    const confirmed = window.confirm(
      `Bulk merge ${mergePlan.length} selected pair(s)?\n\nThe page will keep the stronger profile in each pair and move history/results into it.`
    );
    if (!confirmed) return;

    setMergingKey("bulk-merge");
    setMessage(`Bulk merging ${mergePlan.length} pair(s)...`);

    let merged = 0;

    for (const item of mergePlan) {
      const { error } = await supabase.rpc("merge_players", {
        primary_player_id: item.primary.id,
        duplicate_player_id: item.duplicate.id,
        reason: `Duplicate Centre bulk merge. Score: ${item.match.score}. Reasons: ${item.match.reasons.join(", ")}`,
      });

      if (error) {
        setMessage(
          `Bulk merge stopped after ${merged} merge(s). Could not merge "${item.duplicate.full_name}" into "${item.primary.full_name}": ${error.message}`
        );
        setMergingKey("");
        await loadData();
        return;
      }

      merged += 1;
    }

    setMessage(`Bulk merged ${merged} duplicate pair(s).`);
    setSelectedPairKeys(new Set());
    setMergingKey("");
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

          {!loading && filteredMatches.length > 0 && (
            <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-400">
                    Bulk Options
                  </p>
                  <p className="mt-2 text-sm text-gray-400">
                    {selectedMatches.length} selected from {filteredMatches.length} visible suggestion{filteredMatches.length === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                  <button
                    type="button"
                    onClick={selectFilteredMatches}
                    disabled={Boolean(mergingKey)}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-red-500 disabled:opacity-50"
                  >
                    Select visible
                  </button>
                  <button
                    type="button"
                    onClick={selectHighConfidenceMatches}
                    disabled={Boolean(mergingKey)}
                    className="rounded-xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm font-bold text-green-100 transition hover:bg-green-500/20 disabled:opacity-50"
                  >
                    Select high
                  </button>
                  <button
                    type="button"
                    onClick={clearSelection}
                    disabled={Boolean(mergingKey) || selectedMatches.length === 0}
                    className="rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-red-500 disabled:opacity-50"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    onClick={ignoreSelectedPairs}
                    disabled={Boolean(mergingKey) || selectedMatches.length === 0}
                    className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-bold text-yellow-100 transition hover:bg-yellow-500/20 disabled:opacity-50"
                  >
                    Not duplicates
                  </button>
                  <button
                    type="button"
                    onClick={mergeSelectedPairs}
                    disabled={Boolean(mergingKey) || selectedMatches.length === 0}
                    className="rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Merge selected
                  </button>
                </div>
              </div>
            </section>
          )}

          {loading ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">Scanning player database...</p>
          ) : filteredMatches.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">No duplicate suggestions found.</p>
          ) : (
            <section className="mt-8 space-y-5">
              {filteredMatches.map((match) => {
                const pairKey = makePairKey(match.playerA.id, match.playerB.id);
                const selected = selectedPairKeys.has(pairKey);

                return (
                  <article
                    key={pairKey}
                    className={`rounded-3xl border bg-zinc-900 p-5 md:p-6 ${
                      selected ? "border-red-500" : "border-white/10"
                    }`}
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex gap-4">
                        <label className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-950">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => togglePairSelection(pairKey)}
                            className="h-5 w-5 accent-red-600"
                            aria-label={`Select duplicate pair ${match.playerA.full_name} and ${match.playerB.full_name}`}
                          />
                        </label>

                        <div>
                          <div className="flex flex-wrap gap-2">
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(match.confidence)}`}>{match.confidence} confidence</span>
                            <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">{match.score}% match</span>
                            <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                              Bulk keeps {chooseBulkPrimary(match).primary.full_name}
                            </span>
                          </div>
                          <p className="mt-4 text-sm text-gray-400">{match.reasons.join("  -  ")}</p>
                        </div>
                      </div>
                      <button type="button" disabled={Boolean(mergingKey)} onClick={() => ignorePair(match)} className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500 disabled:opacity-50">Not same person</button>
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

