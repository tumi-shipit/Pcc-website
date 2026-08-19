import Link from "next/link";
import { notFound } from "next/navigation";
import Navbar from "@/components/Navbar";
import { publicSupabase } from "@/lib/publicSupabase";
import {
  applyVerifiedRecordOverride,
  verifiedRecords,
  type VerifiedRecordOverride,
} from "@/lib/verifiedRecords";

type VerifiedRecordPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return verifiedRecords.map((record) => ({ slug: record.slug }));
}

export async function generateMetadata({ params }: VerifiedRecordPageProps) {
  const { slug } = await params;
  const record = verifiedRecords.find((item) => item.slug === slug);

  if (!record) {
    return {
      title: "Verified Record | Polokwane Chess Club",
    };
  }

  return {
    title: `${record.title} | Polokwane Chess Club`,
    description: record.summary,
  };
}

export default async function VerifiedRecordPage({
  params,
}: VerifiedRecordPageProps) {
  const { slug } = await params;
  const baseRecord = verifiedRecords.find((item) => item.slug === slug);

  if (!baseRecord) notFound();

  const { data: override } = await publicSupabase
    .from("verified_record_overrides")
    .select(
      "title, summary, content, image_url, album_url, album_label, date_label, organisations, facilitators"
    )
    .eq("slug", slug)
    .maybeSingle();
  const record = applyVerifiedRecordOverride(
    baseRecord,
    override as VerifiedRecordOverride | null
  );

  return (
    <main className="min-h-screen bg-black pt-24 text-white">
      <Navbar />

      <section className="mx-auto max-w-5xl px-4 py-14 md:px-6 md:py-20">
        <Link
          href="/#verified-records"
          className="text-sm font-bold text-red-300 transition hover:text-red-200"
        >
          Back to verified records
        </Link>

        <p className="mt-8 text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
          {record.label}
        </p>
        <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
          {record.title}
        </h1>

        <div className="mt-6 flex flex-wrap gap-3">
          <span className="rounded-full border border-white/10 bg-zinc-900 px-4 py-2 text-sm font-bold text-gray-200">
            {record.dateLabel}
          </span>
          <span className="rounded-full border border-green-500/30 bg-green-500/10 px-4 py-2 text-sm font-bold text-green-200">
            {record.statusLabel}
          </span>
        </div>

        <article className="mt-10 rounded-3xl border border-white/10 bg-zinc-950 p-6 shadow-2xl shadow-black/30 md:p-8">
          {record.image_url && (
            <div className="mb-8 overflow-hidden rounded-2xl border border-white/10 bg-black">
              <img
                src={record.image_url}
                alt={record.title}
                className="max-h-[560px] w-full object-cover"
              />
            </div>
          )}

          <p className="text-lg leading-8 text-gray-200">{record.summary}</p>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <RecordPeoplePanel
              title="Organisations involved"
              items={record.organisations}
            />
            <RecordPeoplePanel title="Facilitators" items={record.facilitators} />
          </div>

          <div className="mt-8 space-y-5 text-sm leading-7 text-gray-400 md:text-base md:leading-8">
            {record.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          <div className="mt-10 rounded-2xl border border-white/10 bg-black p-5">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">
              Supporting source
            </p>
            <p className="mt-3 text-sm leading-6 text-gray-400">
              PCC keeps this page as the permanent record. The external source
              is provided for confirmation while it remains available.
            </p>
            <a
              href={record.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex rounded-xl border border-white/10 px-4 py-3 text-sm font-bold text-white transition hover:border-red-500 hover:bg-red-500/10"
            >
              {record.sourceLabel}
            </a>
            {record.album_url && (
              <a
                href={record.album_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-0 mt-3 inline-flex rounded-xl bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700 sm:ml-3 sm:mt-5"
              >
                {record.album_label || "More pictures"}
              </a>
            )}
          </div>
        </article>
      </section>
    </main>
  );
}

function RecordPeoplePanel({
  title,
  items,
}: {
  title: string;
  items: Array<{ name: string; role: string }>;
}) {
  return (
    <section className="rounded-2xl border border-white/10 bg-black p-5">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-red-300">
        {title}
      </p>
      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <div
            key={`${item.name}-${item.role}`}
            className="rounded-xl border border-white/10 bg-zinc-950 p-4"
          >
            <p className="font-black text-white">{item.name}</p>
            <p className="mt-1 text-sm leading-6 text-gray-400">{item.role}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
