"use client";

import type { ChessSaSyncDecision } from "@/lib/chessSaSync";

function confidenceClass(label: string) {
  if (label === "Exact" || label === "High") return "bg-green-500/10 text-green-300";
  if (label === "Medium") return "bg-yellow-500/10 text-yellow-300";
  if (label === "Low") return "bg-red-500/10 text-red-300";
  return "bg-zinc-800 text-zinc-300";
}

function actionClass(action: string) {
  if (action === "update_existing") return "text-green-300";
  if (action === "create_new") return "text-blue-300";
  return "text-yellow-300";
}

export default function ChessSaSyncReviewTable({
  decisions,
}: {
  decisions: ChessSaSyncDecision[];
}) {
  if (decisions.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
        Upload a Chess SA CSV file to preview synchronization.
      </p>
    );
  }

  return (
    <section className="overflow-auto rounded-3xl border border-white/10 bg-zinc-900">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="p-4">Row</th>
            <th className="p-4">Imported Player</th>
            <th className="p-4">Chess SA</th>
            <th className="p-4">FIDE</th>
            <th className="p-4">Rating</th>
            <th className="p-4">Club</th>
            <th className="p-4">Province</th>
            <th className="p-4">Match</th>
            <th className="p-4">Confidence</th>
            <th className="p-4">Action</th>
          </tr>
        </thead>

        <tbody>
          {decisions.slice(0, 300).map((decision) => (
            <tr key={decision.row.row_number} className="border-t border-white/10">
              <td className="p-4 text-gray-400">{decision.row.row_number}</td>
              <td className="p-4 font-bold text-white">{decision.row.full_name || "-"}</td>
              <td className="p-4 text-gray-300">{decision.row.chess_sa_id ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.row.fide_id ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.row.rating ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.row.club ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.row.province ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.matched_player_name ?? "-"}</td>
              <td className="p-4">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(
                    decision.confidence_label
                  )}`}
                >
                  {decision.confidence_label} {decision.confidence_score}%
                </span>
              </td>
              <td className={`p-4 font-bold ${actionClass(decision.action)}`}>
                {decision.action.replace("_", " ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
