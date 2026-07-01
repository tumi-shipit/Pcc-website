"use client";

import { useState } from "react";
import Link from "next/link";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-md">

      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">

        {/* Logo */}
        <Link href="/" className="text-xl font-bold text-white">
          PCC <span className="text-red-600">.</span>
        </Link>

        {/* Desktop Menu */}
        <nav className="hidden items-center gap-8 text-sm text-white md:flex">
          <Link href="/" className="hover:text-red-500 transition">
            Home
          </Link>

          <Link href="/about" className="hover:text-red-500 transition">
            About
          </Link>

          <Link href="/tournaments" className="hover:text-red-500 transition">
            Tournaments
          </Link>

          <Link href="/contact" className="hover:text-red-500 transition">
            Contact
          </Link>
        </nav>

        {/* CTA Button */}
        <button className="hidden md:block rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700 transition">
          Join PCC
        </button>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-white text-2xl"
          onClick={() => setOpen(!open)}
        >
          ☰
        </button>

      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-white/10 bg-black px-6 py-4 space-y-4 text-white">

          <Link href="/" className="block" onClick={() => setOpen(false)}>
            Home
          </Link>

          <Link href="/about" className="block" onClick={() => setOpen(false)}>
            About
          </Link>

          <Link href="/tournaments" className="block" onClick={() => setOpen(false)}>
            Tournaments
          </Link>

          <Link href="/contact" className="block" onClick={() => setOpen(false)}>
            Contact
          </Link>

          <button className="mt-4 w-full rounded bg-red-600 py-2">
            Join PCC
          </button>

        </div>
      )}

    </header>
  );
}