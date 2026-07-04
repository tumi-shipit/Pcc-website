"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    async function checkAdmin() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: adminRow, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .single();

      if (error || !adminRow) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    checkAdmin();
  }, [router]);

  if (checking) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 pt-28 text-white">
        <div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
          Checking admin access...
        </div>
      </main>
    );
  }

  if (!allowed) return null;

  return <>{children}</>;
}
