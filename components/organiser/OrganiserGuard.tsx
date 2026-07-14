"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export type OrganiserAccess = {
  id: string;
  tournament_id: string;
  player_id: string | null;
  chess_sa_id: string | null;
  organiser_email: string;
  organiser_name: string | null;
  role: string | null;
  access_status: string | null;
};

export default function OrganiserGuard({
  children,
}: {
  children: (props: {
    email: string;
    isAdmin: boolean;
    access: OrganiserAccess[];
  }) => ReactNode;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [access, setAccess] = useState<OrganiserAccess[]>([]);
  const [checking, setChecking] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkAccess() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user?.email) {
        router.replace("/organiser/login");
        return;
      }

      const userEmail = user.email.toLowerCase();
      setEmail(userEmail);

      const { data: adminRow } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (adminRow) {
        setIsAdmin(true);
        setChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from("tournament_organiser_access")
        .select("id, tournament_id, player_id, chess_sa_id, organiser_email, organiser_name, role, access_status")
        .eq("organiser_email", userEmail)
        .eq("access_status", "Active");

      if (error) {
        setMessage(
          "Organiser access could not be checked. The access table may still need to be created."
        );
        setChecking(false);
        return;
      }

      const rows = (data ?? []) as OrganiserAccess[];

      if (rows.length === 0) {
        setMessage("No tournament access has been assigned to this email address.");
        setChecking(false);
        return;
      }

      setAccess(rows);
      setChecking(false);
    }

    checkAccess();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-zinc-400">
          Checking organiser access...
        </div>
      </main>
    );
  }

  if (message) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          <h1 className="text-2xl font-black">Access not available</h1>
          <p className="mt-3 text-sm leading-6">{message}</p>
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/organiser/login");
            }}
            className="mt-5 rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white"
          >
            Sign in with another account
          </button>
        </div>
      </main>
    );
  }

  return <>{children({ email, isAdmin, access })}</>;
}
