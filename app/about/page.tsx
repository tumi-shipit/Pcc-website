import Link from "next/link";
import { connection } from "next/server";
import Navbar from "@/components/Navbar";
import { publicSupabase } from "@/lib/publicSupabase";
import {
  applyVerifiedRecordOverride,
  verifiedRecords,
  type VerifiedRecordOverride,
} from "@/lib/verifiedRecords";

export default async function AboutPage() {
  await connection();

  const baseRecord = verifiedRecords[0];
  const { data: override } = await publicSupabase
    .from("verified_record_overrides")
    .select(
      "title, summary, content, image_url, album_url, album_label, date_label, organisations, facilitators"
    )
    .eq("slug", baseRecord.slug)
    .maybeSingle();
  const developmentRecord = applyVerifiedRecordOverride(
    baseRecord,
    override as VerifiedRecordOverride | null
  );

  return (
    <main className="min-h-screen bg-black text-white pt-24">
      <Navbar />

      <section className="px-6 py-20 max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold">About PCC</h1>

        <p className="mt-6 text-gray-400 leading-7">
          Polokwane Chess Club was established in 1958 and has served the
          Polokwane community for more than six decades. The club supports
          competitive chess, youth development and new players across the city,
          district and province.
        </p>

        <div className="mt-10 rounded-2xl border border-white/10 bg-zinc-950 p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-red-400">
            Verified Development Record
          </p>
          <h2 className="mt-3 text-2xl font-black">
            {developmentRecord.title}
          </h2>
          <p className="mt-4 text-sm leading-7 text-gray-400">
            {developmentRecord.summary}
          </p>
          <Link
            href={`/verified-records/${developmentRecord.slug}`}
            className="mt-5 inline-flex rounded-lg border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-red-500 hover:bg-red-500/10"
          >
            Open PCC record
          </Link>
        </div>
      </section>
    </main>
  );
}
