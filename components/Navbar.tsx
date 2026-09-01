"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { href: "/", label: "Home" },
    { href: "/tournaments", label: "Tournaments" },
    { href: "/players", label: "Players" },
    { href: "/store", label: "Store" },
    { href: "/membership", label: "Membership" },
    { href: "/news", label: "News" },
    { href: "/contact", label: "Contact" },
    { href: "/admin", label: "Admin" },
  ];

  return (
    <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/10 bg-black/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Polokwane Chess Club logo"
            width={200}
            height={200}
            className="h-14 w-auto rounded-sm object-contain md:h-16"
          />
        </Link>

        <nav className="hidden items-center gap-4 text-sm font-semibold text-white xl:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-2 py-2 transition hover:bg-white/10 hover:text-red-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 xl:flex">
          <Link
            href="/register"
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-red-700"
          >
            Register
          </Link>
          <Link
            href="/membership"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-green-700"
          >
            Join
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm font-bold text-white xl:hidden"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label="Toggle navigation menu"
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open && (
        <div className="border-t border-white/10 bg-black px-4 py-4 text-white shadow-2xl xl:hidden">
          <div className="grid gap-2 sm:grid-cols-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm font-semibold"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Link
              href="/register"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-red-600 px-4 py-3 text-center text-sm font-bold"
            >
              Register for a Tournament
            </Link>

            <Link
              href="/membership"
              onClick={() => setOpen(false)}
              className="rounded-lg bg-green-600 px-4 py-3 text-center text-sm font-bold"
            >
              Become a Member
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

