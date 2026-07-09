"use client";

import Link from "next/link";
import type { IdentityMatch, IdentityPlayer } from "@/lib/identityResolver";
import { valueOrDash } from "@/lib/supabaseHelpers";

function confidenceClass(confidence: string) {
  if (confidence === "High") return "bg-green-500/10 text-green-300";
  if (confidence === "Medium") return "bg-yellow-500/10 text-yellow-300";
  return "bg-red-500/10 text-red-300";
}

export default function IdentityMatchCard({
  importedName,
  match,
  selectedPlayerId,
  onUsePlayer,
  onCreateNew,
  onSkip,
}: {
  importedName: string;
  match: IdentityMatch | null;
  selectedPlayerId: string | null;
  onUsePlayer: (player: IdentityPlayer) => void;
  onCreateNew: () => void;
  onSkip: () => void;
}) {
  const suggestedPlayer =
    match?.playerA.full_name.toLowerCase() === importedName.toLowerCase()
      ? match?.playerB
      : match?.playerA;

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-400">
            Imported player
          </p>

          <h3 className="mt-2 text-2xl font-black text-white">
            {importedName}
          </h3>

          {match && suggestedPlayer ? (
            <div className="mt-4">
              <div className="flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${confidenceClass(
                    match.confidence
                  )}`}
                >
                  {match.confidence} confidence
                </span>

                <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs font-bold text-gray-300">
                  {match.score}% match
                </span>
              </div>

              <p className="mt-3 text-sm text-gray-400">
                {match.reasons.join(" • ")}
              </p>

              <div className="mt-4 rounded-xl border border-white/10 bg-zinc-900 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Suggested existing profile
                </p>

                <Link
                  href={`/admin/players/${suggestedPlayer.id}`}
                  className="mt-2 block text-xl font-black text-white transition hover:text-red-300"
                >
                  {suggestedPlayer.full_name}
                </Link>

                <div className="mt-3 grid gap-2 text-sm text-gray-400 sm:grid-cols-2">
                  <p>Chess SA: {valueOrDash(suggestedPlayer.chess_sa_id)}</p>
                  <p>FIDE: {valueOrDash(suggestedPlayer.fide_id)}</p>
                  <p>DOB: {valueOrDash(suggestedPlayer.date_of_birth)}</p>
                  <p>Rating: {valueOrDash(suggestedPlayer.rating)}</p>
                  <p>Club: {valueOrDash(suggestedPlayer.club)}</p>
                  <p>Province: {valueOrDash(suggestedPlayer.province)}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              No confident existing profile found. Review before creating a new
              player.
            </p>
          )}
        </div>

        <div className="grid min-w-[220px] gap-2">
          {suggestedPlayer && (
            <button
              type="button"
              onClick={() => onUsePlayer(suggestedPlayer)}
              className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                selectedPlayerId === suggestedPlayer.id
                  ? "bg-green-600 text-white"
                  : "border border-green-500/40 text-green-200 hover:bg-green-500/10"
              }`}
            >
              Use Existing
            </button>
          )}

          <button
            type="button"
            onClick={onCreateNew}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              selectedPlayerId === "CREATE_NEW"
                ? "bg-blue-600 text-white"
                : "border border-blue-500/40 text-blue-200 hover:bg-blue-500/10"
            }`}
          >
            Create New
          </button>

          <button
            type="button"
            onClick={onSkip}
            className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
              selectedPlayerId === "SKIP"
                ? "bg-yellow-600 text-white"
                : "border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
            }`}
          >
            Skip Row
          </button>
        </div>
      </div>
    </div>
  );
}
