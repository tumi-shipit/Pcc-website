"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
      let linkedPlayer = singlePlayer(row.players);

      if (!linkedPlayer && row.player_id) {
        const { data: playerData } = await supabase
          .from("players")
          .select(
            "id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url, verification_status"
          )
          .eq("id", row.player_id)
          .maybeSingle();

        if (playerData) linkedPlayer = playerData as MemberProfile;
      }

      if ((!linkedPlayer || !linkedPlayer.chess_sa_id) && row.chess_sa_id) {
        const { data: playerData } = await supabase
          .from("players")
          .select(
            "id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url, verification_status"
          )
          .eq("chess_sa_id", row.chess_sa_id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (playerData) linkedPlayer = playerData as MemberProfile;
      }

      if (!linkedPlayer) {
        const { data: playerData } = await supabase
          .from("players")
          .select(
            "id, full_name, chess_sa_id, fide_id, rating, club, province, profile_photo_url, verification_status"
          )
          .eq("email", userEmail)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (playerData) linkedPlayer = playerData as MemberProfile;
      }

      setMembership(row);
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
