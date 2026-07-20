"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const primaryNav = [
  { href: "/admin/home", label: "Overview" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/organisations", label: "Organisations" },
  { href: "/admin/registrations", label: "Entries" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/operations", label: "Ops" },
  { href: "/admin/admin-access", label: "Admins" },
];

const toolNav = [
  { href: "/admin/search", label: "Search" },
  { href: "/admin/imports", label: "Imports" },
  { href: "/admin/organiser-access", label: "Access" },
];

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    async function checkAdmin() {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      const { data: roleData } = await supabase.rpc("current_admin_role");
      let isAdmin = typeof roleData === "string" && roleData.length > 0;

      const { data: adminRow, error } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();

      isAdmin = isAdmin || (!error && Boolean(adminRow));

      if (!isAdmin) {
        await supabase.auth.signOut();
        router.replace("/admin/login");
        return;
      }

      setAllowed(true);
      setChecking(false);
    }

    checkAdmin();
  }, [router]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 pt-28 text-white">
        <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/30">
          <div className="h-1 bg-red-600" />
          <div className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-300">
              Admin access
            </p>
            <h1 className="mt-3 text-2xl font-black">Checking your session</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              Confirming that this account can manage PCC records and events.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!allowed) return null;

  return (
    <>
      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-zinc-950/90 text-white shadow-2xl shadow-black/20 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 md:px-6">
          <Link href="/admin/home" className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-red-300">
              PCC Admin
            </p>
            <p className="truncate text-sm font-black text-white md:text-base">
              Command Centre
            </p>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {[...primaryNav, ...toolNav].map((item) => (
              <AdminNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(pathname, item.href)}
              />
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/admin/tournaments/new"
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
            >
              New Event
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="rounded-lg border border-white/10 px-4 py-2 text-sm font-bold text-zinc-300 transition hover:border-red-500 hover:text-white"
            >
              Sign out
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            aria-label="Toggle admin navigation"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-bold text-white xl:hidden"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </div>

        {menuOpen && (
          <div className="border-t border-white/10 bg-zinc-950 px-4 py-4 xl:hidden">
            <div className="mx-auto grid max-w-7xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[...primaryNav, ...toolNav].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`rounded-lg border px-4 py-3 text-sm font-bold transition ${
                    isActive(pathname, item.href)
                      ? "border-red-500 bg-red-600 text-white"
                      : "border-white/10 bg-zinc-900 text-zinc-300 hover:border-red-500 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              <Link
                href="/admin/tournaments/new"
                onClick={() => setMenuOpen(false)}
                className="rounded-lg bg-red-600 px-4 py-3 text-center text-sm font-bold text-white"
              >
                New Event
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="rounded-lg border border-white/10 px-4 py-3 text-sm font-bold text-zinc-300"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </header>

      {children}
    </>
  );
}

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin/home" && pathname.startsWith(href));
}

function AdminNavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 text-sm font-bold transition ${
        active
          ? "bg-red-600 text-white shadow-lg shadow-red-950/30"
          : "text-zinc-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
