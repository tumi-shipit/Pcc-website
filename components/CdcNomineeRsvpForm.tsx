"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const rsvpSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
);

const nomineeCategories = [
  "Arbiter of the Year",
  "Coach of the Year",
  "Administrator of the Year",
  "Manager of the Year",
  "Upcoming Arbiter of the Year",
  "Upcoming Manager of the Year",
  "Organiser of the Year",
] as const;

export default function CdcNomineeRsvpForm() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  const [attending, setAttending] = useState<"yes" | "no" | "">("");
  const [respondentRole, setRespondentRole] = useState<"nominee" | "guest" | "">("");
  const [categories, setCategories] = useState<string[]>([]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    if (respondentRole === "nominee" && categories.length === 0) {
      setMessage("Please select at least one nomination category.");
      return;
    }
    setBusy(true);
    setMessage("");
    const { error } = await rsvpSupabase.from("cdc_excellence_awards_rsvps").insert({
      nominee_name: String(values.get("name") ?? "").trim(),
      nominee_surname: String(values.get("surname") ?? "").trim(),
      respondent_role: respondentRole,
      nomination_categories: respondentRole === "nominee" ? categories : [],
      nominee_host_name: respondentRole === "nominee"
        ? `${String(values.get("name") ?? "").trim()} ${String(values.get("surname") ?? "").trim()}`
        : String(values.get("host") ?? "").trim(),
      email: String(values.get("email") ?? "").trim(),
      phone: String(values.get("phone") ?? "").trim() || null,
      attending: attending === "yes",
      guest_count: 0,
      guest_name: null,
      dietary_requirements: String(values.get("dietary") ?? "").trim() || null,
    });
    setBusy(false);
    if (error) {
      setMessage(error.code === "23505"
        ? "An attending guest RSVP has already been submitted for this nominee. Please contact the organisers if you need help."
        : "We could not save your RSVP. Please try again, or contact the organisers directly.");
      return;
    }
    setSaved(true);
    setMessage("Thank you. Your RSVP has been recorded.");
    form.reset();
    setRespondentRole("");
    setAttending("");
    setCategories([]);
  }

  const fieldClass = "mt-2 block w-full rounded-xl border border-white/15 bg-[#071b10] px-4 py-3 text-white outline-none placeholder:text-[#8d9d8c] focus:border-[#dfbd58]";

  if (saved) {
    return (
      <section role="status" aria-live="polite" className="mt-8 rounded-2xl border border-emerald-300/30 bg-emerald-950/35 px-6 py-10 text-center">
        <div className="cdc-rsvp-success-mark mx-auto mb-5 flex h-28 w-28 items-center justify-center rounded-full border-4 border-emerald-300 bg-emerald-400/10 text-emerald-200 shadow-[0_0_45px_rgba(52,211,153,0.32)]" aria-hidden="true">
          <svg viewBox="0 0 64 64" className="h-16 w-16" fill="none">
            <path className="cdc-rsvp-success-check" d="m15 33 11 11 23-25" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-2xl font-black text-white md:text-3xl">RSVP submitted!</p>
        <p className="mt-3 text-base leading-7 text-emerald-100">Your response has been recorded. Thank you.</p>
      </section>
    );
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-5">
      <fieldset className="rounded-xl border border-white/10 bg-black/15 p-4">
        <legend className="px-1 font-semibold text-white">Who are you?</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#d4dfd4]">
          <label className="flex cursor-pointer items-center gap-2"><input required type="radio" name="respondent_role" value="nominee" checked={respondentRole === "nominee"} onChange={() => { setRespondentRole("nominee"); setCategories([]); }} className="accent-amber-300" />I’m the nominee</label>
          <label className="flex cursor-pointer items-center gap-2"><input required type="radio" name="respondent_role" value="guest" checked={respondentRole === "guest"} onChange={() => { setRespondentRole("guest"); setCategories([]); }} className="accent-amber-300" />I’m a nominee’s guest</label>
        </div>
      </fieldset>
      {respondentRole === "nominee" && <fieldset className="rounded-xl border border-white/10 bg-black/15 p-4">
        <legend className="px-1 font-semibold text-white">Which category are you nominated for? <span className="text-amber-200">Select all that apply</span></legend>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {nomineeCategories.map((category) => <label key={category} className="flex cursor-pointer items-start gap-3 text-sm text-[#d4dfd4]">
            <input type="checkbox" name="nomination_categories" value={category} checked={categories.includes(category)} onChange={(event) => setCategories((current) => event.target.checked ? [...current, category] : current.filter((item) => item !== category))} className="mt-0.5 accent-amber-300" />
            <span>{category}</span>
          </label>)}
        </div>
      </fieldset>}
      {respondentRole === "guest" && <label className="block text-sm font-semibold text-white">Nominee you are a guest of<input required name="host" maxLength={161} placeholder="Nominee’s full name" className={fieldClass} /></label>}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-white">{respondentRole === "guest" ? "Guest first name" : "Your first name"}<input required name="name" maxLength={80} autoComplete="given-name" className={fieldClass} /></label>
        <label className="block text-sm font-semibold text-white">{respondentRole === "guest" ? "Guest surname" : "Your surname"}<input required name="surname" maxLength={80} autoComplete="family-name" className={fieldClass} /></label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="block text-sm font-semibold text-white">{respondentRole === "guest" ? "Guest email address" : "Email address"}<input required type="email" name="email" maxLength={254} autoComplete="email" className={fieldClass} /></label>
        <label className="block text-sm font-semibold text-white">Phone number <span className="font-normal text-[#aebbaa]">(optional)</span><input type="tel" name="phone" maxLength={40} autoComplete="tel" className={fieldClass} /></label>
      </div>
      <fieldset className="rounded-xl border border-white/10 bg-black/15 p-4">
        <legend className="px-1 font-semibold text-white">Will you attend on 14 November?</legend>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-3 text-sm text-[#d4dfd4]">
          <label className="flex cursor-pointer items-center gap-2"><input required type="radio" name="attending" value="yes" checked={attending === "yes"} onChange={() => setAttending("yes")} className="accent-amber-300" />Yes, I’ll be there</label>
          <label className="flex cursor-pointer items-center gap-2"><input required type="radio" name="attending" value="no" checked={attending === "no"} onChange={() => setAttending("no")} className="accent-amber-300" />Sorry, I can’t attend</label>
        </div>
      </fieldset>
      {attending === "yes" && <label className="block text-sm font-semibold text-white">Dietary requirements <span className="font-normal text-[#aebbaa]">(optional)</span><textarea name="dietary" maxLength={300} rows={3} placeholder="Let us know about any dietary needs" className={fieldClass} /></label>}
      {message && <p role="alert" className="rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-[#d4dfd4]">{message}</p>}
      {!saved && <button disabled={busy || !attending} className="cdc-gold-button w-full justify-center disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Saving your RSVP…" : "Submit my RSVP"}</button>}
    </form>
  );
}
