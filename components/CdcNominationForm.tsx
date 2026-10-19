"use client";

import { FormEvent, useState } from "react";
import { publicSupabase } from "@/lib/publicSupabase";
import { cdcNominationEligibility, cdcServiceAwardCategories } from "@/lib/cdcAwards";

type FormState = {
  nominee_name: string;
  nominee_surname: string;
  category: string;
  school_club: string;
  nominator_name: string;
  nominator_contact: string;
  criteria_confirmed: boolean;
  website: string;
};

const emptyForm: FormState = {
  nominee_name: "",
  nominee_surname: "",
  category: "",
  school_club: "",
  nominator_name: "",
  nominator_contact: "",
  criteria_confirmed: false,
  website: "",
};

function southAfricaDateKey() {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Africa/Johannesburg",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export default function CdcNominationForm() {
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [category, setCategory] = useState("");
  const nominationOpen = southAfricaDateKey() >= "2026-10-20" && southAfricaDateKey() <= "2026-10-23";

  function update(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    if (field === "category") setCategory(value);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (form.website) return;
    if (!nominationOpen) {
      setError("Nominations are currently closed.");
      return;
    }
    if (!form.category || !cdcServiceAwardCategories.includes(form.category as (typeof cdcServiceAwardCategories)[number])) {
      setError("Please select an award category.");
      return;
    }
    setSubmitting(true);
    const { error: submitError } = await publicSupabase
      .from("cdc_excellence_nominations")
      .insert({
        award_year: 2026,
        nominee_name: form.nominee_name.trim(),
        nominee_surname: form.nominee_surname.trim(),
        category: form.category,
        school_club: form.school_club.trim(),
        nominator_name: form.nominator_name.trim(),
        nominator_contact: form.nominator_contact.trim(),
        criteria_confirmed: form.criteria_confirmed,
      });
    setSubmitting(false);
    if (submitError) {
      setError("We couldn’t submit your nomination. Please try again in a moment.");
      return;
    }
    setForm(emptyForm);
    setCategory("");
    setSubmitted(true);
  }

  return (
    <div className="cdc-form-card">
      {submitted ? (
        <div className="flex min-h-[460px] flex-col items-start justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d7b64e]/15 text-3xl text-[#e6c75c]" aria-hidden="true">✓</span>
          <h3 className="mt-6 font-serif text-3xl font-semibold">Nomination received</h3>
          <p className="mt-3 max-w-md leading-7 text-[#c1d0c0]">Thank you for recognising someone’s contribution to chess in Capricorn District.</p>
          <button type="button" onClick={() => setSubmitted(false)} className="cdc-gold-button mt-7">Submit another nomination</button>
        </div>
      ) : !nominationOpen ? (
        <div className="flex min-h-[460px] flex-col justify-center">
          <p className="cdc-eyebrow">Nomination period</p>
          <h3 className="mt-4 font-serif text-3xl font-semibold">Nominations are closed</h3>
          <p className="mt-3 leading-7 text-[#c1d0c0]">The nominee list will be published on 24 and 25 October. Public voting begins Monday, 26 October.</p>
        </div>
      ) : (
        <>
          <div className="mb-7">
            <p className="cdc-eyebrow">Service & contribution awards</p>
            <h3 className="mt-3 font-serif text-3xl font-semibold">Nominate a candidate</h3>
            <p className="mt-2 text-sm leading-6 text-[#b9c8b9]">Required fields are marked with an asterisk.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Nominee name *"><input required maxLength={80} value={form.nominee_name} onChange={(event) => update("nominee_name", event.target.value)} autoComplete="given-name" /></FormField>
              <FormField label="Nominee surname *"><input required maxLength={80} value={form.nominee_surname} onChange={(event) => update("nominee_surname", event.target.value)} autoComplete="family-name" /></FormField>
            </div>
            <FormField label="Award category *">
              <select required value={form.category} onChange={(event) => update("category", event.target.value)}>
                <option value="">Choose a category</option>
                {cdcServiceAwardCategories.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              {category && <p className="mt-2 text-xs leading-5 text-[#c3d2c1]">{cdcNominationEligibility[category as keyof typeof cdcNominationEligibility]}</p>}
            </FormField>
            <FormField label="School or club *"><input required maxLength={120} value={form.school_club} onChange={(event) => update("school_club", event.target.value)} /></FormField>
            <FormField label="Your name *"><input required maxLength={120} value={form.nominator_name} onChange={(event) => update("nominator_name", event.target.value)} autoComplete="name" /></FormField>
            <FormField label="Your contact details *"><input required maxLength={120} value={form.nominator_contact} onChange={(event) => update("nominator_contact", event.target.value)} placeholder="Phone number or email address" autoComplete="email" /></FormField>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#dfbd58]/25 bg-black/15 p-4 text-sm leading-6 text-[#f2f0e7]">
              <input
                type="checkbox"
                required
                checked={form.criteria_confirmed}
                onChange={(event) => setForm((current) => ({ ...current, criteria_confirmed: event.target.checked }))}
                className="mt-1 !h-5 !w-5 shrink-0 accent-amber-300"
              />
              <span>I confirm that this nominee meets the conditions or criteria for the selected award category.</span>
            </label>
            <div aria-hidden="true" className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden"><label htmlFor="cdc-website">Website</label><input id="cdc-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update("website", event.target.value)} /></div>
            {error && <p role="alert" className="rounded-xl border border-red-300/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">{error}</p>}
            <button type="submit" disabled={submitting} className="cdc-gold-button w-full disabled:cursor-wait disabled:opacity-60">
              {submitting ? "Submitting…" : "Submit nomination"}
            </button>
            <p className="text-center text-[11px] leading-5 text-[#92a491]">Nominations close Friday, 23 October 2026.</p>
          </form>
        </>
      )}
    </div>
  );
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-semibold text-[#f2f0e7]">{label}<span className="mt-2 block">{children}</span></label>;
}
