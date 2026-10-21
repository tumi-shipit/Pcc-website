"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const acceptanceSupabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { storageKey: "cdc-nominee-acceptance-auth", persistSession: true } },
);

type ResponseChoice = "accepted" | "declined" | "";
type CategoryResponse = { category: string; response: "pending" | "accepted" | "declined" };
type Invitation = {
  nominee_name: string;
  nominee_surname: string;
  categories: CategoryResponse[];
  open: boolean;
};

export default function CdcNomineeAcceptance({ token }: { token: string }) {
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [choices, setChoices] = useState<Record<string, ResponseChoice>>({});
  const [email, setEmail] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;
    async function load() {
      const [{ data, error }, { data: userData }] = await Promise.all([
        acceptanceSupabase.rpc("cdc_get_nominee_acceptance", { p_token: token }),
        acceptanceSupabase.auth.getUser(),
      ]);
      if (!alive) return;
      if (error || !data) {
        setMessage("This private response link is invalid or unavailable.");
        setLoading(false);
        return;
      }
      const details = data as unknown as Invitation;
      setInvitation(details);
      setChoices(Object.fromEntries(details.categories.map(({ category, response }) => [category, response === "pending" ? "" : response])));
      const user = userData.user;
      if (user?.email && user.email_confirmed_at) setVerifiedEmail(user.email);
      setLoading(false);
    }
    void load();
    const { data: authListener } = acceptanceSupabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (user?.email && user.email_confirmed_at) setVerifiedEmail(user.email);
    });
    return () => { alive = false; authListener.subscription.unsubscribe(); };
  }, [token]);

  async function sendVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const { error } = await acceptanceSupabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/cdc-excellence-awards/accept/${token}`,
      },
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setEmailSent(true);
      setMessage("Check your inbox and open the verification link. It will bring you back here to respond.");
    }
  }

  async function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verifiedEmail || !invitation) return;
    setBusy(true);
    setMessage("");
    const responses = invitation.categories.map(({ category }) => ({ category, response: choices[category] }));
    const { error } = await acceptanceSupabase.rpc("cdc_submit_nominee_acceptance", {
      p_token: token,
      p_responses: responses,
    });
    setBusy(false);
    if (error) setMessage(error.message);
    else {
      setSubmitted(true);
      setMessage("Your response has been recorded for every eligible category.");
      setInvitation((current) => current ? {
        ...current,
        categories: current.categories.map((item) => ({ ...item, response: choices[item.category] as "accepted" | "declined" })),
      } : current);
    }
  }

  return (
    <main className="cdc-awards min-h-screen bg-[#061b10] px-5 pb-16 pt-28 text-[#f7f4e9] md:pt-36">
      <section className="mx-auto max-w-2xl rounded-3xl border border-[#d3ad47]/30 bg-[#0a2617] p-6 shadow-2xl shadow-black/30 md:p-10">
        <p className="cdc-eyebrow">2nd CDC Excellence Awards · 2026</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold text-white">Nomination response</h1>
        {loading ? <p className="mt-6 text-[#c1d0c0]">Loading your private response…</p> : !invitation ? (
          <p role="alert" className="mt-6 rounded-xl border border-red-200/20 bg-red-950/30 p-4 text-sm">{message}</p>
        ) : (
          <>
            <p className="mt-4 leading-7 text-[#c1d0c0]">This private link is for <strong className="text-white">{invitation.nominee_name} {invitation.nominee_surname}</strong>. Please accept or decline each category below.</p>
            <div className="mt-6 space-y-3">
              {invitation.categories.map((item) => (
                <fieldset key={item.category} className="rounded-xl border border-white/10 bg-black/15 p-4" disabled={!invitation.open || submitted || item.response !== "pending"}>
                  <legend className="px-1 font-semibold text-white">{item.category}</legend>
                  {item.response === "pending" ? (
                    <div className="mt-2 flex flex-wrap gap-5 text-sm">
                      {(["accepted", "declined"] as const).map((choice) => <label key={choice} className="flex cursor-pointer items-center gap-2 capitalize text-[#d4dfd4]"><input required type="radio" name={item.category} value={choice} checked={choices[item.category] === choice} onChange={() => setChoices((current) => ({ ...current, [item.category]: choice }))} className="accent-amber-300" />{choice === "accepted" ? "Accept nomination" : "Decline nomination"}</label>)}
                    </div>
                  ) : <p className="mt-2 text-sm capitalize text-[#d4dfd4]">Response recorded: {item.response}</p>}
                </fieldset>
              ))}
            </div>
            {!invitation.open && <p className="mt-5 rounded-xl border border-amber-200/20 bg-amber-950/20 p-4 text-sm text-amber-100">The response period closed at midnight after 25 October 2026 (South African time).</p>}
            {invitation.open && invitation.categories.some((item) => item.response === "pending") && !verifiedEmail && (
              <form onSubmit={sendVerification} className="mt-7 rounded-2xl border border-[#dfbd58]/20 bg-black/15 p-5">
                <h2 className="font-bold text-white">Verify your email</h2>
                <p className="mt-2 text-sm leading-6 text-[#c1d0c0]">We’ll send you a secure verification link before your response can be submitted.</p>
                <label className="mt-4 block text-sm font-semibold">Your email address<input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="mt-2 block w-full rounded-xl border border-white/15 bg-[#071b10] px-4 py-3 text-white outline-none focus:border-[#dfbd58]" /></label>
                <button disabled={busy} className="cdc-gold-button mt-4 disabled:opacity-60">{busy ? "Sending…" : emailSent ? "Resend verification link" : "Send verification link"}</button>
              </form>
            )}
            {verifiedEmail && invitation.open && invitation.categories.some((item) => item.response === "pending") && !submitted && (
              <form onSubmit={submitResponse} className="mt-7">
                <p className="text-sm text-emerald-200">Email verified: {verifiedEmail}</p>
                <button disabled={busy || invitation.categories.some((item) => item.response === "pending" && !choices[item.category])} className="cdc-gold-button mt-4 w-full disabled:cursor-not-allowed disabled:opacity-50">{busy ? "Submitting…" : "Submit my responses"}</button>
              </form>
            )}
            {message && <p role="status" className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-[#d4dfd4]">{message}</p>}
          </>
        )}
        <p className="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-[#9faf9f]">Responses close at midnight after Sunday, 25 October 2026. Only accepted nominees from the approved shortlist will be published.</p>
      </section>
    </main>
  );
}
