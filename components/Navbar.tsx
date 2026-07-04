"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

const whatsappJoinLink =
  "https://wa.me/27728787894?text=Hi%20Polokwane%20Chess%20Club%20%F0%9F%91%8B%0A%0AI%20would%20like%20to%20become%20a%20member.%0A%0AMy%20details%20are%3A%0A%0A%E2%80%A2%20Full%20Name%3A%0A%E2%80%A2%20Age%3A%0A%E2%80%A2%20School%20%2F%20Club%3A%0A%E2%80%A2%20Chess%20SA%20ID%20(if%20available)%3A%0A%E2%80%A2%20Playing%20Strength%3A%0A%E2%80%A2%20Parent%2FGuardian%20Name%20(if%20junior)%3A%0A%E2%80%A2%20Contact%20Number%3A%0A%0AI%20would%20like%20more%20information%20about%20membership.";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.png"
            alt="Polokwane Chess Club logo"
            width={200}
            height={200}
            className="h-14 w-auto rounded-sm object-contain md:h-16"
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-white md:flex">
          <Link href="/" className="transition hover:text-red-500">
            Home
          </Link>

          <Link href="/#about" className="transition hover:text-red-500">
            About
          </Link>

          <Link href="/#tournaments" className="transition hover:text-red-500">
            Tournaments
          </Link>

          <Link href="/register" className="transition hover:text-red-500">
            Register
          </Link>

          <Link href="/#contact" className="transition hover:text-red-500">
            Contact
          </Link>

          <Link href="/admin/login" className="transition hover:text-red-500">
            Admin Login
          </Link>
        </nav>

        <a
          href={whatsappJoinLink}
          target="_blank"
          rel="noopener noreferrer"
          className="hidden rounded bg-green-600 px-4 py-2 text-white transition hover:bg-green-700 md:block"
        >
          Become a Member
        </a>

        <button
          type="button"
          className="text-2xl text-white md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Toggle navigation menu"
        >
          ☰
        </button>
      </div>

      {open && (
        <div className="space-y-4 border-t border-white/10 bg-black px-6 py-4 text-white md:hidden">
          <Link href="/" onClick={() => setOpen(false)} className="block">
            Home
          </Link>

          <Link href="/#about" onClick={() => setOpen(false)} className="block">
            About
          </Link>

          <Link
            href="/#tournaments"
            onClick={() => setOpen(false)}
            className="block"
          >
            Tournaments
          </Link>

          <Link href="/register" onClick={() => setOpen(false)} className="block">
            Register
          </Link>

          <Link href="/#contact" onClick={() => setOpen(false)} className="block">
            Contact
          </Link>

          <Link
            href="/admin/login"
            onClick={() => setOpen(false)}
            className="block"
          >
            Admin Login
          </Link>

          <a
            href={whatsappJoinLink}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-4 block w-full rounded bg-green-600 py-2 text-center"
          >
            Become a Member
          </a>
        </div>
      )}
    </header>
  );
}