"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  arbiter_player_id: string | null;
};

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  rating: number | null;
  club: string | null;
  province: string | null;
  profile_photo_url: string | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function TournamentArbiterPage() {
  const params = useParams();
  const tournamentId = String(params.id ?? "");

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, arbiter_player_id")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      setMessage("Tournament could not be loaded.");
      setLoading(false);
      return;
    }

    const loadedTournament = tournamentData as Tournament;

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url"
      )
      .order("full_name", { ascending: true })
      .limit(10000);

    if (playerError) {
      setMessage(`Players could not be loaded: ${playerError.message}`);
      setLoading(false);
      return;
    }

    setTournament(loadedTournament);
    setSelectedPlayerId(loadedTournament.arbiter_player_id ?? "");
    setPlayers((playerData ?? []) as Player[]);
    setLoading(false);
  }

  useEffect(() => {
    if (tournamentId) loadPage();
  }, [tournamentId]);

  const filteredPlayers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return players.filter((player) => {
      if (!text) return true;

      return (
        player.full_name.toLowerCase().includes(text) ||
        (player.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (player.fide_id ?? "").toLowerCase().includes(text) ||
        (player.club ?? "").toLowerCase().includes(text) ||
        (player.province ?? "").toLowerCase().includes(text)
      );
    });
  }, [players, search]);

  const selectedPlayer =
    players.find((player) => player.id === selectedPlayerId) ?? null;

  async function saveArbiter() {
    if (!selectedPlayerId) {
      setMessage("Please select an arbiter first.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("tournaments")
      .update({
        arbiter_player_id: selectedPlayerId,
      })
      .eq("id", tournamentId);

    if (error) {
      setMessage(`Could not save arbiter: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage("Tournament arbiter saved.");
    setSaving(false);
    await loadPage();
  }

  async function uploadPhoto(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !selectedPlayer) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setMessage("");

    const safeName = cleanFileName(file.name);
    const filePath = `players/${selectedPlayer.id}/${Date.now()}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from("player-photos")
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      setMessage(`Photo upload failed: ${uploadError.message}`);
      setUploading(false);
      event.target.value = "";
      return;
    }

    const { data } = supabase.storage
      .from("player-photos")
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from("players")
      .update({
        profile_photo_url: data.publicUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedPlayer.id);

    if (updateError) {
      setMessage(`Photo saved to storage but player update failed: ${updateError.message}`);
      setUploading(false);
      event.target.value = "";
      return;
    }

    setMessage("Profile photo uploaded. It will show on the public tournament page.");
    setUploading(false);
    event.target.value = "";
    await loadPage();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading arbiter manager...
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href={`/admin/tournaments/${tournamentId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Tournament Dashboard
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Tournament Official
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Chief Arbiter
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Select the arbiter in charge of this tournament and upload their
              profile photo. The public tournament dashboard will show the
              arbiter card and link it to the player profile.
            </p>

            {tournament && (
              <p className="mt-3 text-sm text-gray-500">
                {tournament.tournament_name}
              </p>
            )}
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-8 lg:grid-cols-[420px_1fr]">
            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                Selected Arbiter
              </p>

              <h2 className="mt-3 text-2xl font-black">
                Public dashboard card
              </h2>

              {selectedPlayer ? (
                <div className="mt-6 rounded-3xl border border-white/10 bg-zinc-950 p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-500/30 bg-red-600/10 text-2xl font-black text-red-200">
                      {selectedPlayer.profile_photo_url ? (
                        <Image
                          src={selectedPlayer.profile_photo_url}
                          alt={selectedPlayer.full_name}
                          fill
                          sizes="96px"
                          className="object-cover"
                        />
                      ) : (
                        initials(selectedPlayer.full_name)
                      )}
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-400">
                        Chief Arbiter
                      </p>
                      <h3 className="mt-1 text-xl font-black text-white">
                        {selectedPlayer.full_name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-400">
                        {selectedPlayer.club ?? "Chess official"}
                        {selectedPlayer.province
                          ? ` • ${selectedPlayer.province}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <label className="block">
                      <span className="mb-2 block text-sm font-semibold">
                        Upload profile photo
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadPhoto}
                        disabled={uploading}
                        className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={saveArbiter}
                      disabled={saving}
                      className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {saving ? "Saving..." : "Save Arbiter"}
                    </button>

                    <Link
                      href={`/players/${selectedPlayer.id}`}
                      className="block rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                    >
                      View Public Player Profile →
                    </Link>
                  </div>
                </div>
              ) : (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  Select an arbiter from the player list.
                </p>
              )}
            </section>

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Player Centre
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    Select tournament arbiter
                  </h2>
                </div>

                <Link
                  href="/admin/players"
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Open Player Centre
                </Link>
              </div>

              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search arbiter by name, Chess SA ID, FIDE ID, club or province..."
                className={`${inputClass} mt-6`}
              />

              <div className="mt-6 max-h-[680px] overflow-auto rounded-2xl border border-white/10">
                {filteredPlayers.length === 0 ? (
                  <p className="p-5 text-sm text-gray-400">No players found.</p>
                ) : (
                  filteredPlayers.map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setSelectedPlayerId(player.id)}
                      className={`flex w-full items-center gap-4 border-b border-white/10 p-4 text-left transition last:border-b-0 hover:bg-zinc-800 ${
                        selectedPlayerId === player.id ? "bg-red-500/10" : "bg-zinc-950"
                      }`}
                    >
                      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-zinc-900 text-xs font-black text-red-200">
                        {player.profile_photo_url ? (
                          <Image
                            src={player.profile_photo_url}
                            alt={player.full_name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : (
                          initials(player.full_name)
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-white">
                          {player.full_name}
                        </p>
                        <p className="mt-1 truncate text-xs text-gray-500">
                          {player.chess_sa_id ? `Chess SA: ${player.chess_sa_id}` : "No Chess SA ID"}
                          {player.rating ? ` • Rating: ${player.rating}` : ""}
                        </p>
                      </div>

                      {selectedPlayerId === player.id && (
                        <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
                          Selected
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </section>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}
