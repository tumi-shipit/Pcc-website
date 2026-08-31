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
  postponement_reason: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: string;
  team_standings_basis?: "National" | "Club / District" | null;
  entry_fee: number;
  poster_image_url: string | null;
  payment_details: string | null;
  chess_results_url: string | null;
  competition_document_url?: string | null;
  competition_document_label?: string | null;
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

type EventAnnouncement = {
  id: string;
  title: string;
  excerpt: string;
  published_at: string | null;
  created_at: string;
};

type ProgrammeItem = {
  id: string;
  programme_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  display_order: number;
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

function escapeCalendarText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function calendarDate(value: string) {
  return value.replace(/-/g, "");
}

function calendarEndDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10).replace(/-/g, "");
}

function buildCalendarFile(tournament: Tournament) {
  const eventEndDate = tournament.end_date || tournament.start_date;
  const description = [
    tournament.description?.trim(),
    tournament.province ? `Province: ${tournament.province}` : null,
    `Event page: https://polokwanechessclub.co.za/tournaments/${tournament.id}`,
  ]
    .filter(Boolean)
    .join("\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Polokwane Chess Club//Tournament Hub//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:pcc-tournament-${tournament.id}@polokwanechessclub.co.za`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")}`,
    `DTSTART;VALUE=DATE:${calendarDate(tournament.start_date)}`,
    `DTEND;VALUE=DATE:${calendarEndDate(eventEndDate)}`,
    `SUMMARY:${escapeCalendarText(tournament.tournament_name)}`,
    `LOCATION:${escapeCalendarText(tournament.venue)}`,
    `DESCRIPTION:${escapeCalendarText(description)}`,
    `URL:https://polokwanechessclub.co.za/tournaments/${tournament.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

function sectionEntryFee(section: TournamentSection, tournament: Tournament) {
  return section.entry_fee_override ?? tournament.entry_fee;
}

function tournamentFeeSummary(tournament: Tournament, sections: TournamentSection[]) {
  const amounts =
    sections.length > 0
      ? sections.map((section) => sectionEntryFee(section, tournament))
      : [tournament.entry_fee];
  const uniqueAmounts = Array.from(new Set(amounts));

  if (uniqueAmounts.length > 1) return "Fees vary by section";

  return formatMoney(uniqueAmounts[0] ?? tournament.entry_fee);
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

function AddToCalendarButton({ tournament }: { tournament: Tournament }) {
  function downloadCalendarFile() {
    const calendar = buildCalendarFile(tournament);
    const blob = new Blob([calendar], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `${tournament.tournament_name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "pcc-tournament"}.ics`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={downloadCalendarFile}
      className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500"
    >
      Add to calendar
    </button>
  );
}

function ShareTournamentButton({ tournament }: { tournament: Tournament }) {
  const [copied, setCopied] = useState(false);

  async function shareTournament() {
    const url = window.location.href;
    const shareData = {
      title: tournament.tournament_name,
      text:
        tournament.tournament_name +
        " · " +
        formatCalendarDate(tournament.start_date) +
        " · " +
        tournament.venue,
      url,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      window.prompt("Copy this official event link:", url);
    }
  }

  return (
    <button
      type="button"
      onClick={shareTournament}
      className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500"
    >
      {copied ? "Link copied" : "Share event"}
    </button>
  );
}

function VenueDirectionsLink({ tournament }: { tournament: Tournament }) {
  const location = tournament.venue + (tournament.province ? ", " + tournament.province : "");
  const directionsUrl =
    "https://www.google.com/maps/search/?api=1&query=" +
    encodeURIComponent(location);

  return (
    <a
      href={directionsUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl border border-white/10 px-6 py-3 text-sm font-bold text-white transition hover:border-red-500"
    >
      Get directions
    </a>
  );
}

function EventNavigation({
  links,
}: {
  links: Array<{ href: string; label: string }>;
}) {
  return (
    <nav
      aria-label="Tournament page navigation"
      className="border-b border-white/10 bg-black/55 backdrop-blur-sm"
    >
      <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 md:px-6">
        {links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-bold text-gray-200 transition hover:border-red-500 hover:text-white"
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
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
  const [results, setResults] = useState<ResultWithPlayer[]>([]);
  const [teamResults, setTeamResults] = useState<TournamentTeamResult[]>([]);
  const [standingUpdates, setStandingUpdates] = useState<LiveStandingUpdate[]>([]);
  const [announcements, setAnnouncements] = useState<EventAnnouncement[]>([]);
  const [programmeItems, setProgrammeItems] = useState<ProgrammeItem[]>([]);
  const [registeredPlayers, setRegisteredPlayers] = useState<PublicRegistrationRow[]>([]);
  const [arbiter, setArbiter] = useState<Player | null>(null);
  const [officials, setOfficials] = useState<PublicOfficial[]>([]);
  const [organisations, setOrganisations] = useState<PublicTournamentOrganisation[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const isOpen = tournament?.registration_status === "Open";
  const isCompleted = tournament?.registration_status === "Completed";
  const isLive = tournament?.registration_status === "Live";
  const isPostponed = tournament?.registration_status === "Postponed";

  useEffect(() => {
    async function loadTournamentHub() {
      setLoading(true);
      setMessage("");

      let { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, description, postponement_reason, start_date, end_date, venue, province, registration_status, team_standings_basis, entry_fee, poster_image_url, payment_details, chess_results_url, competition_document_url, competition_document_label, external_gallery_url, external_gallery_label, arbiter_player_id"
        )
        .eq("id", tournamentId)
        .single();

      if (
        tournamentError?.message.toLowerCase().includes("postponement_reason") ||
        tournamentError?.message.toLowerCase().includes("team_standings_basis") ||
        tournamentError?.message.toLowerCase().includes("external_gallery") ||
        tournamentError?.message.toLowerCase().includes("competition_document")
      ) {
        const fallback = await supabase
          .from("tournaments")
          .select(
            "id, tournament_name, description, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url, payment_details, chess_results_url, arbiter_player_id"
          )
          .eq("id", tournamentId)
          .single();

        tournamentData = fallback.data
          ? {
              ...fallback.data,
              postponement_reason: null,
              team_standings_basis: "Club / District",
              competition_document_url: null,
              competition_document_label: null,
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

      const { data: announcementData, error: announcementError } = await supabase
        .from("news_posts")
        .select("id, title, excerpt, published_at, created_at")
        .eq("published", true)
        .eq("category", "Live Update")
        .ilike("content", "%Tournament ID: " + tournamentId + "%")
        .order("published_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(8);

      if (announcementError) {
        console.error("Error loading event updates:", announcementError);
      }

      const { data: programmeData, error: programmeError } = await supabase
        .from("tournament_programme_items")
        .select(
          "id, programme_date, start_time, end_time, title, location, notes, display_order"
        )
        .eq("tournament_id", tournamentId)
        .eq("is_published", true)
        .order("programme_date", { ascending: true })
        .order("start_time", { ascending: true, nullsFirst: false })
        .order("display_order", { ascending: true });

      if (programmeError) {
        console.error("Error loading event programme:", programmeError);
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
      setResults(resultRowsWithPlayers);
      setTeamResults(teamResultRows);
      setStandingUpdates(liveStandingRows);
      setAnnouncements((announcementData ?? []) as EventAnnouncement[]);
      setProgrammeItems((programmeData ?? []) as ProgrammeItem[]);
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
          Loading tournament page...
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
            Back to tournaments
          </Link>
        </div>
      </main>
    );
  }

  const registeredCount =
    stats?.total_registrations && stats.total_registrations > 0
      ? stats.total_registrations
      : registeredPlayers.length;
  const hasPublicStandings =
    standingUpdates.length > 0 || (isCompleted && results.length > 0);
  const feeSummary = tournamentFeeSummary(tournament, sections);
  const competitionDocumentLabel =
    tournament.competition_document_label?.trim() || "Competition document";
  const hasTournamentTeam =
    organisations.length > 0 || buildPublicTeamCards(officials, arbiter).length > 0;
  const eventNavigation = [
    { href: "#event-overview", label: "Overview" },
    ...(hasTournamentTeam ? [{ href: "#team", label: "Event team" }] : []),
    ...(announcements.length > 0 ? [{ href: "#updates", label: "Updates" }] : []),
    ...(programmeItems.length > 0 ? [{ href: "#programme", label: "Programme" }] : []),
    ...(!isCompleted ? [{ href: "#entries", label: "Entries & sections" }] : []),
    ...(hasPublicStandings
      ? [{ href: "#standings", label: isCompleted ? "Results" : "Standings" }]
      : []),
    ...(isCompleted ? [{ href: "#gallery", label: "Photos" }] : []),
  ];
  const pageBackgroundStyle = tournament.poster_image_url
    ? {
        backgroundImage: `linear-gradient(180deg, rgba(9,9,11,0.92) 0%, rgba(9,9,11,0.84) 46%, rgba(9,9,11,0.94) 100%), url(${JSON.stringify(
          tournament.poster_image_url
        )})`,
      }
    : undefined;

  return (
    <main
      className="min-h-screen bg-zinc-950 bg-cover bg-fixed bg-center pt-24 text-white"
      style={pageBackgroundStyle}
    >
      <section
        id="event-overview"
        className="scroll-mt-28 border-b border-white/10 bg-black/35 backdrop-blur-sm"
      >
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 md:grid-cols-[minmax(260px,380px)_1fr] md:px-6 md:py-12">
          <div className="overflow-hidden rounded-3xl border border-white/15 bg-black shadow-2xl shadow-black/60">
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

          <div className="flex flex-col justify-center rounded-3xl border border-white/10 bg-zinc-950/75 p-5 shadow-2xl shadow-black/40 backdrop-blur md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Link
                href="/tournaments"
                className="text-sm font-semibold text-red-300 transition hover:text-red-200"
              >
                 Back to tournaments
              </Link>
              {tournament.competition_document_url && (
                <span className="rounded-full border border-yellow-400/30 bg-yellow-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-yellow-100">
                  Document ready
                </span>
              )}
            </div>

            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.3em] text-red-400">
              Tournament hub
            </p>

            <h1 className="mt-3 max-w-4xl text-3xl font-black leading-tight md:text-6xl">
              {tournament.tournament_name}
            </h1>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <span
                className={`rounded-2xl border px-4 py-3 text-sm font-bold ${statusStyle(
                  tournament.registration_status
                )}`}
              >
                {statusLabel(tournament.registration_status)}
              </span>
              <span className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-gray-200">
                {formatDate(tournament.start_date)}
              </span>
              <span className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm text-gray-200">
                {tournament.venue}
              </span>
              <span className="rounded-2xl border border-red-400/30 bg-red-500/15 px-4 py-3 text-sm font-bold text-red-100">
                {feeSummary}
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

              {tournament.competition_document_url && (
                <a
                  href={tournament.competition_document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-white px-6 py-3 text-sm font-black text-zinc-950 transition hover:bg-zinc-200"
                >
                  {competitionDocumentLabel}
                </a>
              )}

              <AddToCalendarButton tournament={tournament} />
              {tournament.venue && <VenueDirectionsLink tournament={tournament} />}
              <ShareTournamentButton tournament={tournament} />
            </div>

            {isPostponed && (
              <div className="mt-6 rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm leading-6 text-orange-100">
                {postponementNotice(tournament.postponement_reason)}
              </div>
            )}
          </div>
        </div>
      </section>

      <EventNavigation links={eventNavigation} />

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <TournamentCredits
          organisations={organisations}
          officials={officials}
          fallbackArbiter={arbiter}
        />
        <EventUpdatesPanel announcements={announcements} />
        <EventProgrammePanel items={programmeItems} />

        {!isCompleted && (
          <>
            <EntryBoard
              tournament={tournament}
              sections={sections}
              registeredPlayers={registeredPlayers}
              registeredCount={registeredCount}
              resultsCount={results.length}
              feeSummary={feeSummary}
            />

            <RegisteredPlayersPanel players={registeredPlayers} />
          </>
        )}

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
            sections={sections}
            sectionCombinations={sectionCombinations}
            results={results}
            teamResults={teamResults}
            standingUpdates={standingUpdates}
          />
        )}

        {isCompleted && (
          <section
            id="gallery"
            className="scroll-mt-28 mt-8 rounded-2xl border border-white/10 bg-zinc-950/85 p-5 backdrop-blur md:p-8"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Photo Album
                </p>
                <h2 className="mt-2 text-2xl font-black md:text-4xl">
                  Tournament photos
                </h2>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
                  Photos are kept in the organiser's album so the full
                  collection stays together and does not fill website storage.
                </p>
              </div>

              {tournament.external_gallery_url && (
                <a
                  href={tournament.external_gallery_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-red-600 px-5 py-3 text-center text-sm font-black text-white transition hover:bg-red-700"
                >
                  {tournament.external_gallery_label?.trim() ||
                    "Open photo album"}
                </a>
              )}
            </div>

            {!tournament.external_gallery_url && (
              <p className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                The organiser has not shared a photo album link yet.
              </p>
            )}
          </section>
        )}
      </section>
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
    <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-6">
      <div className="grid gap-4 md:grid-cols-[1fr_320px] md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Entry Check
          </p>
          <h2 className="mt-2 text-2xl font-black md:text-3xl">
            Registered players
          </h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Search the entry list to confirm whether a player appears for
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
    <section
      id="team"
      className="scroll-mt-28 mb-6 rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-6"
    >
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
            <div className="flex h-full min-w-0 items-center gap-4 rounded-2xl border border-white/10 bg-black/35 p-4 transition hover:border-red-500/60">
              {organisation?.logo_url ? (
                <img
                  src={organisation.logo_url}
                  alt={`${organisation.name} logo`}
                  className="h-16 w-16 shrink-0 rounded-xl border border-white/10 bg-white object-contain"
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

function EventUpdatesPanel({
  announcements,
}: {
  announcements: EventAnnouncement[];
}) {
  if (announcements.length === 0) return null;

  return (
    <section
      id="updates"
      className="scroll-mt-28 mb-6 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-6"
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-300">
            Event updates
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">
            Latest organiser notices
          </h2>
          <p className="mt-1 text-sm text-gray-300">
            Official updates published by the event organiser.
          </p>
        </div>
        <span className="w-fit rounded-full bg-amber-300 px-3 py-1 text-xs font-bold text-amber-950">
          {announcements.length} update{announcements.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="space-y-3">
        {announcements.map((announcement) => (
          <Link
            key={announcement.id}
            href={"/news/" + announcement.id}
            className="block rounded-xl border border-white/10 bg-zinc-950/80 p-4 transition hover:border-amber-300/70 hover:bg-zinc-900"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <h3 className="font-bold text-white">{announcement.title}</h3>
              <span className="shrink-0 text-xs font-semibold text-gray-400">
                {formatDate(announcement.published_at || announcement.created_at)}
              </span>
            </div>
            {announcement.excerpt && (
              <p className="mt-2 text-sm text-gray-300">{announcement.excerpt}</p>
            )}
            <span className="mt-3 inline-block text-sm font-semibold text-amber-300">
              Open update →
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}

function EventProgrammePanel({ items }: { items: ProgrammeItem[] }) {
  if (items.length === 0) return null;

  const days = Array.from(new Set(items.map((item) => item.programme_date)));

  return (
    <section
      id="programme"
      className="scroll-mt-28 mb-6 rounded-2xl border border-blue-400/25 bg-blue-500/10 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-6"
    >
      <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-300">
        Event programme
      </p>
      <h2 className="mt-2 text-2xl font-black text-white">Plan your day</h2>
      <p className="mt-1 text-sm text-gray-300">
        Times and activities published by the event organiser.
      </p>

      <div className="mt-5 space-y-5">
        {days.map((day) => (
          <div key={day}>
            <h3 className="text-sm font-black uppercase tracking-wide text-blue-200">
              {formatCalendarDate(day, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <div className="mt-3 space-y-2">
              {items
                .filter((item) => item.programme_date === day)
                .map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-2 rounded-xl border border-white/10 bg-zinc-950/80 p-4 sm:grid-cols-[120px_1fr]"
                  >
                    <p className="text-sm font-black text-blue-200">
                      {item.start_time ? item.start_time.slice(0, 5) : "TBA"}
                      {item.end_time ? "–" + item.end_time.slice(0, 5) : ""}
                    </p>
                    <div>
                      <h4 className="font-bold text-white">{item.title}</h4>
                      {item.location && (
                        <p className="mt-1 text-sm text-gray-300">{item.location}</p>
                      )}
                      {item.notes && (
                        <p className="mt-2 text-sm leading-6 text-gray-400">{item.notes}</p>
                      )}
                    </div>
                  </article>
                ))}
            </div>
          </div>
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

function EntryBoard({
  tournament,
  sections,
  registeredPlayers,
  registeredCount,
  resultsCount,
  feeSummary,
}: {
  tournament: Tournament;
  sections: TournamentSection[];
  registeredPlayers: PublicRegistrationRow[];
  registeredCount: number;
  resultsCount: number;
  feeSummary: string;
}) {
  const sectionEntryCounts = useMemo(() => {
    const counts = new Map<string, number>();

    registeredPlayers.forEach((player) => {
      if (!player.section_id) return;
      counts.set(player.section_id, (counts.get(player.section_id) ?? 0) + 1);
    });

    return counts;
  }, [registeredPlayers]);

  return (
    <section
      id="entries"
      className="scroll-mt-28 rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-2xl shadow-black/30 backdrop-blur md:p-6"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Entry Board
          </p>
          <h2 className="mt-2 text-2xl font-black md:text-3xl">
            Entries and sections
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <MiniStat label="Registered" value={registeredCount} />
            <MiniStat label="Played" value={resultsCount || "-"} />
            <MiniStat label="Status" value={statusLabel(tournament.registration_status)} />
            <MiniStat label="Fee" value={feeSummary} />
          </div>

          {tournament.payment_details && (
            <div className="mt-5 rounded-xl border border-white/10 bg-black/35 p-4 text-sm leading-6 text-gray-300">
              <p className="font-semibold text-white">Payment details</p>
              <p className="mt-2">{tournament.payment_details}</p>
            </div>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-black">Sections</h3>
            <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold text-gray-200">
              {sections.length > 0 ? `${sections.length} listed` : "TBA"}
            </span>
          </div>

          {sections.length === 0 ? (
            <p className="mt-4 rounded-xl border border-white/10 bg-black/30 p-4 text-sm text-gray-400">
              Sections will be confirmed soon.
            </p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {sections.map((section) => {
                const entries = sectionEntryCounts.get(section.id) ?? 0;
                const maximum = section.maximum_players;
                const spacesLeft =
                  maximum === null ? null : Math.max(maximum - entries, 0);
                const isFull = spacesLeft === 0 && maximum !== null;

                return (
                  <div
                    key={section.id}
                    className="rounded-xl border border-white/10 bg-black/35 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="font-bold">{section.section_name}</p>
                      <span className="rounded-full bg-red-600/20 px-2.5 py-1 text-xs font-black text-red-100">
                        {formatMoney(sectionEntryFee(section, tournament))}
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-gray-400">
                      {sectionRuleLabel(section) || "Open section"}
                    </p>
                    {maximum !== null && (
                      <p
                        className={
                          "mt-3 text-xs font-bold " +
                          (isFull ? "text-orange-300" : "text-green-300")
                        }
                      >
                        {isFull
                          ? "Section capacity reached"
                          : entries +
                            " registered · " +
                            spacesLeft +
                            " space" +
                            (spacesLeft === 1 ? "" : "s") +
                            " left"}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/35 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-lg font-black text-white">{value}</p>
    </div>
  );
}

function ArchiveContent({
  tournament,
  sections,
  sectionCombinations,
  results,
  teamResults,
  standingUpdates,
}: {
  tournament: Tournament;
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

  return (
    <div className="mt-8 space-y-8">
      <UpsetsSection upsets={upsets} />

      <TournamentStandingsPanel
        tournamentId={tournament.id}
        standingUpdates={standingUpdates}
        results={results}
        sections={sections}
        sectionCombinations={sectionCombinations}
        chessResultsUrl={tournament.chess_results_url}
        isCompleted
      />

      <CalculatedTeamStandings
        results={results}
        basis={tournament.team_standings_basis ?? "Club / District"}
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
}: {
  upsets: ResultWithPlayer[];
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 backdrop-blur md:p-8">
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
          Upset highlights will appear here once they have been confirmed.
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
      className="mt-8 rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-8"
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            {latestRoundIsFinal ? "Final Ranking" : "Tournament Standings"}
          </p>
          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            {latestRoundIsFinal ? "Final standings" : "Latest standings"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            {latestRoundIsFinal
              ? "These are the confirmed standings. Start numbers are kept where the file provides them."
              : "These are the latest standings shared by the organiser."}
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

function csvCell(value: string | number | null | undefined) {
  return '"' + String(value ?? "").replace(/"/g, '""') + '"';
}

function DownloadResultsButton({
  results,
  sections,
}: {
  results: ResultWithPlayer[];
  sections: TournamentSection[];
}) {
  function downloadResults() {
    const sectionNames = new Map(sections.map((section) => [section.id, section.section_name]));
    const rows = sortResults(results).map((result) =>
      [
        sectionNames.get(result.section_id ?? "") ?? "Overall",
        result.final_position,
        publicResultName(result),
        result.starting_number,
        publicResultRating(result),
        publicResultFederation(result),
        result.points,
        result.tie_break,
        result.award_title,
      ]
        .map(csvCell)
        .join(",")
    );
    const csv =
      ["Section,Rank,Player,Start Number,Rating,Federation,Points,Tie Break,Award"]
        .concat(rows)
        .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "pcc-event-results.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={downloadResults}
      className="rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
    >
      Download results
    </button>
  );
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
        className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-8"
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
      className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-8"
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
          <DownloadResultsButton results={results} sections={sections} />
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

type CalculatedTeamStanding = {
  name: string;
  points: number;
  playerCount: number;
  bestPlayerPoints: number;
  players: Array<{ name: string; points: number | null }>;
};

const teamColourStyles = [
  { dot: "bg-red-400", border: "border-red-400/40", text: "text-red-200", panel: "bg-red-500/10" },
  { dot: "bg-sky-400", border: "border-sky-400/40", text: "text-sky-200", panel: "bg-sky-500/10" },
  { dot: "bg-emerald-400", border: "border-emerald-400/40", text: "text-emerald-200", panel: "bg-emerald-500/10" },
  { dot: "bg-amber-300", border: "border-amber-300/40", text: "text-amber-100", panel: "bg-amber-400/10" },
  { dot: "bg-violet-400", border: "border-violet-400/40", text: "text-violet-200", panel: "bg-violet-500/10" },
  { dot: "bg-pink-400", border: "border-pink-400/40", text: "text-pink-200", panel: "bg-pink-500/10" },
  { dot: "bg-teal-300", border: "border-teal-300/40", text: "text-teal-100", panel: "bg-teal-400/10" },
  { dot: "bg-orange-400", border: "border-orange-400/40", text: "text-orange-200", panel: "bg-orange-500/10" },
  { dot: "bg-lime-300", border: "border-lime-300/40", text: "text-lime-100", panel: "bg-lime-400/10" },
];

function teamColourIndex(name: string) {
  return Array.from(name).reduce(
    (total, character) => total + character.charCodeAt(0),
    0
  ) % teamColourStyles.length;
}

function calculatedTeamStandings(
  results: ResultWithPlayer[],
  groupBy: "province" | "club"
) {
  const grouped = new Map<string, CalculatedTeamStanding>();

  results.forEach((result) => {
    const teamName = result.player?.[groupBy]?.trim();
    if (!teamName) return;

    const current = grouped.get(teamName) ?? {
      name: teamName,
      points: 0,
      playerCount: 0,
      bestPlayerPoints: 0,
      players: [],
    };
    const points = result.points ?? 0;
    current.points += points;
    current.playerCount += 1;
    current.bestPlayerPoints = Math.max(current.bestPlayerPoints, points);
    current.players.push({ name: publicResultName(result), points: result.points });
    grouped.set(teamName, current);
  });

  return [...grouped.values()]
    .map((team) => ({
      ...team,
      players: [...team.players].sort(
        (left, right) => (right.points ?? 0) - (left.points ?? 0)
      ),
    }))
    .sort(
      (left, right) =>
        right.points - left.points ||
        right.bestPlayerPoints - left.bestPlayerPoints ||
        left.name.localeCompare(right.name)
    );
}

function CalculatedTeamStandings({
  results,
  basis,
}: {
  results: ResultWithPlayer[];
  basis: "National" | "Club / District";
}) {
  const groupBy = basis === "National" ? "province" : "club";
  const standings = calculatedTeamStandings(results, groupBy);
  const groupingLabel = groupBy === "province" ? "South African province" : "Club";

  if (standings.length < 2) return null;

  return (
    <section
      id="team-standings"
      className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-8"
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-yellow-300">
            Team points standings
          </p>
          <h2 className="mt-3 text-2xl font-black md:text-4xl">
            {groupingLabel} leaderboard from individual results
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
            Every player keeps their individual result. Their final points are also
            added to their {groupBy} team, making team competition visible without
            changing the tournament&apos;s individual format.
          </p>
        </div>

        <span className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm font-bold text-yellow-100">
          {basis === "National" ? "National: province teams" : "Club / District: club teams"}
        </span>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-2">
        {standings.map((team, index) => {
          const colours = teamColourStyles[teamColourIndex(team.name)];

          return (
            <article
              key={team.name}
              className={`overflow-hidden rounded-2xl border ${colours.border} bg-zinc-900/80`}
            >
              <div className={`flex items-center justify-between gap-4 border-b ${colours.border} ${colours.panel} px-5 py-4`}>
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-3 w-3 shrink-0 rounded-full ${colours.dot}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                      {groupingLabel} #{index + 1}
                    </p>
                    <h3 className="truncate text-xl font-black text-white">{team.name}</h3>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-3xl font-black ${colours.text}`}>{team.points}</p>
                  <p className="text-xs text-gray-400">team points</p>
                </div>
              </div>

              <div className="p-5">
                <div className="mb-4 flex items-center justify-between text-xs text-gray-400">
                  <span>{team.playerCount} scoring player{team.playerCount === 1 ? "" : "s"}</span>
                  <span>Best score: {team.bestPlayerPoints}</span>
                </div>
                <div className="space-y-2">
                  {team.players.map((player) => (
                    <div
                      key={`${team.name}-${player.name}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-black/25 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate font-semibold text-white">{player.name}</span>
                      <span className={`shrink-0 font-black ${colours.text}`}>
                        {player.points ?? 0} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <p className="mt-5 text-xs leading-5 text-gray-500">
        Team totals use every published individual final result shown above. This
        event is configured for {basis === "National" ? "South African province" : "registered club"} teams;
        federation is never used. Official Swiss team tiebreaks, when supplied,
        remain separate below.
      </p>
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
    <section className="rounded-2xl border border-white/10 bg-zinc-950/85 p-5 shadow-2xl shadow-black/25 backdrop-blur md:p-8">
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
