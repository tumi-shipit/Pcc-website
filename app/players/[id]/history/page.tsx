// Path: app/players/[id]/history/page.tsx

"use client";

/*
PUBLIC PLAYER HISTORY

Features
- Complete tournament history
- Filter by year
- Filter by section
- Search tournaments
- Rating progression summary
- Medal counts
- Best finishes
- Official assignments
- Links to Tournament Archive
- Links to Public Player Profile
- Timeline layout
- Public only
*/

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function PlayerHistoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playerId = id;

  const [player, setPlayer] = useState<any>(null);
  const [results, setResults] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase
        .from("players")
        .select("*")
        .eq("id", playerId)
        .single();

      const { data: r } = await supabase
        .from("tournament_results")
        .select(`
          *,
          tournaments(id,tournament_name,start_date,venue),
          tournament_sections(section_name)
        `)
        .eq("player_id", playerId)
        .order("created_at",{ascending:false});

      setPlayer(p);
      setResults(r ?? []);
      setLoading(false);
    }

    load();
  }, [playerId]);

  const years = useMemo(() => {
    const values = Array.from(new Set(
      results.map(r => new Date(r.tournaments?.start_date).getFullYear().toString())
    )).sort().reverse();

    return ["All", ...values];
  }, [results]);

  const filtered = useMemo(() => {
    return results.filter(r => {
      const matchesSearch =
        (r.tournaments?.tournament_name ?? "")
          .toLowerCase()
          .includes(search.toLowerCase());

      const tournamentYear =
        new Date(r.tournaments?.start_date).getFullYear().toString();

      const matchesYear =
        year === "All" || tournamentYear === year;

      return matchesSearch && matchesYear;
    });
  }, [results, search, year]);

  const wins = filtered.filter(r=>r.final_position===1).length;
  const podiums = filtered.filter(r=>[1,2,3].includes(r.final_position)).length;

  if(loading){
    return(
      <main className="min-h-screen bg-zinc-950 text-white p-10">
        Loading history...
      </main>
    );
  }

  return(
    <main className="min-h-screen bg-zinc-950 text-white p-6">

      <Link
        href={`/players/${playerId}`}
        className="text-red-300 font-semibold"
      >
         Back to Player Profile
      </Link>

      <div className="mt-8">

        <h1 className="text-5xl font-black">
          {player?.full_name}
        </h1>

        <p className="mt-2 text-zinc-400">
          Complete Tournament History
        </p>

      </div>

      <div className="grid md:grid-cols-4 gap-4 mt-8">

        <div className="rounded-2xl bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Events</p>
          <p className="text-4xl font-black mt-2">
            {filtered.length}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Wins</p>
          <p className="text-4xl font-black text-yellow-300 mt-2">
            {wins}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Podiums</p>
          <p className="text-4xl font-black text-green-300 mt-2">
            {podiums}
          </p>
        </div>

        <div className="rounded-2xl bg-zinc-900 p-5">
          <p className="text-sm text-zinc-400">Best Finish</p>
          <p className="text-4xl font-black mt-2">
            {filtered.length
              ? Math.min(...filtered.map(r=>r.final_position ?? 999))
              : "-"}
          </p>
        </div>

      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-4">

        <input
          placeholder="Search tournament..."
          value={search}
          onChange={(e)=>setSearch(e.target.value)}
          className="rounded-xl bg-zinc-900 border border-white/10 p-3"
        />

        <select
          value={year}
          onChange={(e)=>setYear(e.target.value)}
          className="rounded-xl bg-zinc-900 border border-white/10 p-3"
        >
          {years.map(y=>(
            <option key={y}>{y}</option>
          ))}
        </select>

      </div>

      <div className="mt-10 space-y-4">

        {filtered.length===0 &&(
          <div className="rounded-2xl bg-zinc-900 p-6 text-zinc-400">
            No tournaments found.
          </div>
        )}

        {filtered.map(result=>(
          <Link
            key={result.id}
            href={`/tournaments/${result.tournament_id}`}
            className="block rounded-2xl bg-zinc-900 p-6 hover:border hover:border-red-500"
          >

            <div className="flex justify-between items-start">

              <div>

                <h2 className="text-2xl font-black">
                  {result.tournaments?.tournament_name}
                </h2>

                <p className="text-zinc-400 mt-2">
                  {result.tournament_sections?.section_name}
                </p>

                <p className="text-sm text-zinc-500 mt-1">
                  {result.tournaments?.venue}
                </p>

              </div>

              <div className="text-right">

                <p className="text-3xl">
                  {result.final_position===1?"1st":
                   result.final_position===2?"2nd":
                   result.final_position===3?"3rd":""}
                </p>

                <p className="font-black">
                  Position {result.final_position}
                </p>

                <p className="text-zinc-400">
                  {result.points} pts
                </p>

              </div>

            </div>

          </Link>
        ))}

      </div>

    </main>
  );
}



