"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import PlayerAvatar from "@/components/PlayerAvatar";
import MemberGuard, {
  MemberMembership,
  MemberProfile,
} from "@/components/members/MemberGuard";
import { supabase } from "@/lib/supabase";

type MemberResult = {
  id: string;
  tournament_id: string;
  imported_name: string | null;
  final_position: number | null;
  points: number | null;
  award_title: string | null;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    venue: string | null;
    registration_status: string | null;
  } | null;
  tournament_sections: {
    section_name: string;
  } | null;
};

type MemberRegistration = {
  registration_id: string;
  created_at: string;
  payment_status: string;
  registration_status: string;
  full_name: string;
  chess_sa_id: string | null;
  email: string | null;
  tournament_name: string;
  start_date: string | null;
  venue: string | null;
  section_name: string | null;
};

type LinkedRegistration = {
  id: string;
  created_at: string | null;
  payment_status: string | null;
  registration_status: string | null;
  tournaments: {
    tournament_name: string;
    start_date: string | null;
    venue: string | null;
  } | null;
  tournament_sections: {
    section_name: string;
  } | null;
};

type MemberOfficial = {
  id: string;
  role: string;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    venue: string | null;
  } | null;
};

type MemberOrganiserAccess = {
  id: string;
  tournament_id: string;
  player_id: string | null;
  chess_sa_id: string | null;
  organiser_email: string;
  organiser_name: string | null;
  role: string | null;
  access_status: string | null;
  tournaments: {
    id: string;
    tournament_name: string;
    start_date: string;
    venue: string | null;
  } | null;
};

type MemberTournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function nameVariants(name: string | null | undefined) {
  if (!name) return [];
  const cleanName = name.trim().replace(/\s+/g, " ");
  if (!cleanName) return [];

  const parts = cleanName.split(" ");
  const variants = new Set([cleanName]);

  if (parts.length > 1) {
    variants.add(`${parts.slice(1).join(" ")} ${parts[0]}`);
  }

  return Array.from(variants);
}

function emailLabel(email: string) {
  return email.split("@")[0]?.replace(/[._-]+/g, " ") || email;
}

function membershipDaysLeft(membership: MemberMembership) {
  if (!membership.end_date) return null;
  const today = new Date();
  const end = new Date(membership.end_date);
  const diff = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  return diff;
}

function statusTone(status: string) {
  if (status === "Active") return "border-green-200 bg-green-50 text-green-700";
  if (status === "Expired") return "border-yellow-200 bg-yellow-50 text-yellow-700";
  if (status === "Suspended") return "border-red-200 bg-red-50 text-red-700";
  return "border-zinc-200 bg-zinc-50 text-zinc-700";
}

function renewalMessage(daysLeft: number | null) {
  if (daysLeft === null) return "Your membership end date has not been recorded yet.";
  if (daysLeft < 0) return "Your membership has expired. Please contact PCC to renew access.";
  if (daysLeft <= 30) return `Your membership renews soon. ${daysLeft} day${daysLeft === 1 ? "" : "s"} remaining.`;
  return "Your membership is active and in good standing.";
}

function isUpcomingDate(value: string | null | undefined) {
  if (!value) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const date = new Date(value);
  date.setHours(0, 0, 0, 0);

  return date.getTime() >= today.getTime();
}

function bySoonestDate<T extends { start_date: string | null }>(left: T, right: T) {
  return new Date(left.start_date ?? "9999-12-31").getTime() - new Date(right.start_date ?? "9999-12-31").getTime();
}

function byLatestDate<T extends { start_date: string | null }>(left: T, right: T) {
  return new Date(right.start_date ?? "0001-01-01").getTime() - new Date(left.start_date ?? "0001-01-01").getTime();
}

function MemberDashboard({
  email,
  membership,
  player,
}: {
  email: string;
  membership: MemberMembership;
  player: MemberProfile | null;
}) {
  const [results, setResults] = useState<MemberResult[]>([]);
  const [registrations, setRegistrations] = useState<MemberRegistration[]>([]);
  const [officials, setOfficials] = useState<MemberOfficial[]>([]);
  const [organiserAccess, setOrganiserAccess] = useState<MemberOrganiserAccess[]>([]);
  const [memberTournaments, setMemberTournaments] = useState<MemberTournament[]>([]);
  const [fallbackName, setFallbackName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const daysLeft = membershipDaysLeft(membership);
  const profilePlayer = player;
  const displayChessSaId = profilePlayer?.chess_sa_id ?? membership.chess_sa_id;
  const displayName =
    profilePlayer?.full_name ?? fallbackName ?? emailLabel(membership.member_email || email);

  useEffect(() => {
    async function loadMemberCentre() {
      setLoading(true);
      setMessage("");

      const linkedPlayerIds = new Set<string>();
      if (player?.id) linkedPlayerIds.add(player.id);
      if (membership.player_id) linkedPlayerIds.add(membership.player_id);

      if (displayChessSaId) {
        const { data: sameChessSaPlayers } = await supabase
          .from("players")
          .select("id")
          .eq("chess_sa_id", displayChessSaId);

        (sameChessSaPlayers ?? []).forEach((samePlayer) => {
          if (samePlayer.id) linkedPlayerIds.add(samePlayer.id);
        });
      }

      if (linkedPlayerIds.size === 0) {
        const { data: emailPlayers } = await supabase
          .from("players")
          .select("id")
          .eq("email", email);

        (emailPlayers ?? []).forEach((emailPlayer) => {
          if (emailPlayer.id) linkedPlayerIds.add(emailPlayer.id);
        });
      }

      const playerIds = Array.from(linkedPlayerIds);
      const playerNameVariants = nameVariants(player?.full_name);
      const resultSelect =
        "id, tournament_id, imported_name, final_position, points, award_title, tournaments(id, tournament_name, start_date, venue, registration_status), tournament_sections(section_name)";

      const { data: linkedResultData, error: linkedResultError } = playerIds.length > 0
        ? await supabase
            .from("tournament_results")
            .select(resultSelect)
            .in("player_id", playerIds)
            .order("created_at", { ascending: false })
            .limit(50)
        : { data: [], error: null };

      const { data: nameResultData, error: nameResultError } = playerNameVariants.length > 0
        ? await supabase
            .from("tournament_results")
            .select(resultSelect)
            .in("imported_name", playerNameVariants)
            .order("created_at", { ascending: false })
            .limit(50)
        : { data: [], error: null };

      const registrationFilters = [`email.eq.${email}`];
      if (displayChessSaId) registrationFilters.push(`chess_sa_id.eq.${displayChessSaId}`);

      const { data: linkedRegistrationData, error: linkedRegistrationError } = playerIds.length > 0
        ? await supabase
            .from("registrations")
            .select(
              "id, created_at, payment_status, registration_status, tournaments(tournament_name, start_date, venue), tournament_sections(section_name)"
            )
            .in("player_id", playerIds)
            .order("created_at", { ascending: false })
            .limit(30)
        : { data: [], error: null };

      const { data: detailRegistrationData, error: detailRegistrationError } = await supabase
        .from("registration_details")
        .select(
          "registration_id, created_at, payment_status, registration_status, full_name, chess_sa_id, email, tournament_name, start_date, venue, section_name"
        )
        .or(registrationFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(30);

      const { data: officialData, error: officialError } = playerIds.length > 0
        ? await supabase
            .from("tournament_officials")
            .select("id, role, tournaments(id, tournament_name, start_date, venue)")
            .in("player_id", playerIds)
            .order("created_at", { ascending: false })
            .limit(20)
        : { data: [], error: null };

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("id, tournament_name, start_date, venue, registration_status")
        .neq("registration_status", "Draft")
        .order("start_date", { ascending: false })
        .limit(100);

      let accessQuery = supabase
        .from("tournament_organiser_access")
        .select(
          "id, tournament_id, player_id, chess_sa_id, organiser_email, organiser_name, role, access_status, tournaments(id, tournament_name, start_date, venue)"
        )
        .eq("access_status", "Active");

      const accessFilters = [`organiser_email.eq.${email}`];
      if (displayChessSaId) accessFilters.push(`chess_sa_id.eq.${displayChessSaId}`);
      playerIds.forEach((playerId) => accessFilters.push(`player_id.eq.${playerId}`));
      accessQuery = accessQuery.or(accessFilters.join(","));

      const { data: accessData, error: accessError } = await accessQuery
        .order("created_at", { ascending: false })
        .limit(20);

      if (linkedResultError || nameResultError) {
        setMessage(`Could not load tournament history: ${(linkedResultError ?? nameResultError)?.message}`);
      } else {
        const resultMap = new Map<string, MemberResult>();
        ([...(linkedResultData ?? []), ...(nameResultData ?? [])] as unknown as MemberResult[]).forEach((result) => {
          resultMap.set(result.id, result);
        });
        setResults(Array.from(resultMap.values()));
      }

      if (linkedRegistrationError) {
        setMessage((current) => current || `Could not load linked tournament entries: ${linkedRegistrationError.message}`);
      }

      const linkedRegistrations = ((linkedRegistrationData ?? []) as unknown as LinkedRegistration[]).map((registration) => ({
        registration_id: registration.id,
        created_at: registration.created_at ?? "",
        payment_status: registration.payment_status ?? "Pending",
        registration_status: registration.registration_status ?? "Pending",
        full_name: displayName,
        chess_sa_id: displayChessSaId ?? null,
        email,
        tournament_name: registration.tournaments?.tournament_name ?? "Tournament",
        start_date: registration.tournaments?.start_date ?? null,
        venue: registration.tournaments?.venue ?? null,
        section_name: registration.tournament_sections?.section_name ?? null,
      }));

      const detailRegistrations = detailRegistrationError
        ? []
        : ((detailRegistrationData ?? []) as unknown as MemberRegistration[]);

      const accessRows = (accessData ?? []) as unknown as MemberOrganiserAccess[];
      const recoveredName =
        profilePlayer?.full_name ??
        detailRegistrations.find((registration) => registration.full_name)?.full_name ??
        accessRows.find((access) => access.organiser_name)?.organiser_name ??
        null;

      setFallbackName(recoveredName);

      const registrationMap = new Map<string, MemberRegistration>();
      [...linkedRegistrations, ...detailRegistrations].forEach((registration) => {
        registrationMap.set(registration.registration_id, registration);
      });

      if (detailRegistrationError && linkedRegistrations.length === 0) {
        setMessage((current) => current || `Could not load tournament entry details: ${detailRegistrationError.message}`);
      }

      setRegistrations(Array.from(registrationMap.values()));

      if (officialError) setMessage((current) => current || `Could not load official roles: ${officialError.message}`);
      else setOfficials((officialData ?? []) as unknown as MemberOfficial[]);

      if (tournamentError) {
        setMessage((current) => current || `Could not load upcoming tournaments: ${tournamentError.message}`);
      }
      else setMemberTournaments((tournamentData ?? []) as MemberTournament[]);

      if (accessError) setMessage((current) => current || "Could not load organiser access.");
      else setOrganiserAccess(accessRows);

      setLoading(false);
    }

    loadMemberCentre();
  }, [
    displayChessSaId,
    displayName,
    email,
    membership.player_id,
    player,
    profilePlayer?.full_name,
    profilePlayer?.id,
  ]);

  const profileItems = [
    {
      label: "Player profile linked",
      done: Boolean(profilePlayer?.id),
      detail: profilePlayer?.full_name ?? "Membership is not linked to a Player Centre profile.",
    },
    {
      label: "Chess SA ID recorded",
      done: Boolean(displayChessSaId),
      detail: displayChessSaId ? `Chess SA ${displayChessSaId}` : "Ask PCC to link your Chess SA ID.",
    },
    {
      label: "Rating available",
      done: Boolean(profilePlayer?.rating),
      detail: profilePlayer?.rating ? `${profilePlayer.rating}` : "This will update from Chess SA sync or tournament records.",
    },
    {
      label: "Club recorded",
      done: Boolean(profilePlayer?.club),
      detail: profilePlayer?.club ?? "Ask PCC to add your club.",
    },
    {
      label: "Profile photo added",
      done: Boolean(profilePlayer?.profile_photo_url),
      detail: profilePlayer?.profile_photo_url ? "Photo is visible on your profile." : "Ask PCC admin to upload your profile photo.",
    },
  ];
  const profileComplete = profileItems.filter((item) => item.done).length;
  const profilePercent = Math.round((profileComplete / profileItems.length) * 100);
  const missingProfileItems = profileItems.filter((item) => !item.done);
  const stats = useMemo(() => {
    const wins = results.filter((result) => result.final_position === 1).length;
    const podiums = results.filter((result) =>
      [1, 2, 3].includes(result.final_position ?? 0)
    ).length;

    return {
      tournaments: new Set([
        ...results.map((result) => result.tournament_id),
        ...registrations.map((registration) => registration.tournament_name),
      ]).size,
      wins,
      podiums,
      officialRoles: officials.length,
      organiserAccess: organiserAccess.length,
    };
  }, [results, registrations, officials, organiserAccess]);

  const upcomingRegistrations = useMemo(
    () => registrations.filter((registration) => isUpcomingDate(registration.start_date)).sort(bySoonestDate),
    [registrations]
  );
  const pastRegistrations = useMemo(
    () => registrations.filter((registration) => !isUpcomingDate(registration.start_date)).sort(byLatestDate),
    [registrations]
  );
  const pastResults = useMemo(
    () =>
      results
        .filter((result) => !isUpcomingDate(result.tournaments?.start_date ?? null))
        .sort((left, right) =>
          byLatestDate(
            { start_date: left.tournaments?.start_date ?? null },
            { start_date: right.tournaments?.start_date ?? null }
          )
        ),
    [results]
  );
  const upcomingMemberTournaments = useMemo(
    () => memberTournaments.filter((tournament) => isUpcomingDate(tournament.start_date)).sort(bySoonestDate),
    [memberTournaments]
  );
  const archivedMemberTournaments = useMemo(
    () => memberTournaments.filter((tournament) => !isUpcomingDate(tournament.start_date)).sort(byLatestDate),
    [memberTournaments]
  );

  return (
    <main className="min-h-screen bg-white pt-24 text-zinc-950">
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
                Member Centre
              </p>
              <h1 className="mt-3 text-3xl font-black md:text-5xl">
                Welcome, {displayName}
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-zinc-600">
                View your PCC membership, linked player profile, tournament
                history and official activity.
              </p>
            </div>

            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = "/members/login";
              }}
              className="rounded-xl border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-950 transition hover:border-red-500"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        {message && (
          <p className="mb-6 rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
            {message}
          </p>
        )}

        <section
          className={`mb-6 rounded-2xl border p-5 ${
            daysLeft !== null && daysLeft < 0
              ? "border-red-200 bg-red-50"
              : daysLeft !== null && daysLeft <= 30
              ? "border-yellow-200 bg-yellow-50"
              : "border-green-200 bg-green-50"
          }`}
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-500">
                Membership Notice
              </p>
              <h2 className="mt-2 text-xl font-black">
                {renewalMessage(daysLeft)}
              </h2>
            </div>
            <Link
              href="/contact"
              className="rounded-xl bg-zinc-950 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
            >
              Contact PCC
            </Link>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <aside className="space-y-6">
            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-4">
                <PlayerAvatar
                  name={displayName}
                  photoUrl={profilePlayer?.profile_photo_url}
                  size="lg"
                  className="border-red-200 bg-red-50 text-red-700"
                />
                <div className="min-w-0">
                  <p className="truncate text-xl font-black">
                    {displayName}
                  </p>
                  <p className="mt-1 text-sm text-zinc-600">
                    {displayChessSaId ? `Chess SA ${displayChessSaId}` : "Chess SA ID not linked"}
                  </p>
                </div>
              </div>

              {profilePlayer && (
                <Link
                  href={`/players/${profilePlayer.id}`}
                  className="mt-5 block rounded-xl bg-red-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
                >
                  Open Public Profile
                </Link>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black">Membership</h2>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-bold ${statusTone(
                    membership.membership_status
                  )}`}
                >
                  {membership.membership_status}
                </span>
              </div>
              <div className="mt-5 space-y-3 text-sm text-zinc-700">
                <SummaryRow label="Type" value={membership.membership_type} />
                <SummaryRow label="Starts" value={formatDate(membership.start_date)} />
                <SummaryRow label="Ends" value={formatDate(membership.end_date)} />
                <SummaryRow
                  label="Days left"
                  value={daysLeft === null ? "Not recorded" : daysLeft < 0 ? "Expired" : `${daysLeft}`}
                />
                <SummaryRow
                  label="Last payment"
                  value={formatDate(membership.payment_date)}
                />
                <SummaryRow
                  label="Reference"
                  value={membership.payment_reference ?? "-"}
                />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">Profile Health</h2>
                  <p className="mt-1 text-xs text-zinc-500">
                    Helps PCC keep your public profile accurate.
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    profilePercent === 100
                      ? "bg-green-100 text-green-700"
                      : profilePercent >= 60
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {profilePercent}%
                </span>
              </div>

              <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className={`h-full rounded-full ${
                    profilePercent === 100
                      ? "bg-green-600"
                      : profilePercent >= 60
                      ? "bg-yellow-500"
                      : "bg-red-600"
                  }`}
                  style={{ width: `${profilePercent}%` }}
                />
              </div>

              <p className="mt-4 text-sm font-bold text-zinc-800">
                {profilePercent === 100
                  ? "Your profile is complete."
                  : `${missingProfileItems.length} item${
                      missingProfileItems.length === 1 ? "" : "s"
                    } still need attention.`}
              </p>

              <div className="mt-4 space-y-2">
                {profileItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-bold text-zinc-800">{item.label}</span>
                      <span
                        className={
                          item.done
                            ? "font-bold text-green-700"
                            : "font-bold text-yellow-700"
                        }
                      >
                        {item.done ? "Complete" : "Needed"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-5 text-zinc-500">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                href="/contact"
                className="mt-5 block rounded-xl border border-zinc-200 px-4 py-3 text-center text-sm font-bold text-zinc-900 transition hover:border-red-500"
              >
                Request profile update
              </Link>
            </section>
          </aside>

          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard label="Tournaments" value={stats.tournaments} />
              <StatCard label="Wins" value={stats.wins} />
              <StatCard label="Podiums" value={stats.podiums} />
              <StatCard label="Official Roles" value={stats.officialRoles} />
              <StatCard label="Organiser Access" value={stats.organiserAccess} />
            </div>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-2xl font-black">My upcoming entries</h2>
              {loading ? (
                <p className="mt-5 text-sm text-zinc-600">Loading entries...</p>
              ) : upcomingRegistrations.length === 0 ? (
                <p className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  You do not have any future tournament entries linked to your profile.
                </p>
              ) : (
                <div className="mt-5 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
                  {upcomingRegistrations.map((registration) => (
                    <div
                      key={registration.registration_id}
                      className="grid gap-3 bg-white p-4 md:grid-cols-[1fr_auto]"
                    >
                      <div>
                        <p className="font-bold text-zinc-950">
                          {registration.tournament_name}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {registration.section_name ?? "Section"} -{" "}
                          {formatDate(registration.start_date)}
                        </p>
                      </div>
                      <p className="text-sm text-zinc-700">
                        {registration.registration_status} - {registration.payment_status}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-2xl font-black">My tournament history</h2>
              {loading ? (
                <p className="mt-5 text-sm text-zinc-600">Loading history...</p>
              ) : pastResults.length === 0 && pastRegistrations.length === 0 ? (
                <p className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  No completed tournament activity is linked to your profile yet.
                </p>
              ) : (
                <div className="mt-5 space-y-4">
                  {pastRegistrations.length > 0 && (
                    <div className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
                      {pastRegistrations.map((registration) => (
                        <div
                          key={registration.registration_id}
                          className="grid gap-3 bg-white p-4 md:grid-cols-[1fr_auto]"
                        >
                          <div>
                            <p className="font-bold text-zinc-950">
                              {registration.tournament_name}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {registration.section_name ?? "Section"} -{" "}
                              {formatDate(registration.start_date)}
                            </p>
                          </div>
                          <p className="text-sm text-zinc-700">
                            {registration.registration_status} - {registration.payment_status}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {pastResults.length > 0 && (
                    <div className="divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200">
                      {pastResults.map((result) => (
                        <Link
                          key={result.id}
                          href={`/tournaments/${result.tournaments?.id}`}
                          className="grid gap-3 bg-white p-4 transition hover:bg-zinc-50 md:grid-cols-[1fr_auto]"
                        >
                          <div>
                            <p className="font-bold text-zinc-950">
                              {result.tournaments?.tournament_name ?? "Tournament"}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {result.tournament_sections?.section_name ?? "Section"} -{" "}
                              {formatDate(result.tournaments?.start_date ?? null)}
                            </p>
                          </div>
                          <p className="text-sm text-zinc-700">
                            Pos {result.final_position ?? "-"} - Pts {result.points ?? "-"}
                          </p>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Quick actions</h2>
                  <p className="mt-2 text-sm text-zinc-600">
                    Common member tasks and useful shortcuts.
                  </p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <QuickAction href="/register" title="Enter Tournament" text="Register for an open PCC event." />
                <QuickAction href="/players" title="Player Centre" text="Browse public player profiles." />
                <QuickAction href="/players/rankings" title="LCA Rankings" text="View partner ranking information." />
                <QuickAction href="/contact" title="Member Support" text="Ask about renewal or profile details." />
              </div>
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-2xl font-black">Upcoming tournaments</h2>
              {upcomingMemberTournaments.length === 0 ? (
                <p className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  No future public tournaments are listed right now.
                </p>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {upcomingMemberTournaments.map((tournament) => (
                    <Link
                      key={tournament.id}
                      href={`/tournaments/${tournament.id}`}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-red-500 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-zinc-950">{tournament.tournament_name}</p>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-600">
                          {tournament.registration_status ?? "Listed"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {formatDate(tournament.start_date)} - {tournament.venue ?? "Venue TBA"}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
              <h2 className="text-2xl font-black">Tournament archive</h2>
              {archivedMemberTournaments.length === 0 ? (
                <p className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
                  No past public tournaments are listed yet.
                </p>
              ) : (
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {archivedMemberTournaments.map((tournament) => (
                    <Link
                      key={tournament.id}
                      href={`/tournaments/${tournament.id}`}
                      className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-red-500 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="font-bold text-zinc-950">{tournament.tournament_name}</p>
                        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-zinc-600">
                          {tournament.registration_status ?? "Completed"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-zinc-500">
                        {formatDate(tournament.start_date)} - {tournament.venue ?? "Venue TBA"}
                      </p>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <ActivityPanel
                title="Official duties"
                empty="No arbiter or organiser duties are linked to your profile yet."
                items={officials.map((official) => ({
                  id: official.id,
                  title: official.role,
                  text: official.tournaments?.tournament_name ?? "Tournament",
                  href: official.tournaments?.id
                    ? `/tournaments/${official.tournaments.id}`
                    : "/members",
                }))}
              />

              <ActivityPanel
                title="Organiser access"
                empty="No organiser portal access is active for your account."
                items={organiserAccess.map((access) => ({
                  id: access.id,
                  title: access.role ?? "Organiser",
                  text: access.tournaments?.tournament_name ?? "Tournament",
                  href: `/organiser/tournaments/${access.tournament_id}`,
                }))}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function QuickAction({
  href,
  title,
  text,
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-red-500 hover:bg-white"
    >
      <p className="font-bold text-zinc-950">{title}</p>
      <p className="mt-2 text-xs leading-5 text-zinc-500">{text}</p>
    </Link>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-zinc-200 pb-3 last:border-b-0 last:pb-0">
      <span className="text-zinc-500">{label}</span>
      <span className="text-right font-semibold text-zinc-950">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black text-zinc-950">{value}</p>
    </div>
  );
}

function ActivityPanel({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: { id: string; title: string; text: string; href: string }[];
}) {
  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
      <h2 className="text-2xl font-black">{title}</h2>
      {items.length === 0 ? (
        <p className="mt-5 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          {empty}
        </p>
      ) : (
        <div className="mt-5 space-y-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="block rounded-xl border border-zinc-200 bg-zinc-50 p-4 transition hover:border-red-500 hover:bg-white"
            >
              <p className="font-bold text-zinc-950">{item.title}</p>
              <p className="mt-1 text-sm text-zinc-600">{item.text}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default function MembersPage() {
  return (
    <MemberGuard>
      {({ email, membership, player }) => (
        <MemberDashboard email={email} membership={membership} player={player} />
      )}
    </MemberGuard>
  );
}
