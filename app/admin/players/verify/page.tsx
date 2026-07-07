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
  gender: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  email: string | null;
  phone: string | null;
  verification_status: string | null;
  profile_photo_url: string | null;
};

type DuplicateGroup = {
  key: string;
  label: string;
  players: Player[];
  reason: string;
};

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatValue(value: string | number | null) {
  if (value === null || value === "") return "Not set";
  return String(value);
}

function scorePlayer(player: Player) {
  let score = 0;

  if (player.verification_status === "Verified") score += 100;
  if (player.chess_sa_id) score += 50;
  if (player.fide_id) score += 40;
  if (player.date_of_birth) score += 20;
  if (player.email) score += 10;
  if (player.phone) score += 10;
  if (player.profile_photo_url) score += 10;

  return score;
}

export default function PlayerVerificationPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [search, setSearch] = useState("");
  const [selectedSourceId, setSelectedSourceId] = useState("");
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [message, setMessage] = useState("");

  async function loadPlayers() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, date_of_birth, gender, club, province, rating, email, phone, verification_status, profile_photo_url"
      )
      .order("full_name", { ascending: true })
      .limit(10000);

    if (error) {
      setMessage(`Could not load players: ${error.message}`);
    } else {
      setPlayers((data ?? []) as Player[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPlayers();
  }, []);

  const duplicateGroups = useMemo(() => {
    const groups: DuplicateGroup[] = [];

    const byChessSa = new Map<string, Player[]>();
    const byFide = new Map<string, Player[]>();
    const byName = new Map<string, Player[]>();

    players.forEach((player) => {
      if (player.chess_sa_id) {
        const key = player.chess_sa_id.trim().toLowerCase();
        byChessSa.set(key, [...(byChessSa.get(key) ?? []), player]);
      }

      if (player.fide_id) {
        const key = player.fide_id.trim().toLowerCase();
        byFide.set(key, [...(byFide.get(key) ?? []), player]);
      }

      const nameKey = normalizeName(player.full_name);
      if (nameKey) {
        byName.set(nameKey, [...(byName.get(nameKey) ?? []), player]);
      }
    });

    byChessSa.forEach((items, key) => {
      if (items.length > 1) {
        groups.push({
          key: `chess-sa-${key}`,
          label: `Chess SA ID: ${items[0].chess_sa_id}`,
          reason: "Same Chess SA ID",
          players: items,
        });
      }
    });

    byFide.forEach((items, key) => {
      if (items.length > 1) {
        groups.push({
          key: `fide-${key}`,
          label: `FIDE ID: ${items[0].fide_id}`,
          reason: "Same FIDE ID",
          players: items,
        });
      }
    });

    byName.forEach((items, key) => {
      if (items.length > 1) {
        groups.push({
          key: `name-${key}`,
          label: items[0].full_name,
          reason: "Same normalized name",
          players: items,
        });
      }
    });

    const uniqueGroups = new Map<string, DuplicateGroup>();

    groups.forEach((group) => {
      const sortedIds = group.players.map((player) => player.id).sort().join("-");
      if (!uniqueGroups.has(sortedIds)) uniqueGroups.set(sortedIds, group);
    });

    return [...uniqueGroups.values()].sort((a, b) => b.players.length - a.players.length);
  }, [players]);

  const needsVerification = useMemo(() => {
    const text = search.trim().toLowerCase();

    return players.filter((player) => {
      const status = player.verification_status ?? "Pending";

      const needsCheck =
        status !== "Verified" ||
        !player.chess_sa_id ||
        !player.date_of_birth ||
        !player.gender;

      const searchMatch =
        !text ||
        player.full_name.toLowerCase().includes(text) ||
        (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (player.fide_id ?? "").toLowerCase().includes(text) ||
        (player.club ?? "").toLowerCase().includes(text);

      return needsCheck && searchMatch;
    });
  }, [players, search]);

  const verifiedCount = players.filter(
    (player) => player.verification_status === "Verified"
  ).length;

  async function markVerified(playerId: string) {
    setMessage("");

    const { error } = await supabase
      .from("players")
      .update({
        verification_status: "Verified",
      })
      .eq("id", playerId);

    if (error) {
      setMessage(`Could not verify player: ${error.message}`);
      return;
    }

    await loadPlayers();
    setMessage("Player marked as verified.");
  }

  async function mergeSelectedPlayers() {
    if (!selectedSourceId || !selectedTargetId) {
      setMessage("Select both a duplicate player and the correct profile.");
      return;
    }

    if (selectedSourceId === selectedTargetId) {
      setMessage("Duplicate player and correct profile cannot be the same.");
      return;
    }

    const source = players.find((player) => player.id === selectedSourceId);
    const target = players.find((player) => player.id === selectedTargetId);

    const confirmed = window.confirm(
      `Merge "${source?.full_name ?? "duplicate"}" into "${target?.full_name ?? "target"}"? This moves registrations, results and arbiter links to the correct profile, then deletes the duplicate.`
    );

    if (!confirmed) return;

    setMerging(true);
    setMessage("");

    const { error } = await supabase.rpc("merge_players", {
      p_source_player_id: selectedSourceId,
      p_target_player_id: selectedTargetId,
    });

    if (error) {
      setMessage(`Could not merge players: ${error.message}`);
      setMerging(false);
      return;
    }

    setSelectedSourceId("");
    setSelectedTargetId("");
    setMessage("Players merged successfully.");
    setMerging(false);
    await loadPlayers();
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/players"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Player Centre
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Player Verification Centre
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Verify & Merge Players
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Link imported players to their correct profiles, detect duplicates,
              and merge tournament history into one master player record.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <StatCard label="Total Players" value={players.length} />
              <StatCard label="Verified" value={verifiedCount} />
              <StatCard label="Duplicate Groups" value={duplicateGroups.length} />
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          {loading ? (
            <p className="mt-8 text-gray-400">Loading players...</p>
          ) : (
            <section className="mt-8 grid gap-8 lg:grid-cols-[1fr_420px]">
              <div className="space-y-8">
                <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Possible Duplicates
                  </p>

                  <h2 className="mt-3 text-2xl font-black">Duplicate groups</h2>

                  {duplicateGroups.length === 0 ? (
                    <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                      No obvious duplicate groups found.
                    </p>
                  ) : (
                    <div className="mt-6 space-y-5">
                      {duplicateGroups.map((group) => (
                        <div
                          key={group.key}
                          className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
                        >
                          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-wide text-red-400">
                                {group.reason}
                              </p>
                              <h3 className="mt-1 text-xl font-black text-white">
                                {group.label}
                              </h3>
                            </div>

                            <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-300">
                              {group.players.length} records
                            </span>
                          </div>

                          <div className="mt-5 grid gap-3">
                            {group.players
                              .sort((a, b) => scorePlayer(b) - scorePlayer(a))
                              .map((player) => (
                                <PlayerMergeCard
                                  key={player.id}
                                  player={player}
                                  selectedSourceId={selectedSourceId}
                                  selectedTargetId={selectedTargetId}
                                  setSelectedSourceId={setSelectedSourceId}
                                  setSelectedTargetId={setSelectedTargetId}
                                  recommended={scorePlayer(player) === Math.max(...group.players.map(scorePlayer))}
                                />
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                        Needs Verification
                      </p>
                      <h2 className="mt-3 text-2xl font-black">
                        Imported or incomplete players
                      </h2>
                    </div>

                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search players..."
                      className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500 md:w-80"
                    />
                  </div>

                  <div className="mt-6 grid gap-3">
                    {needsVerification.slice(0, 200).map((player) => (
                      <div
                        key={player.id}
                        className="rounded-2xl border border-white/10 bg-zinc-950 p-4"
                      >
                        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                          <div>
                            <Link
                              href={`/admin/players/${player.id}`}
                              className="font-black text-white transition hover:text-red-300"
                            >
                              {player.full_name}
                            </Link>

                            <p className="mt-1 text-xs text-gray-500">
                              Chess SA: {formatValue(player.chess_sa_id)} • FIDE:{" "}
                              {formatValue(player.fide_id)} • Rating:{" "}
                              {formatValue(player.rating)}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => markVerified(player.id)}
                              className="rounded-xl bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700"
                            >
                              Mark Verified
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedSourceId(player.id)}
                              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-red-500"
                            >
                              Set as Duplicate
                            </button>

                            <button
                              type="button"
                              onClick={() => setSelectedTargetId(player.id)}
                              className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-green-500"
                            >
                              Set as Correct
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {needsVerification.length > 200 && (
                    <p className="mt-4 text-sm text-gray-500">
                      Showing first 200. Use search to narrow results.
                    </p>
                  )}
                </section>
              </div>

              <aside className="sticky top-28 h-fit rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Merge Panel
                </p>

                <h2 className="mt-3 text-2xl font-black">Move history</h2>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Select the duplicate record as the source, then select the
                  correct master profile as the target.
                </p>

                <div className="mt-6 space-y-4">
                  <SelectedPlayerBox
                    label="Duplicate record"
                    player={players.find((player) => player.id === selectedSourceId) ?? null}
                  />

                  <SelectedPlayerBox
                    label="Correct master profile"
                    player={players.find((player) => player.id === selectedTargetId) ?? null}
                  />

                  <button
                    type="button"
                    onClick={mergeSelectedPlayers}
                    disabled={merging || !selectedSourceId || !selectedTargetId}
                    className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {merging ? "Merging..." : "Merge Players"}
                  </button>
                </div>
              </aside>
            </section>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}

function PlayerMergeCard({
  player,
  selectedSourceId,
  selectedTargetId,
  setSelectedSourceId,
  setSelectedTargetId,
  recommended,
}: {
  player: Player;
  selectedSourceId: string;
  selectedTargetId: string;
  setSelectedSourceId: (id: string) => void;
  setSelectedTargetId: (id: string) => void;
  recommended: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/admin/players/${player.id}`}
              className="font-black text-white transition hover:text-red-300"
            >
              {player.full_name}
            </Link>

            {recommended && (
              <span className="rounded-full bg-green-500/10 px-2 py-1 text-[10px] font-bold text-green-300">
                Recommended master
              </span>
            )}
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Chess SA: {formatValue(player.chess_sa_id)} • FIDE:{" "}
            {formatValue(player.fide_id)} • DOB: {formatValue(player.date_of_birth)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedSourceId(player.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedSourceId === player.id
                ? "bg-red-600 text-white"
                : "border border-white/10 text-white hover:border-red-500"
            }`}
          >
            Duplicate
          </button>

          <button
            type="button"
            onClick={() => setSelectedTargetId(player.id)}
            className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
              selectedTargetId === player.id
                ? "bg-green-600 text-white"
                : "border border-white/10 text-white hover:border-green-500"
            }`}
          >
            Correct Profile
          </button>
        </div>
      </div>
    </div>
  );
}

function SelectedPlayerBox({
  label,
  player,
}: {
  label: string;
  player: Player | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>

      {player ? (
        <>
          <p className="mt-2 font-black text-white">{player.full_name}</p>
          <p className="mt-1 text-xs text-gray-500">
            Chess SA: {formatValue(player.chess_sa_id)} • FIDE:{" "}
            {formatValue(player.fide_id)}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-400">Not selected</p>
      )}
    </div>
  );
}
