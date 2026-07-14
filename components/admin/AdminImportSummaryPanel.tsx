"use client";

type ImportSummary = {
  total_rows: number;
  matched_rows?: number;
  unmatched_rows?: number;
  created_rows?: number;
  updated_rows?: number;
  skipped_rows?: number;
  failed_rows?: number;
  file_name?: string | null;
  status?: string;
};

function value(value: number | null | undefined) {
  return value ?? 0;
}

export default function AdminImportSummaryPanel({
  summary,
}: {
  summary: ImportSummary | null;
}) {
  if (!summary) return null;

  const successRows =
    value(summary.matched_rows) +
    value(summary.created_rows) +
    value(summary.updated_rows);

  const problemRows =
    value(summary.unmatched_rows) +
    value(summary.skipped_rows) +
    value(summary.failed_rows);

  return (
    <section className="mt-6 rounded-3xl border border-white/10 bg-zinc-900 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Import Summary
          </p>
          <h2 className="mt-2 text-2xl font-black">
            {summary.status ?? "Completed"}
          </h2>
          {summary.file_name && (
            <p className="mt-2 text-sm text-gray-400">{summary.file_name}</p>
          )}
        </div>

        <div className="rounded-full border border-white/10 bg-zinc-950 px-4 py-2 text-sm text-gray-300">
          {summary.total_rows} total row{summary.total_rows === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        <SummaryStat label="Total" value={summary.total_rows} />
        <SummaryStat label="Matched" value={value(summary.matched_rows)} tone="green" />
        <SummaryStat label="Unmatched" value={value(summary.unmatched_rows)} tone="yellow" />
        <SummaryStat label="Created" value={value(summary.created_rows)} tone="green" />
        <SummaryStat label="Updated" value={value(summary.updated_rows)} tone="blue" />
        <SummaryStat label="Skipped" value={value(summary.skipped_rows)} tone="yellow" />
        <SummaryStat label="Failed" value={value(summary.failed_rows)} tone="red" />
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950 p-4">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Successful / resolved rows</span>
          <span>{successRows} resolved  -  {problemRows} need attention</span>
        </div>

        <div className="mt-3 h-3 overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full bg-green-500"
            style={{
              width:
                summary.total_rows > 0
                  ? `${Math.round((successRows / summary.total_rows) * 100)}%`
                  : "0%",
            }}
          />
        </div>
      </div>
    </section>
  );
}

function SummaryStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "green" | "yellow" | "red" | "blue";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "red"
      ? "text-red-300"
      : tone === "blue"
      ? "text-blue-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

