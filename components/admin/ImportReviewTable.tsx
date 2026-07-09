"use client";

import IdentityMatchCard from "@/components/admin/IdentityMatchCard";
import type { IdentityMatch, IdentityPlayer } from "@/lib/identityResolver";

export type ImportReviewRow = {
  id: string;
  row_number: number;
  imported_name: string;
  row_data: Record<string, unknown>;
  match: IdentityMatch | null;
  selected_player_id: string | null;
  resolution: "use_existing" | "create_new" | "skip" | "unresolved";
};

export default function ImportReviewTable({
  rows,
  onUpdateRow,
}: {
  rows: ImportReviewRow[];
  onUpdateRow: (rowId: string, patch: Partial<ImportReviewRow>) => void;
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
        No import rows to review.
      </p>
    );
  }

  return (
    <section className="space-y-4">
      {rows.map((row) => (
        <IdentityMatchCard
          key={row.id}
          importedName={row.imported_name}
          match={row.match}
          selectedPlayerId={row.selected_player_id}
          onUsePlayer={(player: IdentityPlayer) =>
            onUpdateRow(row.id, {
              selected_player_id: player.id,
              resolution: "use_existing",
            })
          }
          onCreateNew={() =>
            onUpdateRow(row.id, {
              selected_player_id: "CREATE_NEW",
              resolution: "create_new",
            })
          }
          onSkip={() =>
            onUpdateRow(row.id, {
              selected_player_id: "SKIP",
              resolution: "skip",
            })
          }
        />
      ))}
    </section>
  );
}
