"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type TournamentStatus = "Draft" | "Open" | "Closed" | "Completed";
type GenderRestriction = "All" | "Male" | "Female";

type TournamentForm = {
  tournament_name: string;
  organiser_name: string;
  description: string;
  start_date: string;
  end_date: string;
  venue: string;
  province: string;
  registration_open_date: string;
  registration_close_date: string;
  registration_status: TournamentStatus;
  entry_fee: string;
  poster_image_url: string;
  payment_details: string;
};

type SectionForm = {
  id?: string;
  section_name: string;
  minimum_birth_year: string;
  maximum_birth_year: string;
  minimum_rating: string;
  maximum_rating: string;
  gender_restriction: GenderRestriction;
  entry_fee_override: string;
  maximum_players: string;
};

const emptyForm: TournamentForm = {
  tournament_name: "",
  organiser_name: "",
  description: "",
  start_date: "",
  end_date: "",
  venue: "",
  province: "Limpopo",
  registration_open_date: "",
  registration_close_date: "",
  registration_status: "Draft",
  entry_fee: "0",
  poster_image_url: "",
  payment_details: "",
};

const statusOptions: TournamentStatus[] = ["Draft", "Closed", "Open", "Completed"];

const provinces = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "Northern Cape",
  "North West",
  "Western Cape",
];

const quickSectionTemplates: SectionForm[] = [
  { section_name: "U8", minimum_birth_year: "2019", maximum_birth_year: "", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U10", minimum_birth_year: "2017", maximum_birth_year: "2018", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U12", minimum_birth_year: "2015", maximum_birth_year: "2016", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U14", minimum_birth_year: "2013", maximum_birth_year: "2014", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U16", minimum_birth_year: "2011", maximum_birth_year: "2012", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U18", minimum_birth_year: "2009", maximum_birth_year: "2010", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U20", minimum_birth_year: "2007", maximum_birth_year: "2008", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "Open", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U1800", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "1799", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U1600", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "1599", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U1400", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "1399", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "U1200", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "1199", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
  { section_name: "Ladies", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "", gender_restriction: "Female", entry_fee_override: "", maximum_players: "" },
  { section_name: "Custom", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "" },
];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function cleanMoney(value: string) {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
}

function cleanOptionalNumber(value: string) {
  if (value.trim() === "") return null;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function createBlankSection(): SectionForm {
  return {
    section_name: "",
    minimum_birth_year: "",
    maximum_birth_year: "",
    minimum_rating: "",
    maximum_rating: "",
    gender_restriction: "All",
    entry_fee_override: "",
    maximum_players: "",
  };
}

export default function NewTournamentPage() {
  const router = useRouter();

  const [form, setForm] = useState<TournamentForm>(emptyForm);
  const [sections, setSections] = useState<SectionForm[]>([createBlankSection()]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);

  function updateField(field: keyof TournamentForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateSection(index: number, field: keyof SectionForm, value: string) {
    setSections((current) =>
      current.map((section, sectionIndex) =>
        sectionIndex === index ? { ...section, [field]: value } : section
      )
    );
  }

  function addBlankSection() {
    setSections((current) => [...current, createBlankSection()]);
  }

  function addQuickSection(template: SectionForm) {
    const alreadyExists = sections.some(
      (section) =>
        section.section_name.trim().toLowerCase() ===
        template.section_name.trim().toLowerCase()
    );

    if (alreadyExists) {
      setMessage(`${template.section_name} already exists in this tournament.`);
      return;
    }

    setSections((current) => [...current, { ...template }]);
  }

  function removeSection(index: number) {
    setSections((current) =>
      current.length === 1
        ? [createBlankSection()]
        : current.filter((_, sectionIndex) => sectionIndex !== index)
    );
  }

  async function handlePosterUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPoster(true);
    setMessage("Uploading poster...");

    const safeName = cleanFileName(file.name);
    const filePath = `posters/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("tournament-posters")
      .upload(filePath, file, { upsert: false });

    if (error) {
      setMessage(`Poster upload failed: ${error.message}`);
      setUploadingPoster(false);
      return;
    }

    const { data } = supabase.storage
      .from("tournament-posters")
      .getPublicUrl(filePath);

    updateField("poster_image_url", data.publicUrl);
    setMessage("Poster uploaded successfully.");
    setUploadingPoster(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setMessage("");

    if (!form.tournament_name.trim() || !form.start_date || !form.venue.trim()) {
      setMessage("Tournament name, start date and venue are required.");
      setSaving(false);
      return;
    }

    const cleanedSections = sections
      .map((section) => ({
        ...section,
        section_name: section.section_name.trim(),
      }))
      .filter((section) => section.section_name.length > 0);

    if (cleanedSections.length === 0) {
      setMessage("Add at least one tournament section.");
      setSaving(false);
      return;
    }

    const registrationOpenDate = form.registration_open_date || form.start_date;
    const registrationCloseDate = form.registration_close_date || form.start_date;

    const { data, error } = await supabase
      .from("tournaments")
      .insert({
        tournament_name: form.tournament_name.trim(),
        organiser_name: form.organiser_name.trim() || null,
        description: form.description.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date || form.start_date,
        venue: form.venue.trim(),
        province: form.province || null,
        registration_open_date: registrationOpenDate,
        registration_close_date: registrationCloseDate,
        registration_status: form.registration_status,
        entry_fee: cleanMoney(form.entry_fee),
        poster_image_url: form.poster_image_url.trim() || null,
        payment_details: form.payment_details.trim() || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      setMessage(`Could not create tournament: ${error?.message ?? "Unknown error"}`);
      setSaving(false);
      return;
    }

    const sectionRows = cleanedSections.map((section) => ({
      tournament_id: data.id,
      section_name: section.section_name,
      minimum_birth_year: cleanOptionalNumber(section.minimum_birth_year),
      maximum_birth_year: cleanOptionalNumber(section.maximum_birth_year),
      minimum_rating: cleanOptionalNumber(section.minimum_rating),
      maximum_rating: cleanOptionalNumber(section.maximum_rating),
      gender_restriction: section.gender_restriction,
      entry_fee_override: cleanOptionalNumber(section.entry_fee_override),
      maximum_players: cleanOptionalNumber(section.maximum_players),
    }));

    const { error: sectionError } = await supabase
      .from("tournament_sections")
      .insert(sectionRows);

    if (sectionError) {
      setMessage(
        `Tournament was created, but sections could not be saved: ${sectionError.message}`
      );
      setSaving(false);
      return;
    }

    router.push(`/admin/tournaments/${data.id}/edit`);
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/tournaments"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Tournament Management
          </Link>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            New Tournament
          </p>

          <h1 className="mt-3 text-4xl font-bold">Create Tournament</h1>

          <form
            onSubmit={handleSubmit}
            className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-zinc-900 p-6"
          >

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Tournament name
                </label>
                <input
                  value={form.tournament_name}
                  onChange={(event) =>
                    updateField("tournament_name", event.target.value)
                  }
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Organiser / Host
                </label>
                <input
                  value={form.organiser_name}
                  onChange={(event) =>
                    updateField("organiser_name", event.target.value)
                  }
                  placeholder="Polokwane Chess Club, Capricorn District Chess, etc."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Venue</label>
                <input
                  value={form.venue}
                  onChange={(event) => updateField("venue", event.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Start date</label>
                <input
                  type="date"
                  value={form.start_date}
                  onChange={(event) => updateField("start_date", event.target.value)}
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">End date</label>
                <input
                  type="date"
                  value={form.end_date}
                  onChange={(event) => updateField("end_date", event.target.value)}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Province</label>
                <select
                  value={form.province}
                  onChange={(event) => updateField("province", event.target.value)}
                  className={inputClass}
                >
                  {provinces.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Status</label>
                <select
                  value={form.registration_status}
                  onChange={(event) =>
                    updateField(
                      "registration_status",
                      event.target.value as TournamentStatus
                    )
                  }
                  className={inputClass}
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Registration opens
                </label>
                <input
                  type="date"
                  value={form.registration_open_date}
                  onChange={(event) =>
                    updateField("registration_open_date", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Registration closes
                </label>
                <input
                  type="date"
                  value={form.registration_close_date}
                  onChange={(event) =>
                    updateField("registration_close_date", event.target.value)
                  }
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Entry fee</label>
                <input
                  type="number"
                  min="0"
                  value={form.entry_fee}
                  onChange={(event) => updateField("entry_fee", event.target.value)}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Upload poster
                </label>
                <input
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp"
                  onChange={handlePosterUpload}
                  disabled={uploadingPoster}
                  className="block w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Poster image URL
                </label>
                <input
                  value={form.poster_image_url}
                  onChange={(event) =>
                    updateField("poster_image_url", event.target.value)
                  }
                  placeholder="/images/tournaments/poster.jpg or uploaded URL"
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Payment details
                </label>
                <textarea
                  value={form.payment_details}
                  onChange={(event) =>
                    updateField("payment_details", event.target.value)
                  }
                  rows={3}
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">Description</label>
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateField("description", event.target.value)
                  }
                  rows={5}
                  className={inputClass}
                />
              </div>
            </div>

            <section className="rounded-2xl border border-white/10 bg-zinc-950 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Tournament Sections
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">Sections</h2>
                  <p className="mt-2 text-sm text-gray-400">
                    Junior sections usually use birth year. Open sections can
                    use rating bands, or both age and rating when needed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={addBlankSection}
                  className="rounded-lg bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  + Add Section
                </button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {quickSectionTemplates.map((template) => (
                  <button
                    key={template.section_name}
                    type="button"
                    onClick={() => addQuickSection(template)}
                    className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-gray-300 transition hover:border-red-500 hover:text-white"
                  >
                    + {template.section_name}
                  </button>
                ))}
              </div>

              <div className="mt-6 space-y-4">
                {sections.map((section, index) => (
                  <div
                    key={section.id ?? index}
                    className="rounded-xl border border-white/10 bg-zinc-900 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="font-bold">
                        Section {index + 1}
                        {section.section_name ? `  -  ${section.section_name}` : ""}
                      </h3>

                      <button
                        type="button"
                        onClick={() => removeSection(index)}
                        className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <div className="md:col-span-3">
                        <label className="mb-2 block text-sm font-semibold">
                          Section name
                        </label>
                        <input
                          value={section.section_name}
                          onChange={(event) =>
                            updateSection(index, "section_name", event.target.value)
                          }
                          placeholder="U14, Open, Ladies, Custom..."
                          className={inputClass}
                        />
                      </div>

                      <div className="rounded-xl border border-white/10 bg-zinc-950 p-3 md:col-span-2">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                          Age / junior eligibility
                        </p>
                        <label className="mb-2 block text-sm font-semibold">
                          Born from
                        </label>
                        <input
                          type="number"
                          min="1900"
                          max="2100"
                          value={section.minimum_birth_year}
                          onChange={(event) =>
                            updateSection(
                              index,
                              "minimum_birth_year",
                              event.target.value
                            )
                          }
                          placeholder="e.g. 2013"
                          className={inputClass}
                        />
                      </div>

                      <div className="rounded-xl border border-white/10 bg-zinc-950 p-3 md:col-span-2">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                          Age / junior eligibility
                        </p>
                        <label className="mb-2 block text-sm font-semibold">
                          Born until
                        </label>
                        <input
                          type="number"
                          min="1900"
                          max="2100"
                          value={section.maximum_birth_year}
                          onChange={(event) =>
                            updateSection(
                              index,
                              "maximum_birth_year",
                              event.target.value
                            )
                          }
                          placeholder="e.g. 2014"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Minimum rating
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={section.minimum_rating}
                          onChange={(event) =>
                            updateSection(index, "minimum_rating", event.target.value)
                          }
                          placeholder="e.g. 1200"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Maximum rating
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={section.maximum_rating}
                          onChange={(event) =>
                            updateSection(index, "maximum_rating", event.target.value)
                          }
                          placeholder="e.g. 1599"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Gender
                        </label>
                        <select
                          value={section.gender_restriction}
                          onChange={(event) =>
                            updateSection(
                              index,
                              "gender_restriction",
                              event.target.value
                            )
                          }
                          className={inputClass}
                        >
                          <option value="All">All</option>
                          <option value="Male">Male only</option>
                          <option value="Female">Female only</option>
                        </select>
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Entry fee override
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={section.entry_fee_override}
                          onChange={(event) =>
                            updateSection(
                              index,
                              "entry_fee_override",
                              event.target.value
                            )
                          }
                          placeholder="Leave blank to use tournament fee"
                          className={inputClass}
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold">
                          Maximum players
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={section.maximum_players}
                          onChange={(event) =>
                            updateSection(index, "maximum_players", event.target.value)
                          }
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {message && (
              <p className="rounded-lg border border-white/10 bg-zinc-950 p-4 text-sm text-gray-300">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={saving || uploadingPoster}
              className="w-full rounded-lg bg-red-600 px-5 py-4 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Creating tournament..." : "Create Tournament"}
            </button>
          </form>
        </div>
      </main>
    </AdminGuard>
  );
}

