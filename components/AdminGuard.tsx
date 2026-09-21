"use client";

import { ReactNode, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const primaryNav = [
  { href: "/admin/home", label: "Overview" },
  { href: "/admin/tournaments", label: "Tournaments" },
  { href: "/admin/players", label: "Players" },
  { href: "/admin/officials", label: "Officials" },
  { href: "/admin/membership", label: "Membership" },
  { href: "/admin/organisations", label: "Organisations" },
  { href: "/admin/registrations", label: "Entries" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/payment-alerts", label: "Payment Alerts" },
  { href: "/admin/news", label: "News" },
  { href: "/admin/admin-access", label: "Admins" },
];

const toolNav = [
  { href: "/admin/search", label: "Search" },
  { href: "/admin/imports", label: "Imports" },
  { href: "/admin/organiser-access", label: "Access" },
  { href: "/admin/store-orders", label: "Store Orders" },
  { href: "/admin/store-products", label: "Products" },
];

export default function AdminGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [allowed, setAllowed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [accessError, setAccessError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function checkAdmin() {
      setChecking(true);
      setAccessError("");
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
      const { data: sessionData, error: sessionError } = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Session check timed out. Please retry.")), 12000); }),
      ]);
      clearTimeout(timer);
      if (sessionError) throw sessionError;
      if (cancelled) return;
      const user = sessionData.session?.user;

      if (!user) {
        router.replace("/admin/login");
        return;
      }

      // The role resolver includes email-based access. Linking is only needed
      // for a newly assigned account, not on every page navigation.
      let result = await supabase.rpc("current_admin_role").abortSignal(AbortSignal.timeout(12000));
      if (result.error) throw result.error;
      if (!result.data) {
        const linked = await supabase.rpc("link_current_admin_account").abortSignal(AbortSignal.timeout(12000));
        if (linked.error) throw linked.error;
        result = await supabase.rpc("current_admin_role").abortSignal(AbortSignal.timeout(12000));
        if (result.error) throw result.error;
      }
      if (cancelled) return;
      if (typeof result.data !== "string" || !result.data) throw new Error("This account does not have active admin access.");
      setCurrentRole(result.data);
      setAllowed(true);
      } catch (error) {
        if (!cancelled) {
          setAllowed(false);
          setAccessError(error instanceof Error ? error.message : "Could not confirm admin access. Please retry.");
        }
      } finally {
        clearTimeout(timer);
        if (!cancelled) setChecking(false);
      }
    }

    checkAdmin();
    return () => { cancelled = true; };
  }, [router, attempt]);

  async function signOut() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  if (checking || accessError) {
    return (
      <main className="min-h-screen bg-zinc-950 px-6 pt-28 text-white">
        <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl shadow-black/30">
          <div className="h-1 bg-red-600" />
          <div className="p-6">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-red-300">
              Admin access
            </p>
            <h1 className="mt-3 text-2xl font-black">{accessError ? "Could not check your session" : "Checking your session"}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400">
              {accessError || "Confirming that this account can manage PCC records and events."}
            </p>
            {accessError && <div className="mt-4 flex gap-4"><button className="rounded-lg bg-red-600 px-4 py-2 font-bold" onClick={() => setAttempt(value => value + 1)}>Retry</button><Link className="px-4 py-2" href="/admin/login">Sign in</Link></div>}
          </div>
        </div>
      </main>
    );
  }

  if (!allowed) return null;

  const navItems = primaryNav.filter((item) => {
    if (currentRole === "super_admin") return true;
    if (currentRole === "admin") return item.href !== "/admin/admin-access";
    if (currentRole === "organisation_admin") {
      return [
        "/admin/home",
        "/admin/tournaments",
        "/admin/organisations",
        "/admin/registrations",
        "/admin/payments",
      ].includes(item.href);
    }
    if (currentRole === "tournament_staff") {
      return ["/admin/home", "/admin/tournaments", "/admin/registrations"].includes(
        item.href
      );
    }
    if (currentRole === "finance_viewer") {
      return ["/admin/home", "/admin/registrations", "/admin/payments"].includes(
        item.href
      );
    }

    return item.href === "/admin/home";
  });
  const visibleToolNav =
    currentRole === "super_admin" || currentRole === "admin"
      ? toolNav
      : currentRole === "organisation_admin"
        ? toolNav.filter((item) => ["/admin/search", "/admin/store-products"].includes(item.href))
        : toolNav.filter((item) => item.href === "/admin/search");
  const roleLabel =
    currentRole === "super_admin"
      ? "Super Admin"
      : currentRole === "admin"
        ? "Admin"
        : currentRole === "organisation_admin"
          ? "Organisation Admin"
          : currentRole === "tournament_staff"
            ? "Tournament Staff"
            : currentRole === "finance_viewer"
              ? "Finance Viewer"
              : "Admin";
  const canCreateEvent =
    currentRole === "super_admin" ||
    currentRole === "admin" ||
    currentRole === "organisation_admin";

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
            {[...navItems, ...visibleToolNav].map((item) => (
              <AdminNavLink
                key={item.href}
                href={item.href}
                label={item.label}
                active={isActive(pathname, item.href)}
              />
            ))}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <span className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-black uppercase tracking-[0.14em] text-zinc-300">
              {roleLabel}
            </span>
            {canCreateEvent && (
              <Link
                href="/admin/tournaments/new"
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
              >
                New Event
              </Link>
            )}
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
              {[...navItems, ...visibleToolNav].map((item) => (
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
              {canCreateEvent && (
                <Link
                  href="/admin/tournaments/new"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg bg-red-600 px-4 py-3 text-center text-sm font-bold text-white"
                >
                  New Event
                </Link>
              )}
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
