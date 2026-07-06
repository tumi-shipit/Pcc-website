"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "../lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  organiser_name: string | null;
  description: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: "Draft" | "Open" | "Closed" | "Live" | "Completed";
  entry_fee: number;
  poster_image_url: string | null;
};

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(amount: number) {
  if (amount === 0) return "Free / TBA";

  return new Intl.NumberFormat("en-ZA", {
    style: "currency",
    currency: "ZAR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function getStatusLabel(status: Tournament["registration_status"]) {
  if (status === "Open") return "Open";
  if (status === "Live") return "Live";
  if (status === "Completed") return "Completed";
  if (status === "Closed") return "Not Open";
  return "Coming Soon";
}

function getStatusClass(status: Tournament["registration_status"]) {
  if (status === "Open") return "bg-green-600";
  if (status === "Live") return "bg-red-600";
  if (status === "Completed") return "bg-blue-600";
  return "bg-zinc-700";
}

function TournamentCard({
  tournament,
  archive = false,
}: {
  tournament: Tournament;
  archive?: boolean;
}) {
  const isOpen = tournament.registration_status === "Open";

  return (
    <article className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-900 transition duration-300 hover:-translate-y-1 hover:border-red-500/60">
      <Link
        href={`/tournaments/${tournament.id}`}
        className="relative block aspect-[3/4] overflow-hidden bg-black"
      >
        {tournament.poster_image_url ? (
          <Image
            src={tournament.poster_image_url}
            alt={`${tournament.tournament_name} poster`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center px-3 text-center text-xs text-gray-500">
            Poster coming soon
          </div>
        )}

        <span
          className={`absolute left-2 top-2 rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-white ${getStatusClass(
            tournament.registration_status
          )}`}
        >
          {archive ? "Archive" : getStatusLabel(tournament.registration_status)}
        </span>
      </Link>

      <div className="p-3 md:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-red-400 md:text-xs">
          {formatDate(tournament.start_date)}
        </p>

        <Link href={`/tournaments/${tournament.id}`}>
          <h3 className="mt-2 line-clamp-2 text-sm font-bold leading-5 transition hover:text-red-400 md:text-base">
            {tournament.tournament_name}
          </h3>
        </Link>

        {tournament.organiser_name && (
          <p className="mt-2 line-clamp-1 text-xs font-semibold text-red-300">
            Hosted by {tournament.organiser_name}
          </p>
        )}

        <p className="mt-2 line-clamp-1 text-xs text-gray-400">
          {tournament.venue}
        </p>

        <p className="mt-1 text-xs font-semibold text-gray-300">
          {archive ? "Results & gallery" : formatMoney(tournament.entry_fee)}
        </p>

        <div className="mt-4 grid gap-2">
          <Link
            href={`/tournaments/${tournament.id}`}
            className="block rounded-lg border border-white/10 px-3 py-2 text-center text-xs font-semibold text-white transition hover:border-red-500"
          >
            {archive ? "View Archive" : "View Tournament"}
          </Link>

          {!archive &&
            (isOpen ? (
              <Link
                href="/register"
                className="block rounded-lg bg-red-600 px-3 py-2 text-center text-xs font-semibold text-white transition hover:bg-red-700"
              >
                Register
              </Link>
            ) : (
              <span className="block rounded-lg bg-zinc-800 px-3 py-2 text-center text-xs text-gray-400">
                Not Open
              </span>
            ))}
        </div>
      </div>
    </article>
  );
}

export default function Tournaments() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadTournaments() {
      setLoading(true);
      setErrorMessage("");

      const { data, error } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, organiser_name, description, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url"
        )
        .neq("registration_status", "Draft")
        .order("start_date", { ascending: true });

      if (error) {
        console.error("Tournament loading error:", error);
        setErrorMessage("Could not load tournaments. Please try again later.");
        setTournaments([]);
      } else {
        setTournaments((data ?? []) as Tournament[]);
      }

      setLoading(false);
    }

    loadTournaments();
  }, []);

  const upcomingTournaments = tournaments.filter(
    (tournament) => tournament.registration_status !== "Completed"
  );

  const pastTournaments = tournaments.filter(
    (tournament) => tournament.registration_status === "Completed"
  );

  return (
    <section id="tournaments" className="bg-zinc-950 py-16 text-white md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="mb-8 max-w-3xl md:mb-12">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-500 md:text-sm">
            Tournament Centre
          </p>

          <h2 className="text-3xl font-bold md:text-5xl">
            Upcoming Tournaments
          </h2>

          <p className="mt-4 text-sm leading-6 text-gray-400 md:text-lg md:leading-8">
            View tournament details, posters and registration status. Entries
            only open when organisers make registration available.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm leading-6 text-gray-400">
            <p className="font-semibold text-white">
              Why are different tournaments listed here?
            </p>

            <p className="mt-2">
              The PCC Tournament Centre supports chess development by helping
              clubs, schools and districts manage online registrations. Some
              tournaments are organised directly by Polokwane Chess Club, while
              others are hosted by partner clubs, schools or district chess
              structures.
            </p>

            <p className="mt-2">
              Each tournament remains under the authority of its official
              organiser. PCC provides the registration platform, tournament page
              and admin support where requested.
            </p>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400">Loading tournaments...</p>
        ) : errorMessage ? (
          <p className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-100">
            {errorMessage}
          </p>
        ) : (
          <>
            {upcomingTournaments.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {upcomingTournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-zinc-900 p-5 text-sm text-gray-400">
                No upcoming tournaments are currently listed.
              </p>
            )}

            {pastTournaments.length > 0 && (
              <div className="mt-16 border-t border-white/10 pt-12">
                <div className="mb-8 max-w-3xl">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-red-500 md:text-sm">
                    Tournament Archive
                  </p>

                  <h2 className="text-3xl font-bold md:text-5xl">
                    Past Tournaments
                  </h2>

                  <p className="mt-4 text-sm leading-6 text-gray-400 md:text-lg md:leading-8">
                    Revisit completed events, tournament reports, photos and
                    results.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {pastTournaments.map((tournament) => (
                    <TournamentCard
                      key={tournament.id}
                      tournament={tournament}
                      archive
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
