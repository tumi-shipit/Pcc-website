"use client";

import { useState } from "react";

export default function GoogleWalletButton({ verificationToken }: { verificationToken: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function addToWallet() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/membership/google-wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ verificationToken }),
      });
      const result = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !result.url) throw new Error(result.error || "Google Wallet could not be opened.");
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Google Wallet could not be opened.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => void addToWallet()}
        disabled={loading}
        className="rounded-xl bg-black px-5 py-3 text-sm font-black text-white disabled:cursor-wait disabled:opacity-60"
      >
        {loading ? "Opening Google Wallet…" : "Add to Google Wallet"}
      </button>
      {error && <p className="mt-2 max-w-sm text-xs font-semibold text-red-700">{error}</p>}
    </div>
  );
}
