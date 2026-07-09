"use client";

import { useRouter } from "next/navigation";
import type { ImportedPlayerLike } from "@/lib/importIdentityMatcher";

const STORAGE_KEY = "pcc_import_review_payload";

export default function SmartImportReviewLauncher({
  importType,
  sourcePage,
  tournamentId,
  fileName,
  rows,
  disabled = false,
}: {
  importType: string;
  sourcePage?: string | null;
  tournamentId?: string | null;
  fileName?: string | null;
  rows: ImportedPlayerLike[];
  disabled?: boolean;
}) {
  const router = useRouter();

  function startReview() {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        import_type: importType,
        source_page: sourcePage ?? null,
        tournament_id: tournamentId ?? null,
        file_name: fileName ?? null,
        rows,
      })
    );

    router.push("/admin/imports/review");
  }

  return (
    <button
      type="button"
      onClick={startReview}
      disabled={disabled || rows.length === 0}
      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      Review Smart Matches
    </button>
  );
}
