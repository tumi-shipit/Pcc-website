"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { tokenSimilarity } from "@/lib/identityResolver";
import { supabase } from "@/lib/supabase";

export type MemberProfile = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  rating: number | null;
  club: string | null;
  province: string | null;
  profile_photo_url: string | null;
  verification_status: string | null;
};

export type MemberMembership = {
  id: string;
  user_id: string | null;
  player_id: string | null;
  chess_sa_id: string | null;
  member_email: string;
  membership_type: string;
  membership_status: string;
  start_date: string | null;
  end_date: string | null;
  amount_paid: number | null;
  payment_reference: string | null;
  payment_date: string | null;
  notes: string | null;
  players: MemberProfile | MemberProfile[] | null;
};

function singlePlayer(value: MemberProfile | MemberProfile[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

const playerSelect =
  "id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url, verification_status";

type MemberRegistrationIdentity = {
  player_id?: string | null;
  chess_sa_id?: string | null;
  full_name?: string | null;
  email?: string | null;
};

type MemberOrganiserIdentity = {
  player_id?: string | null;
  chess_sa_id?: string | null;
  organiser_name?: string | null;
  organiser_email?: string | null;
};

function cleanText(value: string | null | undefined) {
  return value?.trim() || null;
}

function sameProfile(left: MemberProfile | null, right: MemberProfile | null) {
  return Boolean(left && right && left.id === right.id);
}

function profileScore(player: MemberProfile) {
  let score = 0;
  if (player.profile_photo_url) score += 40;
  if (player.verification_status === "Verified") score += 25;
  if (player.chess_sa_id) score += 20;
  if (player.rating) score += 10;
  if (player.club) score += 5;
  return score;
}

export default function MemberGuard({
  children,
}: {
  children: (props: {
    email: string;
    membership: MemberMembership;
    player: MemberProfile | null;
  }) => ReactNode;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [membership, setMembership] = useState<MemberMembership | null>(null);
  const [player, setPlayer] = useState<MemberProfile | null>(null);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkMember() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user?.email) {
        router.replace("/members/login");
        return;
      }

      const userEmail = user.email.toLowerCase();
      setEmail(userEmail);

      const { data, error } = await supabase
        .from("member_memberships")
        .select(
          "id, user_id, player_id, chess_sa_id, member_email, membership_type, membership_status, start_date, end_date, amount_paid, payment_reference, payment_date, notes, players(id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url, verification_status)"
        )
        .or(`user_id.eq.${user.id},member_email.eq.${userEmail}`)
        .order("end_date", { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setMessage(
          "Member access could not be checked. The membership table may still need to be created."
        );
        setChecking(false);
        return;
      }

      if (!data) {
        setMessage(
          "No paid membership is linked to this email address yet. Contact PCC if your payment has already been confirmed."
        );
        setChecking(false);
        return;
      }

      const row = data as unknown as MemberMembership;
      const candidateProfiles: MemberProfile[] = [];
      const linkedRelationPlayer = singlePlayer(row.players);
      if (linkedRelationPlayer) candidateProfiles.push(linkedRelationPlayer);

      const { data: resolvedProfileData } = await supabase
        .rpc("resolve_member_player_profile")
        .maybeSingle();

      if (resolvedProfileData) {
        candidateProfiles.push(resolvedProfileData as MemberProfile);
      }

      async function loadPlayerById(playerId: string | null | undefined) {
        const cleanPlayerId = cleanText(playerId);
        if (!cleanPlayerId) return null;

        const { data: playerData } = await supabase
          .from("players")
          .select(playerSelect)
          .eq("id", cleanPlayerId)
          .maybeSingle();

        return (playerData as MemberProfile | null) ?? null;
      }

      async function loadPlayerByChessSaId(chessSaId: string | null | undefined) {
        const cleanChessSaId = cleanText(chessSaId);
        if (!cleanChessSaId) return null;

        const { data: playerData } = await supabase
          .from("players")
          .select(playerSelect)
          .eq("chess_sa_id", cleanChessSaId)
          .limit(20);

        const players = (playerData ?? []) as MemberProfile[];
        candidateProfiles.push(...players);
        return players.sort((left, right) => profileScore(right) - profileScore(left))[0] ?? null;
      }

      async function loadPlayerByEmail(emailAddress: string) {
        const { data: playerData } = await supabase
          .from("players")
          .select(playerSelect)
          .ilike("email", emailAddress)
          .limit(20);

        const players = (playerData ?? []) as MemberProfile[];
        candidateProfiles.push(...players);
        return players.sort((left, right) => profileScore(right) - profileScore(left))[0] ?? null;
      }

      async function loadBestDisplayProfile(basePlayer: MemberProfile | null) {
        if (!basePlayer?.full_name) return basePlayer;

        const { data: candidateData } = await supabase
          .from("players")
          .select(playerSelect)
          .limit(20000);

        const candidates = ((candidateData ?? []) as MemberProfile[]).filter(
          (candidate) =>
            candidate.id === basePlayer.id ||
            (Boolean(basePlayer.chess_sa_id) &&
              candidate.chess_sa_id === basePlayer.chess_sa_id) ||
            tokenSimilarity(candidate.full_name, basePlayer.full_name) >= 50
        );

        if (candidates.length === 0) return basePlayer;

        candidateProfiles.push(...candidates);

        return candidates
          .sort((left, right) => profileScore(right) - profileScore(left))[0];
      }

      async function addPlayersByIds(playerIds: (string | null | undefined)[]) {
        const cleanPlayerIds = Array.from(new Set(playerIds.map(cleanText).filter(Boolean))) as string[];
        if (cleanPlayerIds.length === 0) return;

        const { data: playerData } = await supabase
          .from("players")
          .select(playerSelect)
          .in("id", cleanPlayerIds)
          .limit(50);

        candidateProfiles.push(...((playerData ?? []) as MemberProfile[]));
      }

      async function addPlayersByChessSaIds(chessSaIds: (string | null | undefined)[]) {
        const cleanChessSaIds = Array.from(new Set(chessSaIds.map(cleanText).filter(Boolean))) as string[];
        if (cleanChessSaIds.length === 0) return;

        const { data: playerData } = await supabase
          .from("players")
          .select(playerSelect)
          .in("chess_sa_id", cleanChessSaIds)
          .limit(50);

        candidateProfiles.push(...((playerData ?? []) as MemberProfile[]));
      }

      async function addPlayersByNames(names: (string | null | undefined)[]) {
        const cleanNames = Array.from(new Set(names.map(cleanText).filter(Boolean))) as string[];
        if (cleanNames.length === 0) return;

        const nameMatches = await Promise.all(
          cleanNames.slice(0, 8).map((name) =>
            supabase
              .from("players")
              .select(playerSelect)
              .ilike("full_name", `%${name.replaceAll(",", " ")}%`)
              .limit(20)
          )
        );

        nameMatches.forEach(({ data: playerData }) => {
          candidateProfiles.push(...((playerData ?? []) as MemberProfile[]));
        });
      }

      let linkedPlayer = (resolvedProfileData as MemberProfile | null) ?? linkedRelationPlayer;

      if (row.player_id) {
        linkedPlayer = (await loadPlayerById(row.player_id)) ?? linkedPlayer;
      }

      const lookupChessSaId =
        row.chess_sa_id?.trim() || linkedRelationPlayer?.chess_sa_id?.trim() || null;

      if (lookupChessSaId) {
        linkedPlayer =
          (await loadPlayerByChessSaId(lookupChessSaId)) ?? linkedPlayer;
      }

      linkedPlayer = (await loadPlayerByEmail(userEmail)) ?? linkedPlayer;

      const { data: registrationData } = row.player_id
        ? await supabase
            .from("registrations")
            .select("player_id")
            .eq("player_id", row.player_id)
            .order("created_at", { ascending: false })
            .limit(30)
        : { data: [] };

      const registrations =
        (registrationData ?? []) as MemberRegistrationIdentity[];

      await addPlayersByIds(registrations.map((registration) => registration.player_id));

      const detailFilters = [`email.ilike.${userEmail}`];
      if (row.chess_sa_id) detailFilters.push(`chess_sa_id.eq.${row.chess_sa_id}`);

      const { data: detailData } = await supabase
        .from("registration_details")
        .select("chess_sa_id, full_name, email")
        .or(detailFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(30);

      const details = (detailData ?? []) as MemberRegistrationIdentity[];

      await addPlayersByChessSaIds(details.map((detail) => detail.chess_sa_id));
      await addPlayersByNames(details.map((detail) => detail.full_name));

      const accessFilters = [`organiser_email.ilike.${userEmail}`];
      if (row.chess_sa_id) accessFilters.push(`chess_sa_id.eq.${row.chess_sa_id}`);

      const { data: accessData } = await supabase
        .from("tournament_organiser_access")
        .select("player_id, chess_sa_id, organiser_name, organiser_email")
        .or(accessFilters.join(","))
        .order("created_at", { ascending: false })
        .limit(30);

      const accessRows = (accessData ?? []) as MemberOrganiserIdentity[];

      await addPlayersByIds(accessRows.map((access) => access.player_id));
      await addPlayersByChessSaIds(accessRows.map((access) => access.chess_sa_id));
      await addPlayersByNames(accessRows.map((access) => access.organiser_name));

      const allCandidateMap = new Map<string, MemberProfile>();
      candidateProfiles
        .sort((left, right) => profileScore(right) - profileScore(left))
        .forEach((candidate) => {
          if (!allCandidateMap.has(candidate.id)) allCandidateMap.set(candidate.id, candidate);
        });

      linkedPlayer =
        Array.from(allCandidateMap.values()).sort(
          (left, right) => profileScore(right) - profileScore(left)
        )[0] ??
        (await loadBestDisplayProfile(linkedPlayer));

      const resolvedMembership: MemberMembership = linkedPlayer
        ? {
            ...row,
            player_id: row.player_id ?? linkedPlayer.id,
            chess_sa_id: row.chess_sa_id ?? linkedPlayer.chess_sa_id,
            players: sameProfile(singlePlayer(row.players), linkedPlayer)
              ? row.players
              : linkedPlayer,
          }
        : row;

      setMembership(resolvedMembership);
      setPlayer(linkedPlayer);
      setChecking(false);
    }

    checkMember();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-400">
          Checking member access...
        </div>
      </main>
    );
  }

  if (message || !membership) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          <h1 className="text-2xl font-black">Member access not available</h1>
          <p className="mt-3 text-sm leading-6">{message}</p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/members/login");
            }}
            className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            Sign in with another account
          </button>
        </div>
      </main>
    );
  }

  return <>{children({ email, membership, player })}</>;
}
