"use client";

import type { ChessSaSyncDecision } from "@/lib/chessSaSync";

function confidenceClass(label: string) {
  if (label === "Exact" || label === "High") return "bg-green-500/10 text-green-300";
  if (label === "Medium") return "bg-yellow-500/10 text-yellow-300";
  if (label === "Low") return "bg-red-500/10 text-red-300";
  return "bg-zinc-800 text-zinc-300";
}

function sectionTitle(action: "update_existing" | "review") {
  return action === "update_existing" ? "Ready to verify" : "Needs review";
}

function sectionDescription(action: "update_existing" | "review") {
  return action === "update_existing"
    ? "These rows have a safe Chess SA ID match in the Player Centre and will be marked Verified."
    : "These rows are missing a Chess SA ID, have duplicate IDs, or have a name conflict.";
}

export default function ChessSaSyncReviewTable({
  decisions,
}: {
  decisions: ChessSaSyncDecision[];
}) {
  if (decisions.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
        Upload a Chess SA CSV file to preview verification.
      </p>
    );
  }

  const groups = [
    {
      action: "update_existing" as const,
      rows: decisions.filter((decision) => decision.action === "update_existing"),
    },
    {
      action: "review" as const,
      rows: decisions.filter((decision) => decision.action === "review"),
    },
  ];
  const skippedCount = decisions.filter((decision) => decision.action === "skip").length;

  return (
    <div className="space-y-8">
      {skippedCount > 0 && (
        <p className="rounded-2xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-400">
          Ignored {skippedCount} Chess SA row{skippedCount === 1 ? "" : "s"} that are not in the Player Centre.
        </p>
      )}

      {groups.map((group) => {
        return (
          <section
            key={group.action}
            className="overflow-auto rounded-3xl border border-white/10 bg-zinc-900"
          >
            <div className="flex flex-col gap-2 border-b border-white/10 bg-zinc-950 p-5 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black text-white">
                  {sectionTitle(group.action)}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                  {sectionDescription(group.action)}
                </p>
              </div>

              <span className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-gray-300">
                {group.rows.length} rows
              </span>
            </div>

            {group.rows.length === 0 ? (
              <p className="p-5 text-sm text-gray-400">No rows in this section.</p>
            ) : (
              <table className="w-full min-w-[1250px] text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="p-4">Row</th>
                    <th className="p-4">Imported Player</th>
                    <th className="p-4">Chess SA</th>
                    <th className="p-4">DOB</th>
                    <th className="p-4">Gender</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Club</th>
                    <th className="p-4">Province</th>
                    <th className="p-4">Player Centre Match</th>
                    <th className="p-4">Confidence</th>
                    <th className="p-4">Reason</th>
                  </tr>
                </thead>

                <tbody>
                  {group.rows.slice(0, 400).map((decision) => (
                    <tr key={decision.row.row_number} className="border-t border-white/10">
                      <td className="p-4 text-gray-400">{decision.row.row_number}</td>
                      <td className="p-4 font-bold text-white">
                        {decision.row.full_name || "-"}
                      </td>
                      <td className="p-4 text-gray-300">
                        {decision.row.chess_sa_id ?? "-"}
                      </td>
                      <td className="p-4 text-gray-300">
                        {decision.row.date_of_birth ?? "-"}
                      </td>
                      <td className="p-4 text-gray-300">
                        {decision.row.gender ?? "-"}
                      </td>
                      <td className="p-4 text-gray-300">
                        {decision.row.rating ?? "-"}
                      </td>
                      <td className="p-4 text-gray-300">
                        {decision.row.club ?? "-"}
                      </td>
                      <td className="p-4 text-gray-300">
                        {decision.row.province ?? "-"}
                      </td>
                      <td className="p-4 text-gray-300">
                        {decision.matched_player_name ?? "-"}
                      </td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(
                            decision.confidence_label
                          )}`}
                        >
                          {decision.confidence_label} {decision.confidence_score}%
                        </span>
                      </td>
                      <td className="p-4 text-xs leading-5 text-gray-400">
                        {decision.reasons.join(", ")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        );
      })}
    </div>
  );
}
