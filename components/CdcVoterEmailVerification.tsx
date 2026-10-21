"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { cdcAwardsSiteUrl } from "@/lib/cdcAwards";

export default function CdcVoterEmailVerification() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user.email_confirmed_at) {
        setVerifiedEmail(session.user.email ?? "");
        setSentTo("");
        setMessage("Your email is verified. Voting details will appear here when the ballot is ready.");
        if (event === "SIGNED_IN" && window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
      }
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function sendVerificationLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return;

    setBusy(true);
    setMessage("");
    setSentTo("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo: `${cdcAwardsSiteUrl}/cdc-excellence-awards/vote`,
          shouldCreateUser: true,
        },
      });

      if (error) {
        setMessage(`We could not send the verification email: ${error.message}`);
        return;
      }
      setSentTo(cleanEmail);
      setMessage("Check your inbox and click the secure link to verify this email address.");
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "We could not send the verification email. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="cdc-awards min-h-screen bg-[#061b10] px-5 pb-16 pt-28 text-[#f7f4e9] md:pt-36">
      <section className="mx-auto max-w-2xl rounded-3xl border border-[#d3ad47]/30 bg-[#0a2617] p-6 shadow-2xl shadow-black/30 md:p-10">
        <p className="cdc-eyebrow">2nd CDC Excellence Awards · 2026</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold text-white">Verify your email to vote</h1>
        <p className="mt-4 leading-7 text-[#c1d0c0]">
          Enter the email address you will use for voting. We will send a secure link to that inbox. Open the link on this device to return here and confirm your email.
        </p>

        {verifiedEmail ? (
          <div className="mt-7 rounded-2xl border border-[#dfbd58]/25 bg-black/15 p-5">
            <p className="font-semibold text-[#e4c45e]">Email verified</p>
            <p className="mt-2 text-sm leading-6 text-[#d4dfd4]">{verifiedEmail}</p>
            <p className="mt-3 text-sm leading-6 text-[#c1d0c0]">{message}</p>
          </div>
        ) : (
          <form onSubmit={sendVerificationLink} className="mt-7 rounded-2xl border border-[#dfbd58]/20 bg-black/15 p-5">
            <label className="block text-sm font-semibold" htmlFor="voter-email">Email address</label>
            <input
              id="voter-email"
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 block w-full rounded-xl border border-white/15 bg-[#071b10] px-4 py-3 text-white outline-none focus:border-[#dfbd58]"
            />
            <button disabled={busy} className="cdc-gold-button mt-4 w-full disabled:cursor-wait disabled:opacity-60">
              {busy ? "Sending link…" : sentTo ? "Send another verification link" : "Email me a verification link"}
            </button>
            {sentTo && <p className="mt-3 text-xs leading-5 text-[#b6c5b5]">Sent to {sentTo}. If it is not in your inbox, check spam or request another link.</p>}
          </form>
        )}

        {message && !verifiedEmail && <p role="status" className="mt-5 rounded-xl border border-white/10 bg-black/20 p-4 text-sm leading-6 text-[#d4dfd4]">{message}</p>}
        <p className="mt-7 border-t border-white/10 pt-5 text-xs leading-5 text-[#9faf9f]">
          Email verification confirms access to the inbox. The voting ballot and voting dates will be published separately.
        </p>
      </section>
    </main>
  );
}
