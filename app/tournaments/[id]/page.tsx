"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  description: string | null;
  tournament_report: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: string;
  entry_fee: number;
  poster_image_url: string | null;
  payment_details: string | null;
  arbiter_player_id: string | null;
};

type TournamentSection = {
  id: string;
  section_name: string;
  entry_fee_override: number | null;
  maximum_players: number | null;
};

type TournamentStats = {
  tournament_id: string;
  total_registrations: number;
  approved_registrations: number;
  paid_registrations: number;
};

type GalleryImage = {
  id: string;
  tournament_id: string;
  image_url: string;
  caption: string | null;
  display_order: number | null;
  created_at: string;
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

type TournamentResult = {
  id: string;
  tournament_id: string;
  player_id: string | null;
  section_id: string | null;
  final_position: number | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  notes: string | null;
};

type ResultWithPlayer = TournamentResult & {
  player: Player | null;
  section: TournamentSection | null;
};

function formatDate(date: string | null) {
  if (!date) return "TBA";

  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
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

function statusStyle(status: string) {
  if (status === "Open")
    return "border-green-500/40 bg-green-500/10 text-green-300";
  if (status === "Completed")
    return "border-blue-500/40 bg-blue-500/10 text-blue-300";
  if (status === "Live")
    return "border-red-500/40 bg-red-500/10 text-red-300";
  return "border-zinc-500/40 bg-zinc-500/10 text-zinc-300";
}

function statusLabel(status: string) {
  if (status === "Open") return "Registration Open";
  if (status === "Completed") return "Tournament Archive";
  if (status === "Live") return "Live Tournament";
  return "Registration Not Open";
}

function medal(position: number | null) {
  if (position === 1) return "🥇";
  if (position === 2) return "🥈";
  if (position === 3) return "🥉";
  return "♟";
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function TournamentHubPage() {
  const params = useParams();
  const tournamentId = String(params.id);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [sections, setSections] = useState<TournamentSection[]>([]);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [results, setResults] = useState<ResultWithPlayer[]>([]);
  const [arbiter, setArbiter] = useState<Player | null>(null);
  const [selectedGalleryImage, setSelectedGalleryImage] =
    useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const isOpen = tournament?.registration_status === "Open";
  const isCompleted = tournament?.registration_status === "Completed";

  const isShere = useMemo(() => {
    return tournament?.tournament_name.toLowerCase().includes("shere") ?? false;
  }, [tournament]);

  useEffect(() => {
    async function loadTournamentHub() {
      setLoading(true);
      setMessage("");

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, description, tournament_report, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url, payment_details, arbiter_player_id"
        )
        .eq("id", tournamentId)
        .single();

      if (tournamentError || !tournamentData) {
        setMessage("Tournament could not be found.");
        setLoading(false);
        return;
      }

      const loadedTournament = tournamentData as Tournament;

      const { data: sectionData } = await supabase
        .from("tournament_sections")
        .select("id, section_name, entry_fee_override, maximum_players")
        .eq("tournament_id", tournamentId)
        .order("section_name", { ascending: true });

      const loadedSections = (sectionData ?? []) as TournamentSection[];

      const { data: statsData } = await supabase
        .from("tournament_public_stats")
        .select(
          "tournament_id, total_registrations, approved_registrations, paid_registrations"
        )
        .eq("tournament_id", tournamentId)
        .single();

      const { data: galleryData } = await supabase
        .from("tournament_gallery")
        .select("id, tournament_id, image_url, caption, display_order, created_at")
        .eq("tournament_id", tournamentId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      const { data: resultData } = await supabase
        .from("tournament_results")
        .select(
          "id, tournament_id, player_id, section_id, final_position, points, tie_break, award_title, notes"
        )
        .eq("tournament_id", tournamentId)
        .order("section_id", { ascending: true, nullsFirst: true })
        .order("final_position", { ascending: true, nullsFirst: false })
        .order("points", { ascending: false, nullsFirst: false });

      const resultRows = (resultData ?? []) as TournamentResult[];

      const playerIds = [
        ...new Set(
          [
            ...resultRows.map((row) => row.player_id),
            loadedTournament.arbiter_player_id,
          ].filter(Boolean) as string[]
        ),
      ];

      let players: Player[] = [];

      if (playerIds.length > 0) {
        const { data: playerData } = await supabase
          .from("players")
          .select(
            "id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url"
          )
          .in("id", playerIds);

        players = (playerData ?? []) as Player[];
      }

      const resultRowsWithPlayers = resultRows.map((result) => ({
        ...result,
        player:
          players.find((player) => player.id === result.player_id) ?? null,
        section:
          loadedSections.find((section) => section.id === result.section_id) ??
          null,
      }));

      setTournament(loadedTournament);
      setSections(loadedSections);
      setStats((statsData ?? null) as TournamentStats | null);
      setGallery((galleryData ?? []) as GalleryImage[]);
      setResults(resultRowsWithPlayers);
      setArbiter(
        players.find((player) => player.id === loadedTournament.arbiter_player_id) ??
          null
      );
      setLoading(false);
    }

    if (tournamentId) loadTournamentHub();
  }, [tournamentId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
          Loading tournament hub...
        </div>
      </main>
    );
  }

  if (message || !tournament) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          <h1 className="text-2xl font-bold">Tournament not found</h1>
          <p className="mt-3">{message || "Tournament could not be found."}</p>
          <Link
            href="/#tournaments"
            className="mt-5 inline-block rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Back to Tournament Centre
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pt-24 text-white">
      <section className="border-b border-white/10 bg-[radial-gradient(circle_at_top_right,_rgba(220,38,38,0.22),_transparent_42%)]">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[360px_1fr] md:px-6 md:py-14">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
            <div className="relative aspect-[3/4]">
              {tournament.poster_image_url ? (
                <Image
                  src={tournament.poster_image_url}
                  alt={`${tournament.tournament_name} poster`}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 360px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Poster coming soon
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <Link
              href="/#tournaments"
              className="text-sm font-semibold text-red-300 transition hover:text-red-200"
            >
              ← Back to Tournament Centre
            </Link>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
              Tournament Hub
            </p>

            <h1 className="mt-3 text-3xl font-black leading-tight md:text-6xl">
              {tournament.tournament_name}
            </h1>

            <div className="mt-5 flex flex-wrap gap-3">
              <span
                className={`rounded-full border px-4 py-2 text-sm font-bold ${statusStyle(
                  tournament.registration_status
                )}`}
              >
                {statusLabel(tournament.registration_status)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-gray-200">
                {formatDate(tournament.start_date)}
              </span>
              <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm text-gray-200">
                {tournament.venue}
              </span>
            </div>

            {tournament.description && (
              <p className="mt-6 max-w-3xl text-sm leading-7 text-gray-300 md:text-lg md:leading-8">
                {tournament.description}
              </p>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              {isOpen ? (
                <Link
                  href="/register"
                  className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Register Now
                </Link>
              ) : (
                <span className="rounded-xl bg-zinc-800 px-6 py-3 text-sm font-semibold text-gray-400">
                  {isCompleted ? "Archived Event" : "Registration Not Open"}
                </span>
              )}

              {isCompleted && results.length > 0 && (
                <a
                  href="#final-ranking"
                  className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  View Final Ranking
                </a>
              )}

              {isShere && (
                <>
                  <a
                    href="https://s2.chess-results.com/tnr1445907.aspx?lan=1&art=4&SNode=S0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Open Results
                  </a>
                  <a
                    href="https://s1.chess-results.com/tnr1445906.aspx?lan=1&art=4&SNode=S0"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500"
                  >
                    Junior Results
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="grid gap-5 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Registered players</p>
            <p className="mt-2 text-3xl font-bold">
              {stats?.total_registrations ?? 0}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Status</p>
            <p className="mt-2 text-lg font-bold">
              {statusLabel(tournament.registration_status)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Entry fee</p>
            <p className="mt-2 text-lg font-bold">
              {formatMoney(tournament.entry_fee)}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Sections</p>
            <p className="mt-2 text-lg font-bold">
              {sections.length > 0
                ? `${sections.length} sections`
                : isShere
                ? "Open & Junior"
                : "TBA"}
            </p>
          </div>
        </div>

        {arbiter && <ArbiterCard arbiter={arbiter} />}

        {isCompleted && (
          <ArchiveContent
            tournament={tournament}
            isShere={isShere}
            results={results}
          />
        )}

        {!isCompleted && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
              <h2 className="text-xl font-bold md:text-2xl">
                Tournament Information
              </h2>
              <div className="mt-5 grid gap-4 text-sm text-gray-300 md:grid-cols-2">
                <p>
                  <span className="font-semibold text-white">Date:</span>{" "}
                  {formatDate(tournament.start_date)}
                </p>
                <p>
                  <span className="font-semibold text-white">End date:</span>{" "}
                  {formatDate(tournament.end_date ?? tournament.start_date)}
                </p>
                <p>
                  <span className="font-semibold text-white">Venue:</span>{" "}
                  {tournament.venue}
                </p>
                <p>
                  <span className="font-semibold text-white">Province:</span>{" "}
                  {tournament.province ?? "TBA"}
                </p>
                <p>
                  <span className="font-semibold text-white">Entry fee:</span>{" "}
                  {formatMoney(tournament.entry_fee)}
                </p>
                <p>
                  <span className="font-semibold text-white">Status:</span>{" "}
                  {statusLabel(tournament.registration_status)}
                </p>
              </div>

              {tournament.payment_details && (
                <div className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm leading-6 text-gray-300">
                  <p className="font-semibold text-white">Payment details</p>
                  <p className="mt-2">{tournament.payment_details}</p>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
              <h2 className="text-xl font-bold md:text-2xl">Sections</h2>
              {sections.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">
                  Sections will be confirmed soon.
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {sections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-white/10 bg-zinc-950 p-4"
                    >
                      <p className="font-bold">{section.section_name}</p>
                      <p className="mt-1 text-xs text-gray-400">
                        {section.entry_fee_override
                          ? formatMoney(section.entry_fee_override)
                          : "Standard fee"}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {isCompleted && (
          <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Tournament Gallery
                </p>
                <h2 className="mt-2 text-2xl font-black md:text-4xl">
                  📸 Photo Archive
                </h2>
                <p className="mt-3 text-sm leading-6 text-gray-400">
                  Photos from prize-giving, action boards and tournament moments.
                </p>
              </div>

              <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
                {gallery.length} photo{gallery.length === 1 ? "" : "s"}
              </span>
            </div>

            {gallery.length === 0 ? (
              <p className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                Gallery coming soon.
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {gallery.map((image) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedGalleryImage(image)}
                    className="group overflow-hidden rounded-xl border border-white/10 bg-zinc-950 text-left transition hover:border-red-500"
                  >
                    <div className="relative aspect-square">
                      <Image
                        src={image.image_url}
                        alt={image.caption ?? "Tournament gallery image"}
                        fill
                        sizes="(max-width: 768px) 50vw, 25vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>

                    {image.caption && (
                      <p className="line-clamp-2 p-3 text-xs text-gray-400">
                        {image.caption}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}
      </section>

      {selectedGalleryImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
          <button
            type="button"
            onClick={() => setSelectedGalleryImage(null)}
            className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-gray-200"
          >
            Close
          </button>

          <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl border border-white/10 bg-zinc-950 p-3">
            <img
              src={selectedGalleryImage.image_url}
              alt={selectedGalleryImage.caption ?? "Tournament gallery image"}
              className="mx-auto max-h-[78vh] w-auto rounded-xl object-contain"
            />

            {selectedGalleryImage.caption && (
              <p className="px-3 py-4 text-center text-sm text-gray-300">
                {selectedGalleryImage.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

function ArbiterCard({ arbiter }: { arbiter: Player }) {
  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href={`/players/${arbiter.id}`}
            className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-500/30 bg-red-600/10 text-xl font-black text-red-200"
          >
            {arbiter.profile_photo_url ? (
              <Image
                src={arbiter.profile_photo_url}
                alt={arbiter.full_name}
                fill
                sizes="80px"
                className="object-cover"
              />
            ) : (
              initials(arbiter.full_name)
            )}
          </Link>

          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Chief Arbiter
            </p>
            <Link
              href={`/players/${arbiter.id}`}
              className="mt-1 block text-2xl font-black text-white transition hover:text-red-300"
            >
              {arbiter.full_name}
            </Link>
            <p className="mt-1 text-sm text-gray-400">
              {arbiter.club ?? "Chess official"}
              {arbiter.province ? ` • ${arbiter.province}` : ""}
            </p>
          </div>
        </div>

        <Link
          href={`/players/${arbiter.id}`}
          className="rounded-xl border border-white/10 px-5 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
        >
          View Profile →
        </Link>
      </div>
    </section>
  );
}

function ArchiveContent({
  tournament,
  isShere,
  results,
}: {
  tournament: Tournament;
  isShere: boolean;
  results: ResultWithPlayer[];
}) {
  return (
    <div className="mt-8 space-y-8">
      {tournament.tournament_report ? (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Tournament Report
          </p>

          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            {tournament.tournament_name}
          </h2>

          <div className="mt-6 space-y-5 text-sm leading-7 text-gray-300 md:text-base md:leading-8">
            {tournament.tournament_report.split("\n").map((paragraph, index) =>
              paragraph.trim() ? <p key={index}>{paragraph}</p> : null
            )}
          </div>
        </section>
      ) : isShere ? (
        <ShereArchive />
      ) : (
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Tournament Archive
          </p>

          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            Archive event
          </h2>

          <p className="mt-4 text-sm leading-7 text-gray-300 md:text-base md:leading-8">
            This tournament is part of the PCC historical archive.
          </p>
        </section>
      )}

      <FinalRankingTable results={results} />
    </div>
  );
}

function FinalRankingTable({ results }: { results: ResultWithPlayer[] }) {
  if (results.length === 0) {
    return (
      <section
        id="final-ranking"
        className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8"
      >
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
          Final Ranking
        </p>
        <h2 className="mt-3 text-2xl font-black md:text-4xl">
          Results coming soon
        </h2>
        <p className="mt-4 text-sm leading-7 text-gray-400">
          Final standings will appear here once the organiser imports or confirms
          the tournament results.
        </p>
      </section>
    );
  }

  return (
    <section
      id="final-ranking"
      className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Final Ranking
          </p>
          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            🏆 Final Standings
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Official final ranking imported from tournament results.
          </p>
        </div>

        <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
          {results.length} player{results.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6 overflow-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
            <tr>
              <th className="p-4">Rank</th>
              <th className="p-4">Player</th>
              <th className="p-4">Section</th>
              <th className="p-4">Rating</th>
              <th className="p-4">Points</th>
              <th className="p-4">Tie-break</th>
              <th className="p-4">Award</th>
            </tr>
          </thead>

          <tbody>
            {results.map((result) => (
              <tr key={result.id} className="border-t border-white/10">
                <td className="p-4 font-black text-white">
                  {medal(result.final_position)}{" "}
                  {result.final_position ?? "-"}
                </td>

                <td className="p-4">
                  {result.player ? (
                    <Link
                      href={`/players/${result.player.id}`}
                      className="font-bold text-white transition hover:text-red-300"
                    >
                      {result.player.full_name}
                    </Link>
                  ) : (
                    <span className="text-gray-400">Player not linked</span>
                  )}

                  {result.player?.club && (
                    <p className="mt-1 text-xs text-gray-500">
                      {result.player.club}
                    </p>
                  )}
                </td>

                <td className="p-4 text-gray-300">
                  {result.section?.section_name ?? "Overall"}
                </td>

                <td className="p-4 text-gray-300">
                  {result.player?.rating ?? "-"}
                </td>

                <td className="p-4 font-bold text-white">
                  {result.points ?? "-"}
                </td>

                <td className="p-4 text-gray-300">
                  {result.tie_break ?? "-"}
                </td>

                <td className="p-4">
                  {result.award_title ? (
                    <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold text-yellow-200">
                      {result.award_title}
                    </span>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ShereArchive() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
          Tournament Report
        </p>
        <h2 className="mt-3 text-2xl font-black md:text-4xl">
          Young Stars Shine at the SHERE Chess Open 2026
        </h2>

        <div className="mt-6 space-y-5 text-sm leading-7 text-gray-300 md:text-base md:leading-8">
          <p>
            The SHERE Chess Open 2026, hosted by Glen Cowie Pioneers Chess Club,
            delivered an unforgettable day of competitive chess as experienced
            campaigners and rising young stars battled for top honours in both
            the Open and Junior sections.
          </p>
          <p>
            Held in honour of Shere, a respected member of the local chess
            community, the tournament celebrated not only competitive chess but
            also the passion and continued growth of the game in Sekhukhune.
          </p>
          <p>
            The biggest story of the day came in the Open Section, where{" "}
            <strong className="text-white">Mphahlele Phetolo</strong> produced a
            sensational performance to lift the championship against a field
            packed with experienced competitors.
          </p>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
          <h2 className="text-2xl font-black">🏅 Tournament Honours</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
              <h3 className="font-bold text-red-300">Open Section</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <p>
                  🥇 <strong className="text-white">Champion:</strong> Mphahlele
                  Phetolo
                </p>
                <p>
                  🥈 <strong className="text-white">Runner-up:</strong> Leshaba
                  Surprise
                </p>
                <p>
                  🥉 <strong className="text-white">Third Place:</strong> Daniel
                  Tshehla
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
              <h3 className="font-bold text-red-300">Junior Section</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <p>
                  🥇 <strong className="text-white">Champion:</strong> Lesedi
                  Motsifane
                </p>
                <p>
                  🥈 <strong className="text-white">Runner-up:</strong> Matabane
                  Mahlogonolo
                </p>
                <p>
                  🥉 <strong className="text-white">Third Place:</strong> Bapela
                  Ofentse
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 md:p-8">
          <h2 className="text-2xl font-black text-yellow-100">
            ⭐ Player of the Tournament
          </h2>
          <h3 className="mt-4 text-xl font-bold text-white">Elias Mabotja</h3>
          <p className="mt-4 text-sm leading-7 text-yellow-50/90 md:text-base md:leading-8">
            Widely known for his service to chess as an organiser, coach and
            qualified arbiter, Elias is not a regular competitive player. Despite
            spending most of his time developing the game away from the board, he
            accepted the challenge of competing against experienced tournament
            players.
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5 md:p-8">
        <h2 className="text-2xl font-black text-red-100">
          🔥 Upset of the Tournament
        </h2>
        <p className="mt-4 text-sm leading-7 text-red-50/90 md:text-base md:leading-8">
          Elias Mabotja defeated Daniel Tshehla — the only player to defeat
          eventual champion Mphahlele Phetolo.
        </p>
      </section>
    </div>
  );
}
