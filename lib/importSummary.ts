import { supabase } from "@/lib/supabase";

export type ImportSummaryInput = {
  import_type: string;
  source_page?: string | null;
  tournament_id?: string | null;
  file_name?: string | null;
  status?: string;
  total_rows: number;
  matched_rows?: number;
  unmatched_rows?: number;
  created_rows?: number;
  updated_rows?: number;
  skipped_rows?: number;
  failed_rows?: number;
  summary?: Record<string, unknown>;
};

export type ImportSummaryRowInput = {
  row_number?: number | null;
  imported_name?: string | null;
  matched_player_id?: string | null;
  matched_player_name?: string | null;
  confidence_score?: number | null;
  status?: string | null;
  message?: string | null;
  row_data?: Record<string, unknown>;
};

export async function createImportSession(input: ImportSummaryInput) {
  const { data, error } = await supabase
    .from("import_sessions")
    .insert({
      import_type: input.import_type,
      source_page: input.source_page ?? null,
      tournament_id: input.tournament_id ?? null,
      file_name: input.file_name ?? null,
      status: input.status ?? "Completed",
      total_rows: input.total_rows,
      matched_rows: input.matched_rows ?? 0,
      unmatched_rows: input.unmatched_rows ?? 0,
      created_rows: input.created_rows ?? 0,
      updated_rows: input.updated_rows ?? 0,
      skipped_rows: input.skipped_rows ?? 0,
      failed_rows: input.failed_rows ?? 0,
      summary: input.summary ?? {},
    })
    .select("id")
    .single();

  if (error) throw error;
  return data as { id: string };
}

export async function createImportSessionRows(
  importSessionId: string,
  rows: ImportSummaryRowInput[]
) {
  if (rows.length === 0) return;

  const payload = rows.map((row) => ({
    import_session_id: importSessionId,
    row_number: row.row_number ?? null,
    imported_name: row.imported_name ?? null,
    matched_player_id: row.matched_player_id ?? null,
    matched_player_name: row.matched_player_name ?? null,
    confidence_score: row.confidence_score ?? null,
    status: row.status ?? null,
    message: row.message ?? null,
    row_data: row.row_data ?? {},
  }));

  const { error } = await supabase.from("import_session_rows").insert(payload);

  if (error) throw error;
}

export function buildImportPercent(done: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((done / total) * 100);
}
