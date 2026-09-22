"use client";
import { useState, type FormEvent } from "react";
import { publicSupabase as supabase } from "@/lib/publicSupabase";
import RegistrationRecovery, { recoveryStorageKey, type RecoveryReceipt } from "@/components/RegistrationRecovery";
type Event = { id: string; tournament_name: string; registration_mode: string; entry_fee: number; registration_payment_required: boolean; online_payment_enabled: boolean; payment_details: string | null };
type Section = { id: string; section_name: string; entry_fee_override: number | null };
export default function OnlineTournamentRegistration({ tournament, sections, loading }: { tournament: Event; sections: Section[]; loading: boolean }) {
  const [receipt, setReceipt] = useState<RecoveryReceipt | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sectionId, setSectionId] = useState("");
  const platform = tournament.registration_mode === "lichess" ? "Lichess" : "Chess.com";
  const fee = sections.find(s => s.id === sectionId)?.entry_fee_override ?? tournament.entry_fee;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const { data, error } = await supabase.rpc("submit_online_registration", {
        p_tournament_id: tournament.id, p_section_id: sectionId, p_platform: tournament.registration_mode,
        p_first_name: String(form.get("first_name") || "").trim(), p_surname: String(form.get("surname") || "").trim(),
        p_username: String(form.get("username") || "").trim(), p_email: String(form.get("email") || "").trim(),
      });
      if (error || !data?.registrationId || !data?.recoveryToken) throw new Error(error?.message || "Could not save entry.");
      setReceipt(data);
      window.history.replaceState(null, "", "#entry=" + data.registrationId + "&recovery=" + data.recoveryToken);
      try { localStorage.setItem(recoveryStorageKey, JSON.stringify(data)); } catch { /* The private URL still works. */ }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save entry."); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
    <h1 className="text-2xl font-bold">{tournament.tournament_name}</h1>
    <p className="my-3">{platform} registration. Enter the username you will use to play. Chess SA search is disabled for this event.</p>
    {receipt ? <RegistrationRecovery receipt={receipt} /> : <form onSubmit={submit} className="grid gap-4">
      <label>First name<input required name="first_name" maxLength={100} autoComplete="given-name" className="block w-full rounded bg-zinc-950 p-3" /></label>
      <label>Surname<input required name="surname" maxLength={100} autoComplete="family-name" className="block w-full rounded bg-zinc-950 p-3" /></label>
      <label>{platform} username<input required name="username" pattern="[A-Za-z0-9_-]{2,30}" minLength={2} maxLength={30} autoCapitalize="none" spellCheck={false} className="block w-full rounded bg-zinc-950 p-3" /><span className="text-sm text-zinc-400">Use your username, without a profile URL or @ sign.</span></label>
      <label>Contact email<input required type="email" name="email" maxLength={254} autoComplete="email" className="block w-full rounded bg-zinc-950 p-3" /></label>
      <label>Section<select required value={sectionId} onChange={e => setSectionId(e.target.value)} disabled={loading} className="block w-full rounded bg-zinc-950 p-3"><option value="">Choose a section</option>{sections.map(s => <option key={s.id} value={s.id}>{s.section_name}</option>)}</select></label>
      <p>Entry fee: R{Number(fee).toFixed(2)}. {tournament.registration_payment_required ? "Confirmed online payment is required before approval." : "Your entry will be reviewed by the organiser."}</p>
      {tournament.payment_details && <p className="whitespace-pre-wrap text-sm">{tournament.payment_details}</p>}
      <button disabled={busy || loading || !sectionId} className="rounded bg-green-800 px-5 py-3 font-bold disabled:opacity-50">{busy ? "Saving…" : "Save online entry"}</button>
    </form>}
    {message && <p role="status" className="mt-3 text-amber-200">{message}</p>}
  </section>;
}
