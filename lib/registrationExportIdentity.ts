import { supabase } from "@/lib/supabase";

// Refresh IDs even if the organiser opened the page before a CHESSA sync.
// Never fall back to a stale export after a failed read or permission change.
export async function refreshRegistrationExportRows<T extends { registration_id: string }>(rows: T[]): Promise<T[]> {
  const result: T[] = [];
  for (let index = 0; index < rows.length; index += 100) {
    const ids = rows.slice(index, index + 100).map(row => row.registration_id);
    const { data, error } = await supabase.from("registration_details").select("*")
      .in("registration_id", ids).abortSignal(AbortSignal.timeout(30000));
    if (error) throw new Error(`Cannot refresh registration identities: ${error.message}`);
    const current = new Map((data ?? []).map(row => [row.registration_id, row]));
    for (const id of ids) {
      if (!current.has(id)) throw new Error("An entry changed or is no longer accessible. Refresh the registration list before exporting.");
      result.push(current.get(id) as T);
    }
  }
  return result;
}
