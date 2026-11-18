"use client";

import { useState, type FormEvent } from "react";
import { publicSupabase } from "@/lib/publicSupabase";

const satisfactionOptions = [
  { value: 1, label: "Very dissatisfied" },
  { value: 2, label: "Dissatisfied" },
  { value: 3, label: "Neither satisfied nor dissatisfied" },
  { value: 4, label: "Satisfied" },
  { value: 5, label: "Very satisfied" },
];

export default function CdcAwardsFeedbackForm() {
  const [satisfaction, setSatisfaction] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const form = event.currentTarget;
    const formData = new FormData(form);
    if (String(formData.get("website") ?? "").trim()) {
      setSubmitted(true);
      return;
    }
    if (satisfaction < 1 || satisfaction > 5) {
      setError("Please select a satisfaction rating.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const { error: submitError } = await publicSupabase.from("cdc_awards_feedback").insert({
        satisfaction,
        what_worked_well: String(formData.get("what_worked_well") ?? "").trim(),
        improvements: String(formData.get("improvements") ?? "").trim(),
        issues_faced: String(formData.get("issues_faced") ?? "").trim(),
      });
      if (submitError) throw submitError;
      setSubmitted(true);
      form.reset();
      setSatisfaction(0);
    } catch {
      setError("We couldn’t save your feedback right now. Please try again in a little while.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section id="awards-feedback" aria-labelledby="awards-feedback-heading" className="border-t border-[#d3ad47]/25 bg-[#061b10]">
      <div className="mx-auto max-w-5xl px-5 py-16 md:px-10 md:py-24">
        <div className="max-w-3xl">
          <p className="cdc-eyebrow">Help us improve</p>
          <h2 id="awards-feedback-heading" className="mt-4 font-serif text-4xl font-semibold text-white md:text-6xl">
            Share your awards experience
          </h2>
          <p className="mt-5 text-base leading-7 text-[#c1d0c0]">
            Tell us how satisfied you were, what worked well, and what we should improve for the next awards.
          </p>
        </div>

        {submitted ? (
          <div role="status" className="mt-9 rounded-2xl border border-emerald-300/25 bg-emerald-950/30 p-6 text-emerald-100">
            <h3 className="text-xl font-bold">Thank you for your feedback.</h3>
            <p className="mt-2 text-sm leading-6">Your comments will help us plan the next Capricorn District Chess Excellence Awards.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="cdc-form-card mt-9 space-y-6">
            <fieldset>
              <legend className="text-sm font-bold text-white">Overall, how satisfied were you with the awards? <span aria-hidden="true" className="text-amber-200">*</span></legend>
              <div className="mt-3 grid gap-2 sm:grid-cols-5">
                {satisfactionOptions.map((option) => (
                  <label key={option.value} className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${satisfaction === option.value ? "border-amber-200 bg-amber-200/10 text-amber-100" : "border-white/10 bg-black/15 text-[#d4dfd4] hover:border-amber-200/40"}`}>
                    <input
                      type="radio"
                      name="satisfaction"
                      value={option.value}
                      checked={satisfaction === option.value}
                      onChange={() => setSatisfaction(option.value)}
                      required
                      className="accent-amber-300"
                    />
                    <span><span className="font-bold">{option.value}</span><span className="ml-2 text-xs leading-4">{option.label}</span></span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block text-sm font-bold text-white">
                What did we do well?
                <textarea name="what_worked_well" rows={5} maxLength={2000} className="mt-2 min-h-32 resize-y" placeholder="Share anything you appreciated." />
              </label>
              <label className="block text-sm font-bold text-white">
                What should we improve for next year?
                <textarea name="improvements" rows={5} maxLength={2000} required className="mt-2 min-h-32 resize-y" placeholder="Tell us what would make the next awards better." />
              </label>
            </div>

            <label className="block text-sm font-bold text-white">
              Did you face any issues?
              <textarea name="issues_faced" rows={4} maxLength={2000} className="mt-2 min-h-28 resize-y" placeholder="Describe any problems with the event, venue, communication or process. Leave blank if none." />
            </label>

            <label aria-hidden="true" className="pointer-events-none absolute -left-[10000px] h-px w-px overflow-hidden">
              Website <input name="website" tabIndex={-1} autoComplete="off" />
            </label>

            <p className="text-xs leading-5 text-[#9faf9f]">This form does not ask for your name or email. Please leave out personal details in your comments.</p>
            {error && <p role="alert" className="rounded-lg border border-red-300/20 bg-red-950/30 p-3 text-sm text-red-100">{error}</p>}
            <button type="submit" disabled={submitting} className="cdc-gold-button disabled:cursor-wait disabled:opacity-60">
              {submitting ? "Sending feedback…" : "Send feedback"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
