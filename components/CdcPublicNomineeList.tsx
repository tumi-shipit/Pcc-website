"use client";

import { useEffect, useState } from "react";
import { publicSupabase } from "@/lib/publicSupabase";
import { cdcServiceAwardCategories } from "@/lib/cdcAwards";

type PublicNominee = {
  nominee_name: string;
  nominee_surname: string;
  category: string;
  school_club: string;
  created_at: string;
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

function uniqueNominees(rows: PublicNominee[]) {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.category}|${row.nominee_name.trim().replace(/\s+/g, " ").toLocaleLowerCase()}|${row.nominee_surname.trim().replace(/\s+/g, " ").toLocaleLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function displayCategory(category: string) {
  return category === "Upcoming Manager of the Year" ? "Upcoming Team Manager" : category;
}

export default function CdcPublicNomineeList() {
  const [visible, setVisible] = useState(false);
  const [rows, setRows] = useState<PublicNominee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function initialize() {
      const nowOpen = southAfricaDateKey() >= "2026-10-26";
      if (cancelled) return;
      setVisible(nowOpen);
      if (!nowOpen) {
        setLoading(false);
        return;
      }
      const { data, error: loadError } = await publicSupabase
        .from("cdc_excellence_nominations")
        .select("nominee_name, nominee_surname, category, school_club, created_at")
        .eq("eligibility_status", "eligible")
        .eq("acceptance_status", "accepted")
        .order("created_at", { ascending: true });
      if (cancelled) return;
      if (loadError) {
        setError(true);
      } else {
        setRows(uniqueNominees((data ?? []) as PublicNominee[]));
      }
      setLoading(false);
    }

    const timer = window.setTimeout(() => { void initialize(); }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  if (!visible) return null;
  const votingStarted = southAfricaDateKey() >= "2026-10-26";

  return (
    <section id="nominee-list" className="border-t border-[#d3ad47]/25 bg-[#071b10]">
      <div className="mx-auto max-w-7xl px-5 py-14 md:px-10 md:py-18">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="cdc-eyebrow">Published 26 October 2026</p>
            <h2 className="mt-3 font-serif text-3xl font-semibold md:text-4xl">Accepted 2026 Nominees</h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-[#bfccbf]">
            {votingStarted
              ? "Voting information and the closing date will be announced."
              : "These nominees were reviewed and accepted their nominations."}
          </p>
        </div>

        {loading ? (
          <p className="mt-7 text-sm text-[#bfccbf]">Loading the nominee list…</p>
        ) : error ? (
          <p role="alert" className="mt-7 rounded-xl border border-amber-200/20 bg-black/20 p-5 text-sm text-[#d8dfd5]">The nominee list is temporarily unavailable. Please check back soon.</p>
        ) : rows.length === 0 ? (
          <p className="mt-7 rounded-xl border border-white/10 bg-black/20 p-5 text-sm text-[#bfccbf]">No nominees have been submitted for public listing.</p>
        ) : (
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            {cdcServiceAwardCategories.map((category) => {
              const nominees = rows.filter((row) => row.category === category);
              if (nominees.length === 0) return null;
              return (
                <section key={category} className="cdc-category-panel">
                  <h3 className="font-serif text-xl font-semibold text-white">{displayCategory(category)}</h3>
                  <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                    {nominees.map((nominee, index) => (
                      <li key={`${nominee.nominee_name}-${nominee.nominee_surname}-${index}`} className="rounded-xl border border-white/[0.07] bg-black/15 px-4 py-3">
                        <p className="font-semibold text-[#f3f1e8]">{nominee.nominee_name} {nominee.nominee_surname}</p>
                        <p className="mt-1 text-xs text-[#b9c8b9]">{nominee.school_club}</p>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
