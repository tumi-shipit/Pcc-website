"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function MemberLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    router.replace("/members");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
      <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
        <section>
          <Link href="/" className="text-sm font-semibold text-red-300">
            Back to PCC
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
            Member Centre
          </p>
          <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">
            Your PCC membership, profile and chess activity in one place.
          </h1>
          <p className="mt-5 max-w-2xl text-sm leading-7 text-zinc-300 md:text-base">
            Paid members can view their membership period, linked Player Centre
            profile, tournament history, official duties and organiser access.
          </p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
          <h2 className="text-2xl font-black">Member sign in</h2>
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <label className="block">
              <span className="text-sm font-semibold text-zinc-200">Email</span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
              />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-zinc-200">Password</span>
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
            >
              {loading ? "Signing in..." : "Open Member Centre"}
            </button>
          </form>

          {message && (
            <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
