"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
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
  chess_results_url: string | null;
  arbiter_player_id: string | null;
};

type TournamentSection = {
  id: string;
  section_name: string;
  minimum_birth_year?: number | null;
  maximum_birth_year?: number | null;
  minimum_rating?: number | null;
  maximum_rating?: number | null;
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
  imported_name: string | null;
  imported_rating: number | null;
  federation: string | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  notes: string | null;
};

type ResultWithPlayer = TournamentResult & {
  player: Player | null;
  section: TournamentSection | null;
};

type TournamentOfficialRow = {
  id: string;
  tournament_id: string;
  player_id: string;
  role: string;
  notes: string | null;
  players: Player | Player[] | null;
};

type TournamentRoleProfileRow = {
  id: string;
  tournament_id: string;
  player_id: string | null;
  role: string;
  notes: string | null;
  role_group: string;
  full_name: string | null;
  chess_sa_id: string | null;
  fide_id: string | null;
  rating: number | null;
  club: string | null;
  province: string | null;
  profile_photo_url: string | null;
};

type PublicOfficial = {
  id: string;
  tournament_id: string;
  player_id: string | null;
  role: string;
  notes: string | null;
  roleGroup?: string;
  player: Player | null;
};

type Organisation = {
  id: string;
  name: string;
  logo_url: string | null;
  website_url: string | null;
  representative_name: string | null;
};

type CommitteeMember = {
  id: string;
  organisation_id: string;
  full_name: string;
  role_title: string | null;
};

type TournamentOrganisationRow = {
  id: string;
  tournament_id: string;
  organisation_id: string;
  role: string;
  representative_member_id: string | null;
  representative_name: string | null;
  notes: string | null;
  display_order: number | null;
};

type PublicTournamentOrganisation = TournamentOrganisationRow & {
  organisation: Organisation | null;
  representative: CommitteeMember | null;
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
  if (amount === 0) return "Free";

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
  if (status === "Completed") return "Completed Tournament";
  if (status === "Live") return "Live Tournament";
  return "Registration Not Open";
}

function medal(position: number | null) {
  if (position === 1) return "1st";
  if (position === 2) return "2nd";
  if (position === 3) return "3rd";
  return "";
}

function publicResultName(result: ResultWithPlayer) {
  return result.imported_name?.trim() || result.player?.full_name || "Player";
}

function publicResultRating(result: ResultWithPlayer) {
  return result.imported_rating ?? result.player?.rating ?? null;
}

function publicResultFederation(result: ResultWithPlayer) {
  return result.federation?.trim() || "-";
}

function sectionRuleLabel(section: TournamentSection) {
  const rules: string[] = [];

  if (section.minimum_birth_year && section.maximum_birth_year) {
    rules.push(`Born ${section.minimum_birth_year}-${section.maximum_birth_year}`);
  } else if (section.minimum_birth_year) {
    rules.push(`Born ${section.minimum_birth_year}+`);
  }

  if (section.minimum_rating && section.maximum_rating) {
    rules.push(`Rating ${section.minimum_rating}-${section.maximum_rating}`);
  } else if (section.minimum_rating) {
    rules.push(`Rating ${section.minimum_rating}+`);
  } else if (section.maximum_rating) {
    rules.push(`Rating U${section.maximum_rating + 1}`);
  }

  return rules.join(" - ");
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
  const [officials, setOfficials] = useState<PublicOfficial[]>([]);
  const [organisations, setOrganisations] = useState<PublicTournamentOrganisation[]>([]);
  const [showAllGallery, setShowAllGallery] = useState(false);
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
          "id, tournament_name, description, tournament_report, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url, payment_details, chess_results_url, arbiter_player_id"
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
        .select("id, section_name, minimum_birth_year, maximum_birth_year, minimum_rating, maximum_rating, entry_fee_override, maximum_players")
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
          "id, tournament_id, player_id, section_id, final_position, imported_name, imported_rating, federation, points, tie_break, award_title, notes"
        )
        .eq("tournament_id", tournamentId)
        .order("section_id", { ascending: true, nullsFirst: true })
        .order("final_position", { ascending: true, nullsFirst: false })
        .order("points", { ascending: false, nullsFirst: false });

      const resultRows = (resultData ?? []) as TournamentResult[];

      const { data: tournamentOrganisationData } = await supabase
        .from("tournament_organisations")
        .select(
          "id, tournament_id, organisation_id, role, representative_member_id, representative_name, notes, display_order"
        )
        .eq("tournament_id", tournamentId)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });

      const tournamentOrganisationRows =
        (tournamentOrganisationData ?? []) as unknown as TournamentOrganisationRow[];
      const organisationIds = Array.from(
        new Set(tournamentOrganisationRows.map((row) => row.organisation_id))
      );
      const representativeIds = Array.from(
        new Set(
          tournamentOrganisationRows
            .map((row) => row.representative_member_id)
            .filter(Boolean)
        )
      ) as string[];
      let loadedOrganisations: Organisation[] = [];
      let loadedCommitteeMembers: CommitteeMember[] = [];

      if (organisationIds.length > 0) {
        const { data: organisationData } = await supabase
          .from("organisations")
          .select("id, name, logo_url, website_url, representative_name")
          .in("id", organisationIds);

        loadedOrganisations = (organisationData ?? []) as unknown as Organisation[];
      }

      if (representativeIds.length > 0) {
        const { data: memberData } = await supabase
          .from("organisation_committee_members")
          .select("id, organisation_id, full_name, role_title")
          .in("id", representativeIds);

        loadedCommitteeMembers = (memberData ?? []) as unknown as CommitteeMember[];
      }

      const { data: roleProfileData } = await supabase
        .from("public_tournament_role_profiles")
        .select(
          "id, tournament_id, player_id, role, notes, role_group, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url"
        )
        .eq("tournament_id", tournamentId)
        .order("role_group", { ascending: true })
        .order("role", { ascending: true });

      const roleProfileRows =
        (roleProfileData ?? []) as unknown as TournamentRoleProfileRow[];

      let loadedOfficials: PublicOfficial[] = roleProfileRows.map((role) => ({
        id: role.id,
        tournament_id: role.tournament_id,
        player_id: role.player_id,
        role: role.role,
        notes: role.notes,
        roleGroup: role.role_group,
        player: role.full_name
          ? {
              id: role.player_id ?? role.id,
              full_name: role.full_name,
              chess_sa_id: role.chess_sa_id,
              fide_id: role.fide_id,
              rating: role.rating,
              club: role.club,
              province: role.province,
              profile_photo_url: role.profile_photo_url,
            }
          : null,
      }));

      if (loadedOfficials.length === 0) {
        const { data: officialData } = await supabase
          .from("tournament_officials")
          .select(
            "id, tournament_id, player_id, role, notes, players(id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url)"
          )
          .eq("tournament_id", tournamentId)
          .order("created_at", { ascending: true });

        const officialRows = (officialData ?? []) as unknown as TournamentOfficialRow[];
        loadedOfficials = officialRows.map((official) => ({
          id: official.id,
          tournament_id: official.tournament_id,
          player_id: official.player_id,
          role: official.role,
          notes: official.notes,
          roleGroup: "Official",
          player: Array.isArray(official.players)
            ? official.players[0] ?? null
            : official.players,
        }));
      }

      const playerIds = [
        ...new Set(
          [
            ...resultRows.map((row) => row.player_id),
            loadedTournament.arbiter_player_id,
            ...loadedOfficials.map((official) => official.player_id),
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
      setGallery((galleryData ?? []) as unknown as GalleryImage[]);
      setResults(resultRowsWithPlayers);
      setOrganisations(
        tournamentOrganisationRows.map((row) => ({
          ...row,
          organisation:
            loadedOrganisations.find((organisation) => organisation.id === row.organisation_id) ??
            null,
          representative:
            loadedCommitteeMembers.find(
              (member) => member.id === row.representative_member_id
            ) ?? null,
        }))
      );
      setArbiter(
        players.find((player) => player.id === loadedTournament.arbiter_player_id) ??
          null
      );
      setOfficials(
        loadedOfficials.map((official) => ({
          ...official,
          player:
            official.player ??
            players.find((player) => player.id === official.player_id) ??
            null,
        }))
      );
      setShowAllGallery(false);
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

  const visibleGallery = showAllGallery ? gallery : gallery.slice(0, 3);

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
               Back to Tournament Centre
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
                  {isCompleted ? "Completed Event" : "Registration Not Open"}
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

              {tournament.chess_results_url && (
                <a
                  href={tournament.chess_results_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Chess-Results
                </a>
              )}
            </div>

            {!isCompleted && (
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <NextStep label="1. Check details" text="Confirm date, venue, section and fee." />
                <NextStep label="2. Register" text="Use the tournament registration form when open." />
                <NextStep label="3. Follow updates" text="Results and completed event material appear here." />
              </div>
            )}
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

        <TournamentTeam officials={officials} fallbackArbiter={arbiter} />
        <TournamentOrganisations organisations={organisations} />

        {isCompleted && (
          <ArchiveContent
            tournament={tournament}
            isShere={isShere}
            sections={sections}
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
                        {sectionRuleLabel(section) || "Open section"}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
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
                  Completed Photos
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
                {visibleGallery.map((image) => (
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

            {gallery.length > 3 && (
              <div className="mt-6 flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowAllGallery((current) => !current)}
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  {showAllGallery ? "Show fewer photos" : "View all photos"}
                </button>
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

function TournamentTeam({
  officials,
  fallbackArbiter,
}: {
  officials: PublicOfficial[];
  fallbackArbiter: Player | null;
}) {
  const team = [...officials];
  const hasChiefArbiter = team.some(
    (official) => official.role.toLowerCase() === "chief arbiter"
  );

  if (fallbackArbiter && !hasChiefArbiter) {
    team.unshift({
      id: `legacy-chief-arbiter-${fallbackArbiter.id}`,
      tournament_id: "",
      player_id: fallbackArbiter.id,
      role: "Chief Arbiter",
      notes: null,
      player: fallbackArbiter,
    });
  }

  const rolePriority = (official: PublicOfficial) => {
    const role = official.role.toLowerCase();
    if (official.roleGroup === "Organiser" || role.includes("organiser")) return 0;
    if (role === "chief arbiter") return 1;
    if (role.includes("arbiter")) return 2;
    return 3;
  };
  const visibleTeam = team
    .filter((official) => official.player)
    .sort((a, b) => rolePriority(a) - rolePriority(b));

  if (visibleTeam.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Tournament Team
          </p>
          <h2 className="mt-2 text-2xl font-black md:text-3xl">
            Officials and organisers
          </h2>
        </div>

        <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
          {visibleTeam.length} official{visibleTeam.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {visibleTeam.map((official) => {
          const player = official.player as Player;
          const hasPublicProfile =
            Boolean(official.player_id) && player.id === official.player_id;
          const avatar = (
            <PlayerAvatar
              name={player.full_name}
              photoUrl={player.profile_photo_url}
              size="lg"
              className="border-red-500/30"
            />
          );
          const name = (
            <span className="mt-1 block truncate text-lg font-black text-white">
              {player.full_name}
            </span>
          );

          return (
            <div
              key={`${official.id}-${official.role}`}
              className="rounded-2xl border border-white/10 bg-zinc-950 p-4"
            >
              <div className="flex items-center gap-4">
                {hasPublicProfile ? (
                  <Link href={`/players/${player.id}`} className="shrink-0">
                    {avatar}
                  </Link>
                ) : (
                  <div className="shrink-0">{avatar}</div>
                )}

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
                    {official.role}
                  </p>
                  {hasPublicProfile ? (
                    <Link
                      href={`/players/${player.id}`}
                      className="mt-1 block truncate text-lg font-black text-white transition hover:text-red-300"
                    >
                      {player.full_name}
                    </Link>
                  ) : (
                    name
                  )}
                  <p className="mt-1 truncate text-xs text-gray-400">
                    {player.club ?? "Chess official"}
                    {player.province ? `  -  ${player.province}` : ""}
                  </p>
                </div>
              </div>

              {official.notes && (
                <p className="mt-3 text-xs leading-5 text-gray-500">
                  {official.notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TournamentOrganisations({
  organisations,
}: {
  organisations: PublicTournamentOrganisation[];
}) {
  if (organisations.length === 0) return null;

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Event Organisations
          </p>
          <h2 className="mt-2 text-2xl font-black md:text-3xl">
            Organisers and partners
          </h2>
        </div>

        <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
          {organisations.length} organisation
          {organisations.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {organisations.map((assignment) => {
          const organisation = assignment.organisation;
          const representative =
            assignment.representative_name ||
            assignment.representative?.full_name ||
            organisation?.representative_name;
          const content = (
            <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500/60">
              <div className="flex items-center gap-4">
                {organisation?.logo_url ? (
                  <img
                    src={organisation.logo_url}
                    alt={`${organisation.name} logo`}
                    className="h-16 w-16 shrink-0 rounded-xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-zinc-900 text-lg font-black text-red-200">
                    {(organisation?.name ?? "OR").slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
                    {assignment.role}
                  </p>
                  <p className="mt-1 truncate text-lg font-black text-white">
                    {organisation?.name ?? "Organisation"}
                  </p>
                  {representative && (
                    <p className="mt-1 truncate text-xs text-gray-400">
                      Representative: {representative}
                    </p>
                  )}
                </div>
              </div>

              {assignment.notes && (
                <p className="mt-3 text-xs leading-5 text-gray-500">
                  {assignment.notes}
                </p>
              )}
            </div>
          );

          return organisation?.website_url ? (
            <a
              key={assignment.id}
              href={organisation.website_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {content}
            </a>
          ) : (
            <div key={assignment.id}>{content}</div>
          );
        })}
      </div>
    </section>
  );
}

function PlayerMiniCard({
  result,
  label,
}: {
  result: ResultWithPlayer;
  label: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <div className="flex items-center gap-4">
        <PlayerAvatar
          name={publicResultName(result)}
          photoUrl={result.player?.profile_photo_url}
          size="lg"
          className="border-red-500/30"
        />

        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-red-400">
            {label}
          </p>
          {result.player ? (
            <Link
              href={`/players/${result.player.id}`}
              className="mt-1 block truncate text-lg font-black text-white transition hover:text-red-300"
            >
              {publicResultName(result)}
            </Link>
          ) : (
            <p className="mt-1 text-lg font-black text-gray-400">
              {publicResultName(result)}
            </p>
          )}
          <p className="mt-1 text-xs text-gray-400">
            Rtg {publicResultRating(result) ?? "-"}  -  FED{" "}
            {publicResultFederation(result)}  -  Pts {result.points ?? "-"}
          </p>
        </div>
      </div>
    </div>
  );
}

function NextStep({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <p className="text-xs font-black uppercase tracking-wide text-red-200">
        {label}
      </p>
      <p className="mt-2 text-xs leading-5 text-gray-400">{text}</p>
    </div>
  );
}

function ArchiveContent({
  tournament,
  isShere,
  sections,
  results,
}: {
  tournament: Tournament;
  isShere: boolean;
  sections: TournamentSection[];
  results: ResultWithPlayer[];
}) {
  const upsets = results.filter((result) =>
    `${result.award_title ?? ""} ${result.notes ?? ""}`
      .toLowerCase()
      .includes("upset")
  );
  const playerOfTournament =
    results.find((result) =>
      (result.award_title ?? "").toLowerCase().includes("player of the tournament")
    ) ??
    results.find((result) =>
      (result.award_title ?? "").toLowerCase().includes("featured player")
    ) ??
    results.find((result) => result.final_position === 1) ??
    null;

  return (
    <div className="mt-8 space-y-8">
      <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
          Tournament Report
        </p>

        <h2 className="mt-3 text-2xl font-black md:text-4xl">
          {tournament.tournament_name}
        </h2>

        {tournament.tournament_report ? (
          <div className="mt-6 space-y-5 text-sm leading-7 text-gray-300 md:text-base md:leading-8">
            {tournament.tournament_report.split("\n").map((paragraph, index) =>
              paragraph.trim() ? <p key={index}>{paragraph}</p> : null
            )}
          </div>
        ) : (
          <p className="mt-4 text-sm leading-7 text-gray-300 md:text-base md:leading-8">
            The tournament report will appear here once it has been confirmed.
          </p>
        )}

        {tournament.chess_results_url && (
          <a
            href={tournament.chess_results_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-flex rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
          >
            View on Chess-Results
          </a>
        )}
      </section>

      <FinalStandingsSection results={results} sections={sections} />

      <div className="grid gap-8 lg:grid-cols-2">
        <UpsetsSection upsets={upsets} isShere={isShere} />
        <PlayerOfTournamentSection result={playerOfTournament} />
      </div>

      <FinalRankingTable results={results} sections={sections} />
    </div>
  );
}

function FinalStandingsSection({
  results,
  sections,
}: {
  results: ResultWithPlayer[];
  sections: TournamentSection[];
}) {
  const sectionEntries = groupResultsBySection(results, sections).map((section) => ({
    ...section,
    podium: section.results
      .filter((result) => (result.final_position ?? 0) > 0)
      .slice(0, 3),
  }));

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
        Final Standings
      </p>
      <h2 className="mt-3 text-2xl font-black md:text-4xl">
        Confirmed standings by section
      </h2>

      {sectionEntries.length === 0 ? (
        <p className="mt-4 text-sm leading-7 text-gray-400">
          Final standings will appear here after results are imported.
        </p>
      ) : (
        <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {sectionEntries.map((section) => (
            <div
              key={section.sectionName}
              className="rounded-2xl border border-white/10 bg-zinc-950 p-5"
            >
              <h3 className="text-xl font-black text-white">
                {section.sectionName}
              </h3>

              <div className="mt-4 space-y-3">
                {section.podium.length > 0 ? (
                  section.podium.map((result, index) => {
                    const position = result.final_position ?? index + 1;

                    return (
                      <PlayerMiniCard
                        key={`${section.sectionName}-${result.id}`}
                        result={result}
                        label={`${medal(position)} Place`}
                      />
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-gray-500">
                    Standings will be confirmed.
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function UpsetsSection({
  upsets,
  isShere,
}: {
  upsets: ResultWithPlayer[];
  isShere: boolean;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
        Upsets
      </p>
      <h2 className="mt-3 text-2xl font-black">Key results</h2>

      {upsets.length > 0 ? (
        <div className="mt-5 space-y-3">
          {upsets.map((result) => (
            <div
              key={result.id}
              className="rounded-2xl border border-white/10 bg-zinc-950 p-4"
            >
              <p className="font-bold text-white">
                {result.player?.full_name ?? result.award_title ?? "Upset"}
              </p>
              <p className="mt-2 text-sm leading-6 text-gray-400">
                {result.notes ?? result.award_title}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-gray-400">
          {isShere
            ? "Upset highlights can be added to the official report for this event."
            : "Upset highlights will appear here once they have been confirmed."}
        </p>
      )}
    </section>
  );
}

function PlayerOfTournamentSection({
  result,
}: {
  result: ResultWithPlayer | null;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
        Player of the Tournament
      </p>
      <h2 className="mt-3 text-2xl font-black">Featured performance</h2>

      {result ? (
        <div className="mt-5">
          <PlayerMiniCard result={result} label={result.award_title ?? "Featured"} />
          {result.notes && (
            <p className="mt-4 text-sm leading-7 text-gray-400">
              {result.notes}
            </p>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm leading-7 text-gray-400">
          Player of the tournament will appear here once selected.
        </p>
      )}
    </section>
  );
}

function sortResults(sectionResults: ResultWithPlayer[]) {
  return [...sectionResults].sort((a, b) => {
      const aPosition = a.final_position ?? 999999;
      const bPosition = b.final_position ?? 999999;

      if (aPosition !== bPosition) return aPosition - bPosition;
      return (b.points ?? 0) - (a.points ?? 0);
    });
}

function groupResultsBySection(
  results: ResultWithPlayer[],
  sections: TournamentSection[]
) {
  if (sections.length > 0) {
    return sections.map((section) => ({
      sectionId: section.id,
      sectionName: section.section_name,
      results: sortResults(
        results.filter((result) => result.section_id === section.id)
      ),
    }));
  }

  return [
    {
      sectionId: "overall",
      sectionName: "Overall",
      results: sortResults(results.filter((result) => !result.section_id)),
    },
  ];
}

function FinalRankingTable({
  results,
  sections,
}: {
  results: ResultWithPlayer[];
  sections: TournamentSection[];
}) {
  const sectionEntries = groupResultsBySection(results, sections);

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
            Full standings by section
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Public rankings show only Rk, Name, Rtg, FED and Pts from the
            imported final ranking file.
          </p>
        </div>

        <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
          {sectionEntries.length} section
          {sectionEntries.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {sectionEntries.map((section) => (
          <div
            key={section.sectionName}
            className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
          >
            <div className="border-b border-white/10 bg-black/40 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">
                Section
              </p>
              <h3 className="mt-2 text-lg font-black text-white">
                {section.sectionName}
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[360px] text-left text-xs">
                <thead className="bg-black/25 text-[10px] uppercase tracking-[0.14em] text-gray-500">
                  <tr>
                    <th className="px-3 py-3">Rk</th>
                    <th className="px-3 py-3">Name</th>
                    <th className="px-3 py-3">Rtg</th>
                    <th className="px-3 py-3">FED</th>
                    <th className="px-3 py-3">Pts</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/10">
                  {section.results.map((result, index) => {
                    const position = result.final_position ?? index + 1;

                    return (
                      <tr key={result.id}>
                        <td className="px-3 py-3 font-black text-red-300">
                          {position}
                        </td>
                        <td className="px-3 py-3 font-bold text-white">
                          {result.player ? (
                            <Link
                              href={`/players/${result.player.id}`}
                              className="flex min-w-0 items-center gap-2 transition hover:text-red-300"
                            >
                              <PlayerAvatar
                                name={publicResultName(result)}
                                photoUrl={result.player.profile_photo_url}
                                size="xs"
                              />
                              <span className="line-clamp-2">
                                {publicResultName(result)}
                              </span>
                            </Link>
                          ) : (
                            <span className="line-clamp-2 pl-10">
                              {publicResultName(result)}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-3 text-gray-300">
                          {publicResultRating(result) ?? "-"}
                        </td>
                        <td className="px-3 py-3 text-gray-300">
                          {publicResultFederation(result)}
                        </td>
                        <td className="px-3 py-3 text-gray-300">
                          {result.points ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
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
          <h2 className="text-2xl font-black">Tournament Honours</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
              <h3 className="font-bold text-red-300">Open Section</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <p>
                  1st <strong className="text-white">Champion:</strong> Mphahlele
                  Phetolo
                </p>
                <p>
                  2nd <strong className="text-white">Runner-up:</strong> Leshaba
                  Surprise
                </p>
                <p>
                  3rd <strong className="text-white">Third Place:</strong> Daniel
                  Tshehla
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-zinc-950 p-5">
              <h3 className="font-bold text-red-300">Junior Section</h3>
              <div className="mt-4 space-y-3 text-sm text-gray-300">
                <p>
                  1st <strong className="text-white">Champion:</strong> Lesedi
                  Motsifane
                </p>
                <p>
                  2nd <strong className="text-white">Runner-up:</strong> Matabane
                  Mahlogonolo
                </p>
                <p>
                  3rd <strong className="text-white">Third Place:</strong> Bapela
                  Ofentse
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 md:p-8">
          <h2 className="text-2xl font-black text-yellow-100">
            Featured Player of the Tournament
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
          Upset of the Tournament
        </h2>
        <p className="mt-4 text-sm leading-7 text-red-50/90 md:text-base md:leading-8">
          Elias Mabotja defeated Daniel Tshehla  -  the only player to defeat
          eventual champion Mphahlele Phetolo.
        </p>
      </section>
    </div>
  );
}




