"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import AdminTournamentTabs from "@/components/admin/AdminTournamentTabs";
import { formatCalendarDate } from "@/lib/dateHelpers";
import { supabase } from "@/lib/supabase";

type ProgrammeItem = {
  id: string;
  programme_date: string;
  start_time: string | null;
  end_time: string | null;
  title: string;
  location: string | null;
  notes: string | null;
  display_order: number;
  is_published: boolean;
};

type ProgrammeForm = {
  programme_date: string;
  start_time: string;
  end_time: string;
  title: string;
  location: string;
  notes: string;
  display_order: string;
  is_published: boolean;
};

const emptyForm: ProgrammeForm = {
  programme_date: "",
  start_time: "",
  end_time: "",
  title: "",
  location: "",
  notes: "",
  display_order: "0",
  is_published: true,
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500";

function programmeDate(value: string) {
  return formatCalendarDate(value, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function programmeTime(value: string | null) {
  return value ? value.slice(0, 5) : "Time TBA";
}

export default function TournamentProgrammeAdminPage() {
  const params = useParams();
  const tournamentId = String(params.id);
  const [tournamentName, setTournamentName] = useState("");
  const [items, setItems] = useState<ProgrammeItem[]>([]);
  const [form, setForm] = useState<ProgrammeForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function loadProgramme() {
    setLoading(true);
    const [{ data: tournamentData }, { data, error }] = await Promise.all([
      supabase
        .from("tournaments")
        .select("tournament_name, start_date")
        .eq("id", tournamentId)
        .single(),
      supabase
        .from("tournament_programme_items")
        .select("id, programme_date, start_time, end_time, title, location, notes, display_order, is_published")
        .eq("tournament_id", tournamentId)
        .order("programme_date")
        .order("start_time", { nullsFirst: false })
        .order("display_order"),
    ]);

    if (tournamentData) {
      setTournamentName(tournamentData.tournament_name);
      setForm((current) =>
        current.programme_date
          ? current
          : { ...current, programme_date: tournamentData.start_date }
      );
    }
    if (error) {
      setItems([]);
      setMessage(
        "Programme setup is not available yet. Run database/tournament_programme_setup.sql in Supabase, then refresh this page."
      );
    } else {
      setItems((data ?? []) as ProgrammeItem[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (tournamentId) void loadProgramme();
  }, [tournamentId]);

  function resetForm() {
    setEditingId(null);
    setForm((current) => ({
      ...emptyForm,
      programme_date: current.programme_date,
    }));
  }

  function editItem(item: ProgrammeItem) {
    setEditingId(item.id);
    setForm({
      programme_date: item.programme_date,
      start_time: item.start_time?.slice(0, 5) ?? "",
      end_time: item.end_time?.slice(0, 5) ?? "",
      title: item.title,
      location: item.location ?? "",
      notes: item.notes ?? "",
      display_order: String(item.display_order),
      is_published: item.is_published,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.programme_date || !form.title.trim()) {
      setMessage("Add a date and activity title before saving.");
      return;
    }
    setSaving(true);
    setMessage("");
    const payload = {
      tournament_id: tournamentId,
      programme_date: form.programme_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      title: form.title.trim(),
      location: form.location.trim() || null,
      notes: form.notes.trim() || null,
      display_order: Number(form.display_order) || 0,
      is_published: form.is_published,
      updated_at: new Date().toISOString(),
    };
    const { error } = editingId
      ? await supabase
          .from("tournament_programme_items")
          .update(payload)
          .eq("id", editingId)
      : await supabase.from("tournament_programme_items").insert(payload);

    if (error) {
      setMessage("Could not save programme item: " + error.message);
    } else {
      setMessage(editingId ? "Programme item updated." : "Programme item added.");
      resetForm();
      await loadProgramme();
    }
    setSaving(false);
  }

  async function deleteItem(item: ProgrammeItem) {
    if (!window.confirm('Remove "' + item.title + '" from the programme?')) return;
    const { error } = await supabase
      .from("tournament_programme_items")
      .delete()
      .eq("id", item.id);
    setMessage(error ? "Could not remove item: " + error.message : "Programme item removed.");
    if (!error) await loadProgramme();
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-24 text-white md:px-6">
        <div className="mx-auto max-w-6xl">
          <AdminTournamentTabs id={tournamentId} />
          <section className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Event programme
            </p>
            <h1 className="mt-3 text-3xl font-black">Schedule the event clearly</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
              Publish registration windows, round times, meetings, prize-giving and
              venue notices. Only published items appear on the public event hub.
            </p>
            {tournamentName && (
              <p className="mt-4 text-sm font-bold text-red-200">{tournamentName}</p>
            )}
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <form onSubmit={saveItem} className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
                    {editingId ? "Edit item" : "Add item"}
                  </p>
                  <h2 className="mt-2 text-xl font-black">Programme activity</h2>
                </div>
                {editingId && (
                  <button type="button" onClick={resetForm} className="text-sm font-bold text-gray-300 hover:text-white">
                    Cancel
                  </button>
                )}
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold">Date</span>
                  <input required type="date" value={form.programme_date} onChange={(event) => setForm((current) => ({ ...current, programme_date: event.target.value }))} className={inputClass} />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold">Display order</span>
                  <input type="number" min="0" value={form.display_order} onChange={(event) => setForm((current) => ({ ...current, display_order: event.target.value }))} className={inputClass} />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold">Activity</span>
                <input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Round 1, registration, prize-giving..." className={inputClass} />
              </label>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label>
                  <span className="mb-2 block text-sm font-semibold">Start time</span>
                  <input type="time" value={form.start_time} onChange={(event) => setForm((current) => ({ ...current, start_time: event.target.value }))} className={inputClass} />
                </label>
                <label>
                  <span className="mb-2 block text-sm font-semibold">End time</span>
                  <input type="time" value={form.end_time} onChange={(event) => setForm((current) => ({ ...current, end_time: event.target.value }))} className={inputClass} />
                </label>
              </div>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold">Location or room</span>
                <input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} placeholder="Main hall, venue foyer, online..." className={inputClass} />
              </label>
              <label className="mt-4 block">
                <span className="mb-2 block text-sm font-semibold">Participant note</span>
                <textarea value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} rows={3} placeholder="What participants need to know..." className={inputClass} />
              </label>
              <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 p-4">
                <input type="checkbox" checked={form.is_published} onChange={(event) => setForm((current) => ({ ...current, is_published: event.target.checked }))} className="h-5 w-5 accent-red-600" />
                <span className="text-sm font-semibold">Publish to the public event page</span>
              </label>
              <button type="submit" disabled={saving} className="mt-5 w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-black transition hover:bg-red-700 disabled:opacity-60">
                {saving ? "Saving..." : editingId ? "Save changes" : "Add programme item"}
              </button>
            </form>

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">Published plan</p>
                  <h2 className="mt-2 text-xl font-black">Programme items</h2>
                </div>
                <Link href={"/tournaments/" + tournamentId} className="w-fit text-sm font-bold text-red-300 hover:text-red-200">
                  Open public event page
                </Link>
              </div>
              {loading ? (
                <p className="mt-6 text-sm text-gray-400">Loading programme...</p>
              ) : items.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm leading-6 text-gray-400">
                  No programme items yet. Add the key moments participants need to plan for.
                </p>
              ) : (
                <div className="mt-6 space-y-3">
                  {items.map((item) => (
                    <article key={item.id} className="rounded-2xl border border-white/10 bg-zinc-950 p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-red-300">
                            {programmeDate(item.programme_date)} · {programmeTime(item.start_time)}
                            {item.end_time ? "–" + programmeTime(item.end_time) : ""}
                          </p>
                          <h3 className="mt-2 font-black text-white">{item.title}</h3>
                          {item.location && <p className="mt-1 text-sm text-gray-300">{item.location}</p>}
                          {item.notes && <p className="mt-2 text-sm leading-6 text-gray-400">{item.notes}</p>}
                        </div>
                        <span className={"w-fit rounded-full px-2.5 py-1 text-xs font-bold " + (item.is_published ? "bg-green-500/15 text-green-200" : "bg-zinc-800 text-gray-400")}>
                          {item.is_published ? "Public" : "Draft"}
                        </span>
                      </div>
                      <div className="mt-4 flex gap-4 text-sm font-bold">
                        <button type="button" onClick={() => editItem(item)} className="text-red-300">Edit</button>
                        <button type="button" onClick={() => void deleteItem(item)} className="text-gray-400 hover:text-red-200">Remove</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
          {message && <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">{message}</p>}
        </div>
      </main>
    </AdminGuard>
  );
}
