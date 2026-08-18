"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import PlayerAvatar from "@/components/PlayerAvatar";
import { formatCalendarDate } from "@/lib/dateHelpers";
import { publicSupabase as supabase } from "@/lib/publicSupabase";

type Tournament = {
  id: string;
  tournament_name: string;
  description: string | null;
  tournament_report: string | null;
  postponement_reason: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: string;
  entry_fee: number;
  poster_image_url: string | null;
  payment_details: string | null;
  chess_results_url: string | null;
  external_gallery_url?: string | null;
  external_gallery_label?: string | null;
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
  chess_results_url: string | null;
  display_order: number | null;
};

type SectionCombination = {
  id: string;
  tournament_id: string;
  combined_section_id: string;
  source_section_id: string;
  notes: string | null;
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
  title: string | null;
};

type TournamentResult = {
  id: string;
  tournament_id: string;
  player_id: string | null;
  section_id: string | null;
  final_position: number | null;
  starting_number: number | null;
  imported_name: string | null;
  imported_rating: number | null;
  federation: string | null;
  points: number | null;
  tie_break: string | null;
  award_title: string | null;
  notes: string | null;
};

type TournamentTeamResult = {
  id: string;
  tournament_id: string;
  section_id: string | null;
  final_position: number | null;
  team_name: string;
  federation: string | null;
  match_points: number | null;
  board_points: number | null;
  tie_break: string | null;
  notes: string | null;
};

type LiveStandingUpdate = {
  id: string;
  tournament_id: string;
  section_id: string | null;
  round_number: number;
  board_number: number | null;
  previous_board_number: number | null;
  player_name: string;
  opponent_name: string | null;
  result: string | null;
  points: number | null;
  notes: string | null;
  display_order: number | null;
  is_published: boolean;
  created_at: string;
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
  title: string | null;
};

type PublicRegistrationRow = {
  registration_id: string;
  tournament_id: string;
  section_id: string | null;
  section_name: string | null;
  section_display_order: number | null;
  player_id: string | null;
  full_name: string | null;
  chess_sa_id: string | null;
  pcc_id: string | null;
  profile_photo_url: string | null;
  registration_status: string | null;
  payment_status: string | null;
  created_at: string | null;
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

type PublicTeamCard = {
  key: string;
  player: Player;
  playerId: string | null;
  roles: string[];
  notes: string[];
  priority: number;
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
  return formatCalendarDate(date, {
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
  if (status === "Postponed")
    return "border-orange-500/40 bg-orange-500/10 text-orange-300";
  return "border-zinc-500/40 bg-zinc-500/10 text-zinc-300";
}

function statusLabel(status: string) {
  if (status === "Open") return "Registration Open";
  if (status === "Completed") return "Completed Tournament";
  if (status === "Live") return "Live Tournament";
  if (status === "Postponed") return "Tournament Postponed";
  return "Registration Not Open";
}

function postponementNotice(reason: string | null | undefined) {
  const cleanReason = reason?.trim();

  return cleanReason
    ? `This tournament has been postponed by the organisers because of ${cleanReason}. A new date will be announced as soon as it is confirmed. The tournament is not cancelled, so it will remain paused until the organisers confirm the new date and only then will registrations open again.`
    : "This tournament has been postponed by the organisers. A new date will be announced as soon as it is confirmed. The tournament is not cancelled, so it will remain paused until the organisers confirm the new date and only then will registrations open again.";
}

function PostponedPosterStamp() {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-black/25">
      <div className="-rotate-12 border-4 border-red-600 bg-white/90 px-10 py-4 text-4xl font-black uppercase text-red-700 shadow-2xl shadow-black/60 md:text-5xl">
        Postponed
      </div>
    </div>
  );
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

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function standingMovement(update: LiveStandingUpdate) {
  if (!update.previous_board_number || !update.board_number) {
    return { label: "Tracking", tone: "neutral" as const, symbol: "->" };
  }

  const movement = update.previous_board_number - update.board_number;

  if (movement > 0) {
    return {
      label: `Up ${movement}`,
      tone: "up" as const,
      symbol: "↑",
    };
  }

  if (movement < 0) {
    return {
      label: `Down ${Math.abs(movement)}`,
      tone: "down" as const,
      symbol: "↓",
    };
  }

  return { label: "Held", tone: "neutral" as const, symbol: "→" };
}

function standingMovementClass(tone: "up" | "down" | "neutral") {
  if (tone === "up") {
    return "border-green-400/40 bg-green-500/15 text-green-200";
  }

  if (tone === "down") {
    return "border-red-400/40 bg-red-500/15 text-red-200";
  }

  return "border-white/10 bg-white/10 text-gray-200";
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

function officialRolePriority(role: string, roleGroup?: string) {
  const cleanRole = role.toLowerCase();

  if (roleGroup === "Organiser" || cleanRole.includes("organiser")) return 0;
  if (cleanRole === "chief arbiter") return 1;
  if (cleanRole === "deputy chief arbiter") return 2;
  if (cleanRole.includes("arbiter")) return 3;
  return 4;
}

function publicArbiterTitle(title: string | null) {
  if (!title) return null;

  if (title.toLowerCase().includes("national arbiter")) {
    return {
      label: "National Arbiter (NA)",
      helper: "FIDE recognised",
    };
  }

  return { label: title, helper: null };
}

function buildPublicTeamCards(
  officials: PublicOfficial[],
  fallbackArbiter: Player | null
) {
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

  const visibleOfficials = team
    .filter((official): official is PublicOfficial & { player: Player } =>
      Boolean(official.player)
    )
    .sort(
      (first, second) =>
        officialRolePriority(first.role, first.roleGroup) -
        officialRolePriority(second.role, second.roleGroup)
    );

  if (visibleOfficials.length <= 3) {
    return visibleOfficials.map((official) => ({
      key: `${official.id}-${official.role}`,
      player: official.player,
      playerId: official.player_id,
      roles: [official.role],
      notes: official.notes ? [official.notes] : [],
      priority: officialRolePriority(official.role, official.roleGroup),
    }));
  }

  const groupedCards = new Map<string, PublicTeamCard>();

  visibleOfficials.forEach((official) => {
    const player = official.player;
    const key =
      official.player_id ||
      player.id ||
      `name:${player.full_name.toLowerCase().trim()}`;
    const priority = officialRolePriority(official.role, official.roleGroup);
    const existing = groupedCards.get(key);

    if (!existing) {
      groupedCards.set(key, {
        key,
        player,
        playerId: official.player_id,
        roles: [official.role],
        notes: official.notes ? [official.notes] : [],
        priority,
      });
      return;
    }

    if (!existing.roles.includes(official.role)) {
      existing.roles.push(official.role);
    }

    if (official.notes && !existing.notes.includes(official.notes)) {
      existing.notes.push(official.notes);
    }

    existing.priority = Math.min(existing.priority, priority);
  });

  return Array.from(groupedCards.values()).sort(
    (first, second) => first.priority - second.priority
  );
}

export default function TournamentHubPage() {
  const params = useParams();
  const tournamentId = String(params.id);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [sections, setSections] = useState<TournamentSection[]>([]);
  const [sectionCombinations, setSectionCombinations] = useState<SectionCombination[]>([]);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [results, setResults] = useState<ResultWithPlayer[]>([]);
  const [teamResults, setTeamResults] = useState<TournamentTeamResult[]>([]);
  const [standingUpdates, setStandingUpdates] = useState<LiveStandingUpdate[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<PublicRegistrationRow[]>([]);
  const [arbiter, setArbiter] = useState<Player | null>(null);
  const [officials, setOfficials] = useState<PublicOfficial[]>([]);
  const [organisations, setOrganisations] = useState<PublicTournamentOrganisation[]>([]);
  const [selectedGalleryImage, setSelectedGalleryImage] =
    useState<GalleryImage | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const isOpen = tournament?.registration_status === "Open";
  const isCompleted = tournament?.registration_status === "Completed";
  const isLive = tournament?.registration_status === "Live";
  const isPostponed = tournament?.registration_status === "Postponed";

  const isShere = useMemo(() => {
    return tournament?.tournament_name.toLowerCase().includes("shere") ?? false;
  }, [tournament]);

  useEffect(() => {
    async function loadTournamentHub() {
      setLoading(true);
      setMessage("");

      let { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, description, tournament_report, postponement_reason, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url, payment_details, chess_results_url, external_gallery_url, external_gallery_label, arbiter_player_id"
        )
        .eq("id", tournamentId)
        .single();

      if (
        tournamentError?.message.toLowerCase().includes("postponement_reason") ||
        tournamentError?.message.toLowerCase().includes("external_gallery")
      ) {
        const fallback = await supabase
          .from("tournaments")
          .select(
            "id, tournament_name, description, tournament_report, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url, payment_details, chess_results_url, arbiter_player_id"
          )
          .eq("id", tournamentId)
          .single();

        tournamentData = fallback.data
          ? {
              ...fallback.data,
              postponement_reason: null,
              external_gallery_url: null,
              external_gallery_label: null,
            }
          : null;
        tournamentError = fallback.error;
      }

      if (tournamentError || !tournamentData) {
        setMessage("Tournament could not be found.");
        setLoading(false);
        return;
      }

      const loadedTournament = tournamentData as Tournament;

      const { data: sectionData } = await supabase
        .from("tournament_sections")
        .select("id, section_name, minimum_birth_year, maximum_birth_year, minimum_rating, maximum_rating, entry_fee_override, maximum_players, chess_results_url, display_order")
        .eq("tournament_id", tournamentId)
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("section_name", { ascending: true });

      const loadedSections = (sectionData ?? []) as TournamentSection[];

      let loadedSectionCombinations: SectionCombination[] = [];
      const { data: sectionCombinationData, error: sectionCombinationError } =
        await supabase
          .from("tournament_section_combinations")
          .select("id, tournament_id, combined_section_id, source_section_id, notes")
          .eq("tournament_id", tournamentId);

      if (!sectionCombinationError) {
        loadedSectionCombinations =
          (sectionCombinationData ?? []) as SectionCombination[];
      }

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
          "id, tournament_id, player_id, section_id, final_position, starting_number, imported_name, imported_rating, federation, points, tie_break, award_title, notes"
        )
        .eq("tournament_id", tournamentId)
        .order("section_id", { ascending: true, nullsFirst: true })
        .order("final_position", { ascending: true, nullsFirst: false })
        .order("points", { ascending: false, nullsFirst: false });

      const resultRows = (resultData ?? []) as TournamentResult[];

      let teamResultRows: TournamentTeamResult[] = [];
      const { data: teamResultData, error: teamResultError } = await supabase
        .from("tournament_team_results")
        .select(
          "id, tournament_id, section_id, final_position, team_name, federation, match_points, board_points, tie_break, notes"
        )
        .eq("tournament_id", tournamentId)
        .order("section_id", { ascending: true, nullsFirst: true })
        .order("final_position", { ascending: true, nullsFirst: false })
        .order("match_points", { ascending: false, nullsFirst: false });

      if (!teamResultError) {
        teamResultRows = (teamResultData ?? []) as TournamentTeamResult[];
      }

      let liveStandingRows: LiveStandingUpdate[] = [];
      const { data: liveStandingData, error: liveStandingError } = await supabase
        .from("tournament_live_updates")
        .select(
          "id, tournament_id, section_id, round_number, board_number, previous_board_number, player_name, opponent_name, result, points, notes, display_order, is_published, created_at"
        )
        .eq("tournament_id", tournamentId)
        .eq("is_published", true)
        .order("round_number", { ascending: false })
        .order("display_order", { ascending: true, nullsFirst: false })
        .order("board_number", { ascending: true, nullsFirst: false });

      if (!liveStandingError) {
        liveStandingRows = (liveStandingData ?? []) as unknown as LiveStandingUpdate[];
      }

      const { data: registrationListData } = await supabase
        .from("public_tournament_registration_list")
        .select(
          "registration_id, tournament_id, section_id, section_name, section_display_order, player_id, full_name, chess_sa_id, pcc_id, profile_photo_url, registration_status, payment_status, created_at"
        )
        .eq("tournament_id", tournamentId)
        .order("section_display_order", { ascending: true, nullsFirst: false })
        .order("section_name", { ascending: true, nullsFirst: false })
        .order("full_name", { ascending: true, nullsFirst: false });

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
          "id, tournament_id, player_id, role, notes, role_group, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url, title"
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
              title: role.title,
            }
          : null,
      }));

      if (loadedOfficials.length === 0) {
        const { data: officialData } = await supabase
          .from("tournament_officials")
          .select(
            "id, tournament_id, player_id, role, notes, players(id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url, title)"
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
            "id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url, title"
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
      setSectionCombinations(loadedSectionCombinations);
      setStats((statsData ?? null) as TournamentStats | null);
      setGallery((galleryData ?? []) as unknown as GalleryImage[]);
      setResults(resultRowsWithPlayers);
      setTeamResults(teamResultRows);
      setStandingUpdates(liveStandingRows);
      setRegisteredPlayers(
        (registrationListData ?? []) as unknown as PublicRegistrationRow[]
      );
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
          player: (() => {
            const playerFromList =
              players.find((player) => player.id === official.player_id) ?? null;

            if (!official.player) return playerFromList;
            if (!playerFromList) return official.player;

            return {
              ...official.player,
              ...playerFromList,
              profile_photo_url:
                official.player.profile_photo_url ?? playerFromList.profile_photo_url,
              title: official.player.title ?? playerFromList.title,
            };
          })(),
        }))
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
            href="/tournaments"
            className="mt-5 inline-block rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white"
          >
            Back to Tournament Centre
          </Link>
        </div>
      </main>
    );
  }

  const visibleGallery = gallery.slice(0, 4);
  const registeredCount =
    stats?.total_registrations && stats.total_registrations > 0
      ? stats.total_registrations
      : registeredPlayers.length;
  const hasPublicStandings =
    standingUpdates.length > 0 || (isCompleted && results.length > 0);

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
                  className="object-contain"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">
                  Poster coming soon
                </div>
              )}
              {tournament.registration_status === "Postponed" && (
                <PostponedPosterStamp />
              )}
            </div>
          </div>

          <div className="flex flex-col justify-center">
            <Link
              href="/tournaments"
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
                  href={`/register?tournament=${tournament.id}`}
                  className="rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Register Now
                </Link>
              ) : (
                <span className="rounded-xl bg-zinc-800 px-6 py-3 text-sm font-semibold text-gray-400">
                  {isCompleted
                    ? "Completed Event"
                    : isPostponed
                      ? "Tournament Postponed"
                      : "Registration Not Open"}
                </span>
              )}

              {hasPublicStandings && (
                <a
                  href="#standings"
                  className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  View Standings
                </a>
              )}

              {isLive && (
                <Link
                  href={`/tournaments/${tournament.id}/live`}
                  className="rounded-xl bg-green-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-green-700"
                >
                  Standings Screen
                </Link>
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
                <NextStep label="2. Register" text="Use the registration form when entries are open." />
                <NextStep label="3. Follow updates" text="Results and completed event material appear here." />
              </div>
            )}

            {isPostponed && (
              <div className="mt-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm leading-6 text-orange-100">
                {postponementNotice(tournament.postponement_reason)}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <TournamentCredits
          organisations={organisations}
          officials={officials}
          fallbackArbiter={arbiter}
        />

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Registered players</p>
            <p className="mt-2 text-3xl font-bold">
              {registeredCount}
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <p className="text-sm text-gray-400">Played</p>
            <p className="mt-2 text-3xl font-bold text-green-300">
              {results.length}
            </p>
            <p className="mt-1 text-xs text-gray-500">From final ranking</p>
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

        {!isCompleted && <RegisteredPlayersPanel players={registeredPlayers} />}

        {!isCompleted && standingUpdates.length > 0 && (
          <TournamentStandingsPanel
            tournamentId={tournament.id}
            standingUpdates={standingUpdates}
            results={results}
            sections={sections}
            sectionCombinations={sectionCombinations}
            chessResultsUrl={tournament.chess_results_url}
            isCompleted={false}
          />
        )}

        {isCompleted && (
          <ArchiveContent
            tournament={tournament}
            isShere={isShere}
            sections={sections}
            sectionCombinations={sectionCombinations}
            results={results}
            teamResults={teamResults}
            standingUpdates={standingUpdates}
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
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
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
                {Math.min(gallery.length, 4)} featured photo
                {Math.min(gallery.length, 4) === 1 ? "" : "s"}
              </span>
            </div>

            {tournament.external_gallery_url && (
              <div className="mt-6 rounded-2xl border border-red-500/25 bg-red-500/10 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-200">
                      Full Photo Album
                    </p>
                    <p className="mt-2 text-sm leading-6 text-red-50/85">
                      Open the organiser's external gallery for the full
                      tournament photo collection.
                    </p>
                  </div>

                  <a
                    href={tournament.external_gallery_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-xl bg-red-600 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-red-700"
                  >
                    {tournament.external_gallery_label?.trim() ||
                      "View more photos"}
                  </a>
                </div>
              </div>
            )}

            {gallery.length === 0 ? (
              <p className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                {tournament.external_gallery_url
                  ? "Featured photos will appear here when added."
                  : "Gallery coming soon."}
              </p>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {visibleGallery.map((image, index) => (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => setSelectedGalleryImage(image)}
                    className={`group overflow-hidden rounded-xl border border-white/10 bg-zinc-950 text-left transition hover:border-red-500 ${
                      index === 3 ? "hidden lg:block" : ""
                    }`}
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

function TournamentTeam({
  officials,
  fallbackArbiter,
}: {
  officials: PublicOfficial[];
  fallbackArbiter: Player | null;
}) {
  const teamCards = buildPublicTeamCards(officials, fallbackArbiter);

  if (teamCards.length === 0) return null;

  const roleCount = teamCards.reduce((total, card) => total + card.roles.length, 0);

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
          {roleCount} role{roleCount === 1 ? "" : "s"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {teamCards.map((card) => (
          <PublicOfficialCard key={card.key} card={card} />
        ))}
      </div>
    </section>
  );
}

function publicRegistrationName(player: PublicRegistrationRow) {
  return player.full_name?.trim() || "Player name pending";
}

function statusBadgeClass(value: string | null | undefined) {
  const status = (value ?? "").toLowerCase();

  if (status.includes("paid") || status.includes("approved")) {
    return "border-green-500/30 bg-green-500/10 text-green-200";
  }

  if (status.includes("reject") || status.includes("withdraw")) {
    return "border-red-500/30 bg-red-500/10 text-red-200";
  }

  return "border-amber-500/30 bg-amber-500/10 text-amber-100";
}

function RegisteredPlayersPanel({ players }: { players: PublicRegistrationRow[] }) {
  const [search, setSearch] = useState("");
  const cleanSearch = search.trim().toLowerCase();

  const filteredPlayers = useMemo(() => {
    if (!cleanSearch) return players;

    return players.filter((player) =>
      [
        publicRegistrationName(player),
        player.section_name,
        player.chess_sa_id,
        player.pcc_id,
        player.registration_status,
        player.payment_status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(cleanSearch)
    );
  }, [cleanSearch, players]);

  const groupedPlayers = useMemo(() => {
    const groups = new Map<string, PublicRegistrationRow[]>();

    filteredPlayers.forEach((player) => {
      const sectionName = player.section_name ?? "Section pending";
      const current = groups.get(sectionName) ?? [];
      current.push(player);
      groups.set(sectionName, current);
    });

    return Array.from(groups.entries());
  }, [filteredPlayers]);

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
      <div className="grid gap-4 md:grid-cols-[1fr_320px] md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Entry Check
          </p>
          <h2 className="mt-2 text-2xl font-black md:text-3xl">
            Registered players
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Search the public entry list to confirm whether a player appears for
            this tournament. Private contact details are not shown.
          </p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search player, section or ID"
          className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
        />
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
          {players.length} total
        </span>
        {search.trim() && (
          <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
            {filteredPlayers.length} matching
          </span>
        )}
      </div>

      {players.length === 0 ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm leading-6 text-gray-400">
          Registered players will appear here once entries are visible.
        </p>
      ) : filteredPlayers.length === 0 ? (
        <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm leading-6 text-gray-400">
          No registered player matches that search.
        </p>
      ) : (
        <div className="mt-5 max-h-[560px] space-y-5 overflow-y-auto pr-1">
          {groupedPlayers.map(([sectionName, sectionPlayers]) => (
            <div
              key={sectionName}
              className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-black/30 px-4 py-3">
                <h3 className="font-black text-white">{sectionName}</h3>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-gray-300">
                  {sectionPlayers.length} player
                  {sectionPlayers.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="divide-y divide-white/10">
                {sectionPlayers.map((player) => (
                  <div
                    key={player.registration_id}
                    className="grid gap-3 px-4 py-3 sm:grid-cols-[1fr_auto] sm:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <PlayerAvatar
                        name={publicRegistrationName(player)}
                        photoUrl={player.profile_photo_url}
                        size="sm"
                        className="border-red-500/25"
                      />

                      <div className="min-w-0">
                        {player.player_id ? (
                          <Link
                            href={`/players/${player.player_id}`}
                            className="block truncate font-bold text-white transition hover:text-red-300"
                          >
                            {publicRegistrationName(player)}
                          </Link>
                        ) : (
                          <p className="truncate font-bold text-white">
                            {publicRegistrationName(player)}
                          </p>
                        )}

                        <p className="mt-1 text-xs text-gray-500">
                          PCC ID {player.pcc_id ?? "-"}  -  Chess SA{" "}
                          {player.chess_sa_id ?? "-"}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusBadgeClass(
                          player.registration_status
                        )}`}
                      >
                        {player.registration_status ?? "Pending"}
                      </span>
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-bold ${statusBadgeClass(
                          player.payment_status
                        )}`}
                      >
                        {player.payment_status ?? "Payment pending"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TournamentCredits({
  organisations,
  officials,
  fallbackArbiter,
}: {
  organisations: PublicTournamentOrganisation[];
  officials: PublicOfficial[];
  fallbackArbiter: Player | null;
}) {
  const teamCards = buildPublicTeamCards(officials, fallbackArbiter);

  if (organisations.length === 0 && teamCards.length === 0) return null;

  return (
    <section className="mb-6 rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Tournament Team
          </p>
          <h2 className="mt-2 text-2xl font-black md:text-3xl">
            Organising team
          </h2>
        </div>
        <p className="text-sm text-gray-400">
          Organisation, organiser and arbiters
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {organisations.map((assignment) => {
          const organisation = assignment.organisation;
          const representative =
            assignment.representative_name ||
            assignment.representative?.full_name ||
            organisation?.representative_name;

          const card = (
            <div className="flex h-full min-w-0 items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4 transition hover:border-red-500/60">
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
                  {assignment.role || "Organising organisation"}
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
          );

          return organisation?.website_url ? (
            <a
              key={assignment.id}
              href={organisation.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {card}
            </a>
          ) : (
            <div key={assignment.id} className="min-w-0">
              {card}
            </div>
          );
        })}

        {teamCards.map((card) => (
          <PublicOfficialCard key={card.key} card={card} className="h-full" />
        ))}
      </div>
    </section>
  );
}

function PublicOfficialCard({
  card,
  className = "",
}: {
  card: PublicTeamCard;
  className?: string;
}) {
  const player = card.player;
  const hasPublicProfile = Boolean(card.playerId) && player.id === card.playerId;
  const title = publicArbiterTitle(player.title);
  const avatar = (
    <PlayerAvatar
      name={player.full_name}
      photoUrl={player.profile_photo_url}
      size="lg"
      className="border-red-500/30"
    />
  );

  return (
    <div
      className={`flex min-w-0 items-center gap-4 rounded-2xl border border-white/10 bg-zinc-950 p-4 ${className}`}
    >
      {hasPublicProfile ? (
        <Link href={`/players/${player.id}`} className="shrink-0">
          {avatar}
        </Link>
      ) : (
        <div className="shrink-0">{avatar}</div>
      )}

      <div className="min-w-0">
        <div className="flex flex-wrap gap-1.5">
          {card.roles.map((role) => (
            <span
              key={role}
              className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-red-100"
            >
              {role}
            </span>
          ))}
        </div>

        {hasPublicProfile ? (
          <Link
            href={`/players/${player.id}`}
            className="mt-2 block truncate text-lg font-black text-white transition hover:text-red-300"
          >
            {player.full_name}
          </Link>
        ) : (
          <span className="mt-2 block truncate text-lg font-black text-white">
            {player.full_name}
          </span>
        )}

        {title && (
          <div className="mt-1">
            <p className="w-fit rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] font-bold text-red-100">
              {title.label}
            </p>
            {title.helper && (
              <p className="mt-1 text-[11px] font-medium text-gray-500">
                {title.helper}
              </p>
            )}
          </div>
        )}

        <p className="mt-1 truncate text-xs text-gray-400">
          {player.club ?? "Chess official"}
          {player.province ? ` - ${player.province}` : ""}
        </p>

        {card.notes.length > 0 && (
          <p className="mt-3 line-clamp-2 text-xs leading-5 text-gray-500">
            {card.notes.join(" / ")}
          </p>
        )}
      </div>
    </div>
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
  sectionCombinations,
  results,
  teamResults,
  standingUpdates,
}: {
  tournament: Tournament;
  isShere: boolean;
  sections: TournamentSection[];
  sectionCombinations: SectionCombination[];
  results: ResultWithPlayer[];
  teamResults: TournamentTeamResult[];
  standingUpdates: LiveStandingUpdate[];
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
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <UpsetsSection upsets={upsets} isShere={isShere} />
        <PlayerOfTournamentSection result={playerOfTournament} />
      </div>

      <TournamentStandingsPanel
        tournamentId={tournament.id}
        standingUpdates={standingUpdates}
        results={results}
        sections={sections}
        sectionCombinations={sectionCombinations}
        chessResultsUrl={tournament.chess_results_url}
        isCompleted
      />

      <TeamRankingTable
        teamResults={teamResults}
        sections={sections}
        sectionCombinations={sectionCombinations}
        chessResultsUrl={tournament.chess_results_url}
      />
    </div>
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

function latestStandingsBySection(
  standingUpdates: LiveStandingUpdate[],
  sections: TournamentSection[]
) {
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const sectionGroups = new Map<
    string,
    { sectionName: string; roundNumber: number; updates: LiveStandingUpdate[] }
  >();

  standingUpdates.forEach((update) => {
    const sectionKey = update.section_id ?? "overall";
    const section = update.section_id ? sectionsById.get(update.section_id) : null;
    const existing = sectionGroups.get(sectionKey);

    if (!existing || update.round_number > existing.roundNumber) {
      sectionGroups.set(sectionKey, {
        sectionName: section?.section_name ?? "Overall",
        roundNumber: update.round_number,
        updates: [update],
      });
      return;
    }

    if (update.round_number === existing.roundNumber) {
      existing.updates.push(update);
    }
  });

  const standingSections = Array.from(sectionGroups.entries())
    .map(([sectionId, sectionGroup]) => ({
      sectionId,
      sectionName: sectionGroup.sectionName,
      roundNumber: sectionGroup.roundNumber,
      updates: [...sectionGroup.updates].sort((first, second) => {
        const firstBoard = first.board_number ?? 999999;
        const secondBoard = second.board_number ?? 999999;

        if (firstBoard !== secondBoard) return firstBoard - secondBoard;
        return (first.display_order ?? 999999) - (second.display_order ?? 999999);
      }),
    }))
    .sort((first, second) => {
      const firstSection = sections.find((section) => section.id === first.sectionId);
      const secondSection = sections.find((section) => section.id === second.sectionId);

      return (
        (firstSection?.display_order ?? 999999) -
          (secondSection?.display_order ?? 999999) ||
        first.sectionName.localeCompare(second.sectionName)
      );
    });

  const latestRound = standingSections.reduce(
    (highest, section) => Math.max(highest, section.roundNumber),
    0
  );

  return {
    roundNumber: latestRound || null,
    sections: standingSections,
  };
}

function TournamentStandingsPanel({
  tournamentId,
  standingUpdates,
  results,
  sections,
  sectionCombinations,
  chessResultsUrl,
  isCompleted,
}: {
  tournamentId: string;
  standingUpdates: LiveStandingUpdate[];
  results: ResultWithPlayer[];
  sections: TournamentSection[];
  sectionCombinations: SectionCombination[];
  chessResultsUrl: string | null;
  isCompleted: boolean;
}) {
  const currentStanding = latestStandingsBySection(standingUpdates, sections);
  const latestRound = currentStanding.roundNumber;
  const latestRoundIsFinal =
    isCompleted &&
    currentStanding.sections.some((section) =>
      section.updates.some((update) =>
        (update.result ?? "").toLowerCase().includes("final")
      )
    );

  if (currentStanding.sections.length === 0) {
    return isCompleted ? (
      <FinalRankingTable
        results={results}
        sections={sections}
        sectionCombinations={sectionCombinations}
        chessResultsUrl={chessResultsUrl}
      />
    ) : null;
  }

  return (
    <section
      id="standings"
      className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            {latestRoundIsFinal ? "Final Ranking" : "Tournament Standings"}
          </p>
          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            {latestRoundIsFinal ? "Official final standings" : "Latest movement"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            {latestRoundIsFinal
              ? "The final ranking replaces the live standings and keeps the original start position where available."
              : "The latest imported standings are shown here. Each new standing replaces the previous public snapshot."}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {latestRound && (
            <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
              {latestRoundIsFinal ? "Final standing" : `Latest round ${latestRound}`}
            </span>
          )}
          <Link
            href={`/tournaments/${tournamentId}/live`}
            className="rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
          >
            Full standings screen
          </Link>
        </div>
      </div>

      <div className="mt-8 space-y-6">
        {[currentStanding].map((round) => (
          <div
            key={round.roundNumber ?? "current-standing"}
            className="overflow-hidden rounded-2xl border border-red-500/20 bg-zinc-950"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-red-500/20 bg-black/45 p-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300">
                  Standing
                </p>
                <h3 className="mt-2 text-xl font-black text-white">
                  {latestRoundIsFinal
                    ? "Final standings"
                    : "Latest standings"}
                </h3>
              </div>

              <span className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-gray-400">
                {round.sections.reduce(
                  (total, section) => total + section.updates.length,
                  0
                )}{" "}
                player
                {round.sections.reduce(
                  (total, section) => total + section.updates.length,
                  0
                ) === 1
                  ? ""
                  : "s"}
              </span>
            </div>

            <div className="grid gap-4 p-4 lg:grid-cols-3">
              {round.sections.map((section) => {
                const visibleUpdates = section.updates.slice(0, 10);
                const hiddenCount = Math.max(
                  section.updates.length - visibleUpdates.length,
                  0
                );

                return (
                  <div
                    key={`${round.roundNumber}-${section.sectionId}`}
                    className="overflow-hidden rounded-xl border border-white/10 bg-black/25"
                  >
                    <div className="border-b border-white/10 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Section
                      </p>
                      <p className="mt-1 font-black text-white">
                        {section.sectionName}
                      </p>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[360px] border-collapse text-left text-[11px] sm:text-xs">
                        <thead className="bg-black/30 text-[10px] uppercase tracking-[0.12em] text-gray-500">
                          <tr>
                            <th className="border border-white/10 px-2 py-2">Rank</th>
                            <th className="border border-white/10 px-2 py-2">Move</th>
                            <th className="border border-white/10 px-2 py-2">Player</th>
                            <th className="border border-white/10 px-2 py-2">Pts</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleUpdates.map((update) => {
                            const movement = standingMovement(update);

                            return (
                              <tr
                                key={update.id}
                                className="transition hover:bg-white/[0.03]"
                              >
                                <td className="border border-white/10 px-2 py-2 font-black text-red-300">
                                  {valueOrDash(update.board_number)}
                                </td>
                                <td className="border border-white/10 px-2 py-2">
                                  <span
                                    className={`inline-flex whitespace-nowrap rounded-full border px-2 py-1 text-[10px] font-black ${standingMovementClass(
                                      movement.tone
                                    )}`}
                                  >
                                    {movement.symbol} {movement.label}
                                  </span>
                                </td>
                                <td className="border border-white/10 px-2 py-2 font-bold text-white">
                                  <span className="line-clamp-2">
                                    {update.player_name}
                                  </span>
                                  {update.previous_board_number && (
                                    <span className="mt-1 block text-[10px] font-normal text-gray-500">
                                      Started {update.previous_board_number}
                                    </span>
                                  )}
                                </td>
                                <td className="border border-white/10 px-2 py-2 text-gray-300">
                                  {valueOrDash(update.points)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {hiddenCount > 0 && (
                      <div className="border-t border-white/10 bg-black/25 p-3 text-xs text-gray-400">
                        {hiddenCount} more player{hiddenCount === 1 ? "" : "s"} in
                        this section. Open the full standings screen for the complete
                        list.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
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
      chessResultsUrl: section.chess_results_url,
      results: sortResults(
        results.filter((result) => result.section_id === section.id)
      ),
    }));
  }

  return [
    {
      sectionId: "overall",
      sectionName: "Overall",
      chessResultsUrl: null,
      results: sortResults(results),
    },
  ];
}

function getSectionCombinationInfo(
  sectionId: string,
  sections: TournamentSection[],
  sectionCombinations: SectionCombination[]
) {
  if (sectionId === "overall") return null;

  const rows = sectionCombinations.filter(
    (combination) => combination.combined_section_id === sectionId
  );

  if (rows.length === 0) return null;

  const sourceNames = rows
    .map(
      (combination) =>
        sections.find((section) => section.id === combination.source_section_id)
          ?.section_name
    )
    .filter(Boolean) as string[];

  if (sourceNames.length === 0) return null;

  return {
    sourceNames,
    note: rows.find((combination) => combination.notes?.trim())?.notes?.trim() ?? null,
  };
}

function FinalRankingTable({
  results,
  sections,
  sectionCombinations,
  chessResultsUrl,
}: {
  results: ResultWithPlayer[];
  sections: TournamentSection[];
  sectionCombinations: SectionCombination[];
  chessResultsUrl: string | null;
}) {
  const sectionEntries = groupResultsBySection(results, sections);

  if (results.length === 0) {
    return (
      <section
        id="standings"
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
      id="standings"
      className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Final Ranking
          </p>
          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            Top 10 by section
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Public rankings show the top 10 players from each imported final
            ranking. Use Chess-Results for the full list.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
            Top 10 list
          </span>
          {chessResultsUrl && (
            <a
              href={chessResultsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
            >
              Full results
            </a>
          )}
        </div>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {sectionEntries.map((section) => {
          const topResults = section.results.slice(0, 10);
          const hiddenCount = Math.max(section.results.length - topResults.length, 0);
          const sectionChessResultsUrl =
            section.chessResultsUrl || chessResultsUrl;
          const combinedInfo = getSectionCombinationInfo(
            section.sectionId,
            sections,
            sectionCombinations
          );

          return (
            <div
              key={section.sectionName}
              className="overflow-hidden rounded-2xl border border-red-500/25 bg-zinc-950 shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
            >
              <div className="h-1 bg-gradient-to-r from-red-600 via-yellow-400 to-red-600" />
              <div className="border-b border-red-500/20 bg-black/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-300">
                      Section
                    </p>
                    <h3 className="mt-2 text-lg font-black text-white">
                      {section.sectionName}
                    </h3>
                  </div>

                  {sectionChessResultsUrl && (
                    <a
                      href={sectionChessResultsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-2 text-[11px] font-bold text-white transition hover:border-red-400"
                    >
                      Full results
                    </a>
                  )}
                </div>

                {combinedInfo && (
                  <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs leading-5 text-red-100">
                    Combined section: {combinedInfo.sourceNames.join(", ")} played
                    together as {section.sectionName}
                    {combinedInfo.note ? `. ${combinedInfo.note}` : "."}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-left text-[11px] sm:text-xs">
                  <thead className="bg-black/25 text-[10px] uppercase tracking-[0.14em] text-gray-500">
                    <tr>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">Rk</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">Name</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">Start</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">Rtg</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">FED</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">Pts</th>
                    </tr>
                  </thead>

                  <tbody>
                    {topResults.map((result, index) => {
                      const position = result.final_position ?? index + 1;

                      return (
                        <tr key={result.id} className="transition hover:bg-white/[0.03]">
                          <td className="border border-white/10 px-2 py-3 font-black text-red-300 sm:px-3">
                            {position}
                          </td>
                          <td className="border border-white/10 px-2 py-3 font-bold text-white sm:px-3">
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
                          <td className="border border-white/10 px-2 py-3 text-gray-300 sm:px-3">
                            {result.starting_number ?? "-"}
                          </td>
                          <td className="border border-white/10 px-2 py-3 text-gray-300 sm:px-3">
                            {publicResultRating(result) ?? "-"}
                          </td>
                          <td className="border border-white/10 px-2 py-3 text-gray-300 sm:px-3">
                            {publicResultFederation(result)}
                          </td>
                          <td className="border border-white/10 px-2 py-3 text-gray-300 sm:px-3">
                            {result.points ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hiddenCount > 0 && (
                <div className="border-t border-white/10 bg-black/25 p-4 text-xs text-gray-400">
                  {hiddenCount} more player{hiddenCount === 1 ? "" : "s"} in
                  this section.{" "}
                  {sectionChessResultsUrl ? (
                    <a
                      href={sectionChessResultsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-red-300 transition hover:text-red-200"
                    >
                      View full list on Chess-Results.
                    </a>
                  ) : (
                    "Full Chess-Results link will be added by the organiser."
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

function sortTeamResults(sectionResults: TournamentTeamResult[]) {
  return [...sectionResults].sort((a, b) => {
    const aPosition = a.final_position ?? 999999;
    const bPosition = b.final_position ?? 999999;

    if (aPosition !== bPosition) return aPosition - bPosition;
    return (b.match_points ?? 0) - (a.match_points ?? 0);
  });
}

function groupTeamResultsBySection(
  teamResults: TournamentTeamResult[],
  sections: TournamentSection[]
) {
  if (sections.length > 0) {
    return sections
      .map((section) => ({
        sectionId: section.id,
        sectionName: section.section_name,
        chessResultsUrl: section.chess_results_url,
        results: sortTeamResults(
          teamResults.filter((result) => result.section_id === section.id)
        ),
      }))
      .filter((section) => section.results.length > 0);
  }

  return [
    {
      sectionId: "overall",
      sectionName: "Overall",
      chessResultsUrl: null,
      results: sortTeamResults(teamResults),
    },
  ].filter((section) => section.results.length > 0);
}

function TeamRankingTable({
  teamResults,
  sections,
  sectionCombinations,
  chessResultsUrl,
}: {
  teamResults: TournamentTeamResult[];
  sections: TournamentSection[];
  sectionCombinations: SectionCombination[];
  chessResultsUrl: string | null;
}) {
  const sectionEntries = groupTeamResultsBySection(teamResults, sections);

  if (teamResults.length === 0 || sectionEntries.length === 0) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-8">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Team Standings
          </p>
          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            Team top 10 by section
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            Team results are shown separately for Swiss system events with team
            tiebreaks.
          </p>
        </div>

        <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
          Swiss team tiebreaks
        </span>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        {sectionEntries.map((section) => {
          const topResults = section.results.slice(0, 10);
          const hiddenCount = Math.max(section.results.length - topResults.length, 0);
          const sectionChessResultsUrl =
            section.chessResultsUrl || chessResultsUrl;
          const combinedInfo = getSectionCombinationInfo(
            section.sectionId,
            sections,
            sectionCombinations
          );

          return (
            <div
              key={`team-${section.sectionId}`}
              className="overflow-hidden rounded-2xl border border-yellow-400/25 bg-zinc-950 shadow-[0_18px_45px_rgba(0,0,0,0.28)]"
            >
              <div className="h-1 bg-gradient-to-r from-yellow-400 via-red-600 to-yellow-400" />
              <div className="border-b border-yellow-400/20 bg-black/45 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-yellow-200">
                      Team section
                    </p>
                    <h3 className="mt-2 text-lg font-black text-white">
                      {section.sectionName}
                    </h3>
                  </div>

                  {sectionChessResultsUrl && (
                    <a
                      href={sectionChessResultsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-2 text-[11px] font-bold text-white transition hover:border-yellow-300"
                    >
                      Full results
                    </a>
                  )}
                </div>

                {combinedInfo && (
                  <p className="mt-3 rounded-lg border border-yellow-400/20 bg-yellow-400/10 px-3 py-2 text-xs leading-5 text-yellow-50">
                    Combined section: {combinedInfo.sourceNames.join(", ")} played
                    together as {section.sectionName}
                    {combinedInfo.note ? `. ${combinedInfo.note}` : "."}
                  </p>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[320px] border-collapse text-left text-[11px] sm:text-xs">
                  <thead className="bg-black/25 text-[10px] uppercase tracking-[0.14em] text-gray-500">
                    <tr>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">Rk</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">Team</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">FED</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">Pts</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">BP</th>
                      <th className="border border-white/10 px-2 py-3 sm:px-3">TB</th>
                    </tr>
                  </thead>

                  <tbody>
                    {topResults.map((result, index) => {
                      const position = result.final_position ?? index + 1;

                      return (
                        <tr
                          key={result.id}
                          className="transition hover:bg-white/[0.03]"
                        >
                          <td className="border border-white/10 px-2 py-3 font-black text-yellow-200 sm:px-3">
                            {position}
                          </td>
                          <td className="border border-white/10 px-2 py-3 font-bold text-white sm:px-3">
                            {result.team_name}
                          </td>
                          <td className="border border-white/10 px-2 py-3 text-gray-300 sm:px-3">
                            {result.federation ?? "-"}
                          </td>
                          <td className="border border-white/10 px-2 py-3 text-gray-300 sm:px-3">
                            {result.match_points ?? "-"}
                          </td>
                          <td className="border border-white/10 px-2 py-3 text-gray-300 sm:px-3">
                            {result.board_points ?? "-"}
                          </td>
                          <td className="border border-white/10 px-2 py-3 text-gray-300 sm:px-3">
                            {result.tie_break ?? "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {hiddenCount > 0 && (
                <div className="border-t border-white/10 bg-black/25 p-4 text-xs text-gray-400">
                  {hiddenCount} more team{hiddenCount === 1 ? "" : "s"} in
                  this section.{" "}
                  {sectionChessResultsUrl ? (
                    <a
                      href={sectionChessResultsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-yellow-200 transition hover:text-yellow-100"
                    >
                      View full list on Chess-Results.
                    </a>
                  ) : (
                    "Full Chess-Results link will be added by the organiser."
                  )}
                </div>
              )}
            </div>
          );
        })}
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




