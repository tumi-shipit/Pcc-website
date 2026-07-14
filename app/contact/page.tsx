"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

const whatsappNumber = "27728787894";

const contactReasons = [
  "Membership enquiry",
  "Tournament registration help",
  "Player profile correction",
  "Organiser access help",
  "News, media or history",
  "General enquiry",
];

const quickActions = [
  {
    title: "Join PCC",
    detail: "Membership, junior players, school enquiries and weekly club activity.",
    label: "Start membership chat",
    message:
      "Hi Polokwane Chess Club. I would like to become a member. My name is: ",
  },
  {
    title: "Tournament Help",
    detail: "Entry changes, payment questions, section queries or registration issues.",
    label: "Ask about a tournament",
    message:
      "Hi Polokwane Chess Club. I need help with a tournament entry. Tournament: Player name: Issue: ",
  },
  {
    title: "Profile Correction",
    detail: "Fix a name, Chess SA ID, club, rating, gender, date of birth or profile record.",
    label: "Send profile correction",
    message:
      "Hi Polokwane Chess Club. I want to correct a player profile. Player name: Chess SA ID: Correction needed: ",
  },
  {
    title: "Organiser Access",
    detail: "For organisers who need help accessing their assigned tournament entries.",
    label: "Get organiser support",
    message:
      "Hi Polokwane Chess Club. I need help with organiser access. Tournament: Email used to login: Issue: ",
  },
];

function whatsappLink(message: string) {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}

export default function ContactPage() {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [reason, setReason] = useState(contactReasons[0]);
  const [chessSaId, setChessSaId] = useState("");
  const [tournament, setTournament] = useState("");
  const [message, setMessage] = useState("");

  const preparedMessage = useMemo(() => {
    return [
      "Hi Polokwane Chess Club.",
      "",
      `Reason: ${reason}`,
      `Name: ${name || ""}`,
      `Contact: ${contact || ""}`,
      `Chess SA ID: ${chessSaId || "Not provided"}`,
      `Tournament: ${tournament || "Not provided"}`,
      "",
      `Message: ${message || ""}`,
    ].join("\n");
  }, [chessSaId, contact, message, name, reason, tournament]);

  function submitToWhatsapp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.open(whatsappLink(preparedMessage), "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <section className="mx-auto max-w-7xl border-b border-white/10 pb-10">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
            Contact PCC
          </p>
          <div className="mt-3 grid gap-8 lg:grid-cols-[1fr_420px] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-6xl">
                Contact Polokwane Chess Club
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-zinc-300 md:text-base">
                Choose the route that matches what you need. For tournament
                entry issues, include the player name and tournament. For player
                profile corrections, include the Chess SA ID where possible.
              </p>
            </div>

            <aside className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <p className="text-sm font-bold text-white">Recommended Contact Method</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Urgent tournament matters should go through WhatsApp. Profile,
                history and media corrections can be sent with the guided form.
              </p>
              <a
                href={whatsappLink("Hi Polokwane Chess Club. I need assistance.")}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 block rounded-xl bg-green-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:bg-green-700"
              >
                WhatsApp PCC
              </a>
            </aside>
          </div>
        </section>

        <section className="mx-auto mt-8 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickActions.map((action) => (
            <a
              key={action.title}
              href={whatsappLink(action.message)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-white/10 bg-zinc-900 p-5 transition hover:-translate-y-1 hover:border-red-500"
            >
              <p className="text-xl font-black text-white">{action.title}</p>
              <p className="mt-3 min-h-[72px] text-sm leading-6 text-zinc-400">
                {action.detail}
              </p>
              <p className="mt-5 rounded-lg bg-zinc-950 px-4 py-3 text-center text-sm font-bold text-red-200">
                {action.label}
              </p>
            </a>
          ))}
        </section>

        <section className="mx-auto mt-10 grid max-w-7xl gap-8 lg:grid-cols-[1fr_420px]">
          <form
            onSubmit={submitToWhatsapp}
            className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6"
          >
            <h2 className="text-2xl font-black">Prepare a message</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Fill this in and PCC will receive a clear WhatsApp message with
              the important details already included.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-sm font-semibold text-zinc-200">Name</span>
                <input
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-zinc-200">
                  Email or phone
                </span>
                <input
                  required
                  value={contact}
                  onChange={(event) => setContact(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-zinc-200">Reason</span>
                <select
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                >
                  {contactReasons.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-zinc-200">
                  Chess SA ID
                </span>
                <input
                  value={chessSaId}
                  onChange={(event) => setChessSaId(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-zinc-200">
                  Tournament
                </span>
                <input
                  value={tournament}
                  onChange={(event) => setTournament(event.target.value)}
                  placeholder="Optional"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                />
              </label>

              <label className="block md:col-span-2">
                <span className="text-sm font-semibold text-zinc-200">Message</span>
                <textarea
                  required
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  rows={5}
                  className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                />
              </label>
            </div>

            <button
              type="submit"
              className="mt-6 w-full rounded-xl bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700"
            >
              Send through WhatsApp
            </button>
          </form>

          <aside className="space-y-4">
            <InfoPanel
              title="For tournament entries"
              text="Send the player name, tournament name, section and what needs to change. If payment is involved, mention whether proof was uploaded."
            />
            <InfoPanel
              title="For player corrections"
              text="Include the current public profile name, Chess SA ID if known, and the exact correction needed."
            />
            <InfoPanel
              title="For schools and parents"
              text="Include the learner name, age, school, parent or guardian contact, and whether the player already has a Chess SA ID."
            />
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <p className="text-sm font-bold text-white">Location</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                Polokwane, Limpopo
              </p>
              <Link
                href="/organisers"
                className="mt-4 block rounded-lg border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
              >
                Organiser portal help
              </Link>
            </div>
          </aside>
        </section>
      </main>
    </>
  );
}

function InfoPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="font-black text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-zinc-400">{text}</p>
    </div>
  );
}
