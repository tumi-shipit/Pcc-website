"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
};

type AccessRow = {
  id: string;
  tournament_id: string;
  player_id: string | null;
  chess_sa_id: string | null;
  organiser_email: string;
  organiser_name: string | null;
  role: string | null;
  access_status: string | null;
  created_at: string | null;
  tournaments: {
    tournament_name: string;
    start_date: string;
  } | null;
  players: {
    id: string;
    full_name: string;
    chess_sa_id: string | null;
  } | null;
};

type PlayerMatch = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  email: string | null;
};

export default function AdminOrganiserAccessPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [accessRows, setAccessRows] = useState<AccessRow[]>([]);
  const [tournamentId, setTournamentId] = useState("");
  const [organiserEmail, setOrganiserEmail] = useState("");
  const [organiserName, setOrganiserName] = useState("");
  const [chessSaId, setChessSaId] = useState("");
  const [role, setRole] = useState("Organiser");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function load() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date")
      .neq("registration_status", "Draft")
      .order("start_date", { ascending: false });

    const { data: accessData, error: accessError } = await supabase
      .from("tournament_organiser_access")
      .select("id, tournament_id, player_id, chess_sa_id, organiser_email, organiser_name, role, access_status, created_at, tournaments(tournament_name, start_date), players(id, full_name, chess_sa_id)")
      .order("created_at", { ascending: false });

    setTournaments((tournamentData ?? []) as Tournament[]);
    if (accessError) {
      setMessage(
        "Could not load organiser access. Create the tournament_organiser_access table first."
      );
    } else {
      setAccessRows((accessData ?? []) as unknown as AccessRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function grantAccess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const email = organiserEmail.trim().toLowerCase();
    const cleanChessSaId = chessSaId.trim();

    if (!cleanChessSaId) {
      setMessage("Chess SA ID is required before organiser access can be granted.");
      setSaving(false);
      return;
    }

    const { data: playerMatch, error: playerError } = await supabase
      .from("players")
      .select("id, full_name, chess_sa_id, email")
      .eq("chess_sa_id", cleanChessSaId)
      .maybeSingle();

    if (playerError || !playerMatch) {
      setMessage(
        "No Player Centre record was found for that Chess SA ID. Link or create the player first."
      );
      setSaving(false);
      return;
    }

    const matchedPlayer = playerMatch as PlayerMatch;

    const { error } = await supabase.from("tournament_organiser_access").upsert(
      {
        tournament_id: tournamentId,
        player_id: matchedPlayer.id,
        chess_sa_id: cleanChessSaId,
        organiser_email: email,
        organiser_name: organiserName.trim() || matchedPlayer.full_name,
        role,
        access_status: "Active",
      },
      { onConflict: "tournament_id,organiser_email" }
    );

    if (error) {
      setMessage(`Could not grant access: ${error.message}`);
      setSaving(false);
      return;
    }

    setMessage(`Access granted to ${email}.`);
    setOrganiserEmail("");
    setOrganiserName("");
    setChessSaId("");
    await load();
    setSaving(false);
  }

  async function revokeAccess(row: AccessRow) {
    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("tournament_organiser_access")
      .update({ access_status: "Revoked" })
      .eq("id", row.id);

    if (error) {
      setMessage(`Could not revoke access: ${error.message}`);
    } else {
      setMessage(`Access revoked for ${row.organiser_email}.`);
      await load();
    }

    setSaving(false);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin/home" className="text-sm font-semibold text-red-300">
            Back to Command Centre
          </Link>

          <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
                Scoped Access
              </p>
              <h1 className="mt-3 text-3xl font-black md:text-6xl">
                Organiser access
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
                Grant tournament-specific entry access. Organisers use the
                organiser portal and cannot access the admin dashboard.
              </p>

              <section className="mt-8 space-y-3 lg:hidden">
                {accessRows.map((row) => (
                  <article
                    key={row.id}
                    className="rounded-2xl border border-white/10 bg-zinc-900 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-lg font-black text-white">
                          {row.organiser_name || row.organiser_email}
                        </p>
                        <p className="mt-1 break-all text-xs text-zinc-500">
                          {row.organiser_email}
                        </p>
                      </div>
                      <span className="rounded-full bg-green-500/10 px-3 py-1 text-xs font-bold text-green-300">
                        {row.access_status ?? "Active"}
                      </span>
                    </div>

                    <div className="mt-4 space-y-2 text-sm text-zinc-400">
                      <p>
                        Player link: {row.players?.full_name ?? "Not linked"}
                      </p>
                      <p>
                        Chess SA:{" "}
                        {row.chess_sa_id ?? row.players?.chess_sa_id ?? "Not recorded"}
                      </p>
                      <p>
                        Tournament:{" "}
                        {row.tournaments?.tournament_name ?? row.tournament_id}
                      </p>
                      <p>Role: {row.role ?? "Organiser"}</p>
                    </div>

                    <button
                      type="button"
                      disabled={saving || row.access_status === "Revoked"}
                      onClick={() => revokeAccess(row)}
                      className="mt-4 w-full rounded-lg border border-red-500/40 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/10 disabled:opacity-40"
                    >
                      Revoke Access
                    </button>
                  </article>
                ))}
                {!loading && accessRows.length === 0 && (
                  <p className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
                    No organiser access has been granted yet.
                  </p>
                )}
              </section>

              <section className="mt-8 hidden overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 lg:block">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left text-sm">
                    <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                      <tr>
                        <th className="p-4">Organiser</th>
                        <th className="p-4">Chess SA link</th>
                        <th className="p-4">Tournament</th>
                        <th className="p-4">Role</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accessRows.map((row) => (
                        <tr key={row.id} className="border-t border-white/10">
                          <td className="p-4">
                            <p className="font-black text-white">
                              {row.organiser_name || row.organiser_email}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {row.organiser_email}
                            </p>
                          </td>
                          <td className="p-4">
                            <p className="font-bold text-white">
                              {row.players?.full_name ?? "Not linked"}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              Chess SA: {row.chess_sa_id ?? row.players?.chess_sa_id ?? "-"}
                            </p>
                          </td>
                          <td className="p-4 text-zinc-300">
                            {row.tournaments?.tournament_name ?? row.tournament_id}
                          </td>
                          <td className="p-4 text-zinc-300">{row.role ?? "Organiser"}</td>
                          <td className="p-4 text-zinc-300">
                            {row.access_status ?? "Active"}
                          </td>
                          <td className="p-4">
                            <button
                              type="button"
                              disabled={saving || row.access_status === "Revoked"}
                              onClick={() => revokeAccess(row)}
                              className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 disabled:opacity-40"
                            >
                              Revoke
                            </button>
                          </td>
                        </tr>
                      ))}
                      {!loading && accessRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-zinc-400">
                            No organiser access has been granted yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <form
              onSubmit={grantAccess}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-6"
            >
              <h2 className="text-2xl font-black">Grant access</h2>
              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">
                    Tournament
                  </span>
                  <select
                    required
                    value={tournamentId}
                    onChange={(event) => setTournamentId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  >
                    <option value="">Select tournament</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                        {tournament.tournament_name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">
                    Organiser email
                  </span>
                  <input
                    required
                    type="email"
                    value={organiserEmail}
                    onChange={(event) => setOrganiserEmail(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">
                    Chess SA ID
                  </span>
                  <input
                    required
                    value={chessSaId}
                    onChange={(event) => setChessSaId(event.target.value)}
                    placeholder="Must match an existing Player Centre record"
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">
                    Organiser name
                  </span>
                  <input
                    value={organiserName}
                    onChange={(event) => setOrganiserName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">Role</span>
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  >
                    <option>Organiser</option>
                    <option>Tournament Director</option>
                    <option>Chief Arbiter</option>
                    <option>Registration Manager</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="mt-6 w-full rounded-lg bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Grant tournament access"}
              </button>

              {message && (
                <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
                  {message}
                </p>
              )}
            </form>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}
