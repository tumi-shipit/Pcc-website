// Path: components/admin/ChessSaLinkExistingTable.tsx

"use client";

import type { ExistingPlayerLinkDecision } from "@/lib/chessSaLinkExisting";

function confidenceClass(label: string) {
  if (label === "Exact" || label === "High") return "bg-green-500/10 text-green-300";
  if (label === "Medium") return "bg-yellow-500/10 text-yellow-300";
  if (label === "Low") return "bg-red-500/10 text-red-300";
  return "bg-zinc-800 text-zinc-300";
}

function actionClass(action: string) {
  if (action === "link") return "text-green-300";
  if (action === "review") return "text-yellow-300";
  return "text-red-300";
}

export default function ChessSaLinkExistingTable({
  decisions,
}: {
  decisions: ExistingPlayerLinkDecision[];
}) {
  if (decisions.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
        Upload a Chess SA CSV and analyse existing players.
      </p>
    );
  }

  return (
    <section className="overflow-auto rounded-3xl border border-white/10 bg-zinc-900">
      <table className="w-full min-w-[1100px] text-left text-sm">
        <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-gray-500">
          <tr>
            <th className="p-4">PCC Player</th>
            <th className="p-4">Current Chess SA</th>
            <th className="p-4">Current Rating</th>
            <th className="p-4">Chess SA Match</th>
            <th className="p-4">New Chess SA</th>
            <th className="p-4">New Rating</th>
            <th className="p-4">Club</th>
            <th className="p-4">Province</th>
            <th className="p-4">Confidence</th>
            <th className="p-4">Action</th>
          </tr>
        </thead>

        <tbody>
          {decisions.slice(0, 500).map((decision) => (
            <tr key={decision.player.id} className="border-t border-white/10">
              <td className="p-4 font-bold text-white">{decision.player.full_name}</td>
              <td className="p-4 text-gray-300">{decision.player.chess_sa_id ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.player.rating ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.match?.full_name ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.match?.chess_sa_id ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.match?.rating ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.match?.club ?? "-"}</td>
              <td className="p-4 text-gray-300">{decision.match?.province ?? "-"}</td>
              <td className="p-4">
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(decision.confidence_label)}`}>
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
