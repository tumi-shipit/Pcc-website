import Link from "next/link";
import { verifiedRecords } from "@/lib/verifiedRecords";

export default function VerifiedRecords() {
  return (
    <section id="verified-records" className="bg-black py-14 text-white md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Verified Records
            </p>
            <h2 className="mt-3 text-3xl font-black md:text-5xl">
              Work done for the game
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-gray-400 md:text-base md:leading-8">
              PCC keeps a public trail of official records, development work
              and chess service that can be checked against external sources.
            </p>
          </div>

          <div className="grid gap-4">
            {verifiedRecords.map((record) => (
              <article
                key={record.slug}
                className="rounded-2xl border border-white/10 bg-zinc-900 p-5 shadow-2xl shadow-black/20 md:p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                      {record.label} - {record.dateLabel}
                    </p>
                    <h3 className="mt-3 text-2xl font-black text-white">
                      {record.title}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-gray-400">
                      {record.summary}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {record.organisations.slice(0, 3).map((organisation) => (
                        <span
                          key={organisation.name}
                          className="rounded-full border border-white/10 bg-black px-3 py-1 text-xs font-bold text-gray-300"
                        >
                          {organisation.name}
                        </span>
                      ))}
                    </div>
                  </div>

                  <Link
                    href={`/verified-records/${record.slug}`}
                    className="shrink-0 rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500 hover:bg-red-500/10"
                  >
                    Open PCC record
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
