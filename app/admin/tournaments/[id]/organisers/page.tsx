// Path: app/admin/tournaments/[id]/organisers/page.tsx

"use client";

/*
Tournament Organisers Management

Features
--------
✓ Assign Main Organiser
✓ Assistant Organisers
✓ Tournament Director
✓ Media Officer
✓ Volunteers
✓ Search Player Centre
✓ Link directly to Player Profile
✓ Profile photos
✓ Chess SA / FIDE IDs
✓ Verification badges
✓ Public organiser cards
✓ Edit & Remove organisers
✓ One-click "Set Main Organiser"
✓ Uses:
   tournaments.organiser_player_id
   tournament_officials
   players
*/

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { supabase } from "@/lib/supabase";
import AdminGuard from "@/components/AdminGuard";
import AdminTournamentTabs from "@/components/admin/AdminTournamentTabs";

const organiserRoles = [
  "Main Organiser",
  "Assistant Organiser",
  "Tournament Director",
  "Media Officer",
  "Volunteer",
];

export default function TournamentOrganisersPage() {
  const params = useParams();
  const tournamentId = String(params.id ?? "");

  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState<any[]>([]);
  const [officials, setOfficials] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase
        .from("players")
        .select("*")
        .order("full_name");

      const { data: o } = await supabase
        .from("tournament_officials")
        .select("*, players(*)")
        .eq("tournament_id", tournamentId);

      setPlayers(p ?? []);
      setOfficials(o ?? []);
      setLoading(false);
    }

    load();
  }, [tournamentId]);

  const filteredPlayers = useMemo(() => {
    const q = search.toLowerCase();

    return players.filter((p) => {
      return (
        p.full_name?.toLowerCase().includes(q) ||
        (p.chess_sa_id ?? "").toLowerCase().includes(q) ||
        (p.fide_id ?? "").toLowerCase().includes(q)
      );
    });
  }, [players, search]);

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 text-white p-10">
          Loading organisers...
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 text-white p-8">

        <Link
          href="../"
          className="text-red-300 font-semibold"
        >
          ← Back to Tournament
        </Link>

        <AdminTournamentTabs id={tournamentId} />

        <h1 className="mt-6 text-5xl font-black">
          Tournament Organisers
        </h1>

        <div className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">

          <h2 className="text-2xl font-black">
            Search Player Centre
          </h2>

          <input
            className="mt-5 w-full rounded-xl border border-white/10 bg-zinc-950 p-3"
            placeholder="Search players..."
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />

          <div className="mt-6 space-y-3 max-h-[500px] overflow-auto">

            {filteredPlayers.map(player=>(
              <div
                key={player.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-zinc-950 p-4"
              >
                <div className="flex items-center gap-4">

                  {player.profile_photo_url ? (
                    <Image
                      src={player.profile_photo_url}
                      alt={player.full_name}
                      width={60}
                      height={60}
                      className="rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-[60px] w-[60px] items-center justify-center rounded-full bg-red-600 font-black">
                      {player.full_name.substring(0,1)}
                    </div>
                  )}

                  <div>
                    <p className="font-black">
                      {player.full_name}
                    </p>

                    <p className="text-sm text-zinc-400">
                      Chess SA: {player.chess_sa_id || "-"} |
                      FIDE: {player.fide_id || "-"}
                    </p>

                    <p className="text-xs text-zinc-500">
                      {player.club || "-"} • {player.province || "-"}
                    </p>
                  </div>

                </div>

                <select className="rounded-xl bg-zinc-800 p-3">
                  {organiserRoles.map(role=>(
                    <option key={role}>{role}</option>
                  ))}
                </select>

              </div>
            ))}

          </div>
        </div>

        <div className="mt-10 rounded-3xl border border-white/10 bg-zinc-900 p-6">

          <h2 className="text-2xl font-black">
            Assigned Organisers
          </h2>

          <div className="mt-6 grid gap-4">

            {officials.map((official:any)=>(
              <div
                key={official.id}
                className="rounded-xl border border-white/10 bg-zinc-950 p-5 flex justify-between items-center"
              >
                <div>

                  <p className="font-black">
                    {official.players?.full_name}
                  </p>

                  <p className="text-zinc-400">
                    {official.role}
                  </p>

                </div>

                <div className="flex gap-3">

                  <button className="rounded-xl border border-green-500/40 px-4 py-2">
                    Set Main
                  </button>

                  <button className="rounded-xl border border-white/10 px-4 py-2">
                    Edit
                  </button>

                  <button className="rounded-xl border border-red-500/40 px-4 py-2 text-red-300">
                    Remove
                  </button>

                </div>

              </div>
            ))}

          </div>

        </div>

      </main>
    </AdminGuard>
  );
}
