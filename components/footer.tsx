import Link from "next/link";
import Image from "next/image";

const footerLinks = [
  { href: "/tournaments", label: "Tournaments" },
  { href: "/players", label: "Players" },
  { href: "/players/rankings", label: "LCA Rankings" },
  { href: "/members", label: "Members" },
  { href: "/organisers", label: "Organisers" },
  { href: "/contact", label: "Contact" },
];

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black text-white">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-10 md:grid-cols-[1fr_1.4fr] md:px-6">
        <div>
          <Link href="/" className="inline-flex items-center">
            <Image
              src="/logo.png"
              alt="Polokwane Chess Club logo"
              width={160}
              height={160}
              className="h-16 w-auto object-contain"
            />
          </Link>

          <p className="mt-5 max-w-md text-sm leading-7 text-gray-400">
            Polokwane Chess Club connects players, parents, organisers and
            supporters through tournaments, verified records and a growing
            archive of Limpopo chess.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">
              Explore
            </p>
            <div className="mt-4 grid gap-3">
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold text-gray-300 transition hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-400">
              Club Access
            </p>
            <div className="mt-4 grid gap-3">
              <Link
                href="/register"
                className="rounded-lg bg-red-600 px-4 py-3 text-center text-sm font-bold transition hover:bg-red-700"
              >
                Register for a Tournament
              </Link>
              <Link
                href="/members/login"
                className="rounded-lg border border-white/10 px-4 py-3 text-center text-sm font-bold transition hover:border-red-500"
              >
                Member Centre
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-5 text-center text-xs text-gray-500">
        Polokwane Chess Club. Established 1958.
      </div>
    </footer>
  );
}
