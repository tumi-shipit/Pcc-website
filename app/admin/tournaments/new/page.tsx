"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import {
  tournamentRatingOptions,
  type TournamentRatingType,
} from "@/lib/ratingTypes";
import { resizeImageForUpload } from "@/lib/imageCompression";
import { supabase } from "@/lib/supabase";
import {
  teamStandingsBasisForTournamentType,
  type TournamentType,
} from "@/lib/tournamentStandings";

type TournamentStatus = "Draft" | "Open" | "Closed" | "Postponed" | "Completed";
type GenderRestriction = "All" | "Male" | "Female";

type TournamentForm = {
  tournament_name: string;
  organiser_name: string;
  description: string;
  tournament_report: string;
  postponement_reason: string;
  chess_results_url: string;
  start_date: string;
  end_date: string;
  venue: string;
  province: string;
  registration_open_date: string;
  registration_close_date: string;
  registration_status: TournamentStatus;
  tournament_type: TournamentType;
  rating_type: TournamentRatingType;
  entry_fee: string;
  poster_image_url: string;
  competition_document_url: string;
  competition_document_label: string;
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
  chess_results_url: string;
};

type RatingImportSummary = {
  id: string;
  file_name: string | null;
  imported_at: string;
  imported_count: number | null;
};

const emptyForm: TournamentForm = {
  tournament_name: "",
  organiser_name: "",
  description: "",
  tournament_report: "",
  postponement_reason: "",
  chess_results_url: "",
  start_date: "",
  end_date: "",
  venue: "",
  province: "Limpopo",
  registration_open_date: "",
  registration_close_date: "",
  registration_status: "Draft",
  tournament_type: "Club",
  rating_type: "standard",
  entry_fee: "0",
  poster_image_url: "",
  competition_document_url: "",
  competition_document_label: "",
  payment_details: "",
};

const statusOptions: TournamentStatus[] = [
  "Draft",
  "Closed",
  "Open",
  "Postponed",
  "Completed",
];

const postponementReasonOptions = [
  { label: "Select a reason", value: "" },
  { label: "Not enough registrations", value: "not enough registrations" },
  {
    label: "Circumstances beyond organisers",
    value: "circumstances beyond the organisers",
  },
  { label: "Venue unavailable", value: "venue availability issues" },
  { label: "Date clash", value: "a date clash" },
  { label: "Weather or safety concerns", value: "weather or safety concerns" },
  { label: "Other reason", value: "__custom__" },
];

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
  { section_name: "U8", minimum_birth_year: "2019", maximum_birth_year: "", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U10", minimum_birth_year: "2017", maximum_birth_year: "2018", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U12", minimum_birth_year: "2015", maximum_birth_year: "2016", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U14", minimum_birth_year: "2013", maximum_birth_year: "2014", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U16", minimum_birth_year: "2011", maximum_birth_year: "2012", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U18", minimum_birth_year: "2009", maximum_birth_year: "2010", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U20", minimum_birth_year: "2007", maximum_birth_year: "2008", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "Open", minimum_birth_year: "1900", maximum_birth_year: "", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U1800", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "1799", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U1600", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "1599", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U1400", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "1399", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "U1200", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "1199", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "Ladies", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "", gender_restriction: "Female", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
  { section_name: "Custom", minimum_birth_year: "", maximum_birth_year: "", minimum_rating: "", maximum_rating: "", gender_restriction: "All", entry_fee_override: "", maximum_players: "", chess_results_url: "" },
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

function hasSectionRestriction(section: SectionForm) {
  return Boolean(
    section.minimum_birth_year.trim() ||
      section.maximum_birth_year.trim() ||
      section.minimum_rating.trim() ||
      section.maximum_rating.trim() ||
      section.gender_restriction !== "All"
  );
}

function getMissingRestrictionMessage(sections: SectionForm[]) {
  const sectionIndex = sections.findIndex((section) => !hasSectionRestriction(section));
  if (sectionIndex === -1) return "";

  const section = sections[sectionIndex];
  return `Section ${sectionIndex + 1}${
    section.section_name ? ` (${section.section_name})` : ""
  } needs at least one rule: birth year, rating, or gender.`;
}

function selectedPostponementReason(value: string) {
  if (!value) return "";

  return postponementReasonOptions.some((option) => option.value === value)
    ? value
    : "__custom__";
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
    chess_results_url: "",
  };
}

export default function NewTournamentPage() {
  const router = useRouter();

  const [form, setForm] = useState<TournamentForm>(emptyForm);
  const [sections, setSections] = useState<SectionForm[]>([createBlankSection()]);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingCompetitionDocument, setUploadingCompetitionDocument] =
    useState(false);
  const [latestRatingImport, setLatestRatingImport] =
    useState<RatingImportSummary | null>(null);
  const [loadingRatingImport, setLoadingRatingImport] = useState(false);

  useEffect(() => {
    async function loadLatestRatingImport() {
      setLoadingRatingImport(true);
      setLatestRatingImport(null);

      const { data, error } = await supabase
        .from("rating_imports")
        .select("id, file_name, imported_at, imported_count")
        .eq("rating_type", form.rating_type)
        .eq("import_status", "Completed")
        .order("imported_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        setLatestRatingImport(null);
      } else {
        setLatestRatingImport((data as RatingImportSummary | null) ?? null);
      }

      setLoadingRatingImport(false);
    }

    loadLatestRatingImport();
  }, [form.rating_type]);

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

  function moveSection(index: number, direction: "up" | "down") {
    setSections((current) => {
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;

      const next = [...current];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  }

  async function handlePosterUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingPoster(true);
    setMessage("Uploading poster...");

    let uploadFile = file;

    try {
      uploadFile = await resizeImageForUpload(file, {
        maxDimension: 1800,
        quality: 0.84,
      });
    } catch {
      uploadFile = file;
    }

    const safeName = cleanFileName(uploadFile.name);
    const filePath = `posters/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("tournament-posters")
      .upload(filePath, uploadFile, {
        upsert: false,
        contentType: uploadFile.type || "image/jpeg",
      });

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

  async function handleCompetitionDocumentUpload(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setMessage("Please upload a PDF file for the competition document.");
      return;
    }

    setUploadingCompetitionDocument(true);
    setMessage("Uploading competition document...");

    const safeName = cleanFileName(file.name);
    const filePath = `documents/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("competition-documents")
      .upload(filePath, file, {
        upsert: false,
        contentType: "application/pdf",
      });

    if (error) {
      setMessage(
        error.message.toLowerCase().includes("bucket")
          ? "Competition document storage is not installed yet. Run database/tournament_competition_document_setup.sql, then upload again."
          : `Competition document upload failed: ${error.message}`
      );
      setUploadingCompetitionDocument(false);
      return;
    }

    const { data } = supabase.storage
      .from("competition-documents")
      .getPublicUrl(filePath);

    updateField("competition_document_url", data.publicUrl);
    if (!form.competition_document_label.trim()) {
      updateField("competition_document_label", "Competition document");
    }
    setMessage("Competition document uploaded successfully.");
    setUploadingCompetitionDocument(false);
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

    const missingRestrictionMessage = getMissingRestrictionMessage(cleanedSections);
    if (missingRestrictionMessage) {
      setMessage(missingRestrictionMessage);
      setSaving(false);
      return;
    }

    const registrationOpenDate = form.registration_open_date || form.start_date;
    const registrationCloseDate = form.registration_close_date || form.start_date;

    const tournamentPayload = {
      tournament_name: form.tournament_name.trim(),
      organiser_name: form.organiser_name.trim() || null,
      description: form.description.trim() || null,
      tournament_report: form.tournament_report.trim() || null,
      postponement_reason: form.postponement_reason.trim() || null,
      chess_results_url: form.chess_results_url.trim() || null,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
      venue: form.venue.trim(),
      province: form.province || null,
      registration_open_date: registrationOpenDate,
      registration_close_date: registrationCloseDate,
      registration_status: form.registration_status,
      tournament_type: form.tournament_type,
      team_standings_basis: teamStandingsBasisForTournamentType(form.tournament_type),
      rating_type: form.rating_type,
      rating_import_id: latestRatingImport?.id ?? null,
      rating_list_locked_at: latestRatingImport ? new Date().toISOString() : null,
      entry_fee: cleanMoney(form.entry_fee),
      poster_image_url: form.poster_image_url.trim() || null,
      competition_document_url: form.competition_document_url.trim() || null,
      competition_document_label: form.competition_document_label.trim() || null,
      payment_details: form.payment_details.trim() || null,
    };

    let { data, error } = await supabase
      .from("tournaments")
      .insert(tournamentPayload)
      .select("id")
      .single();

    if (
      error &&
      (error.message.toLowerCase().includes("rating_type") ||
        error.message.toLowerCase().includes("rating_import_id") ||
        error.message.toLowerCase().includes("rating_list_locked_at") ||
        error.message.toLowerCase().includes("team_standings_basis") ||
        error.message.toLowerCase().includes("tournament_type") ||
        error.message.toLowerCase().includes("postponement_reason") ||
        error.message.toLowerCase().includes("competition_document"))
    ) {
      const {
        rating_type: _ratingType,
        rating_import_id: _ratingImportId,
        rating_list_locked_at: _ratingListLockedAt,
        team_standings_basis: _teamStandingsBasis,
        tournament_type: _tournamentType,
        postponement_reason: _postponementReason,
        competition_document_url: _competitionDocumentUrl,
        competition_document_label: _competitionDocumentLabel,
        ...legacyPayload
      } = tournamentPayload;
      const retry = await supabase
        .from("tournaments")
        .insert(legacyPayload)
        .select("id")
        .single();

      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      const errorMessage = error?.message ?? "Unknown error";
      setMessage(
        errorMessage.toLowerCase().includes("competition_document")
          ? "Competition document fields are not installed yet. Run database/tournament_competition_document_setup.sql, then save again."
          : `Could not create tournament: ${errorMessage}`
      );
      setSaving(false);
      return;
    }

    const sectionRows = cleanedSections.map((section, index) => ({
      tournament_id: data.id,
      section_name: section.section_name,
      minimum_birth_year: cleanOptionalNumber(section.minimum_birth_year),
      maximum_birth_year: cleanOptionalNumber(section.maximum_birth_year),
      minimum_rating: cleanOptionalNumber(section.minimum_rating),
      maximum_rating: cleanOptionalNumber(section.maximum_rating),
      gender_restriction: section.gender_restriction,
      entry_fee_override: cleanOptionalNumber(section.entry_fee_override),
      maximum_players: cleanOptionalNumber(section.maximum_players),
      chess_results_url: section.chess_results_url.trim() || null,
      display_order: index + 1,
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
                  Rating list
                </label>
                <select
                  value={form.rating_type}
                  onChange={(event) =>
                    updateField(
                      "rating_type",
                      event.target.value as TournamentRatingType
                    )
                  }
                  className={inputClass}
                >
                  {tournamentRatingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  New tournaments lock to the newest saved rating file for the
                  selected type. Completed tournaments do not refresh
                  automatically.
                </p>
                <p className="mt-2 rounded-lg border border-white/10 bg-zinc-950 p-3 text-xs leading-5 text-gray-400">
                  {loadingRatingImport
                    ? "Checking latest saved rating list..."
                    : latestRatingImport
                      ? `Will lock to: ${
                          latestRatingImport.file_name ?? "Saved rating list"
                        } (${latestRatingImport.imported_count ?? 0} players)`
                      : "No saved rating list found yet for this type."}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">Tournament type</label>
                <select
                  value={form.tournament_type}
                  onChange={(event) =>
                    updateField(
                      "tournament_type",
                      event.target.value as TournamentType
                    )
                  }
                  className={inputClass}
                >
                  <option value="Club">Club</option>
                  <option value="District">District</option>
                  <option value="Provincial">Provincial</option>
                  <option value="National">National</option>
                  <option value="Organisation / School">Organisation / School</option>
                </select>
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  National events group team points by South African province. Every
                  other type groups them by the player&apos;s registered Club/City.
                </p>
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
                <label className="mb-2 block text-sm font-semibold">
                  Default entry fee
                </label>
                <p className="mb-2 text-xs leading-5 text-gray-500">
                  Used when a section does not have its own fee.
                </p>
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
                  Chess-Results link
                </label>
                <input
                  type="url"
                  value={form.chess_results_url}
                  onChange={(event) =>
                    updateField("chess_results_url", event.target.value)
                  }
                  placeholder="https://chess-results.com/..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Competition document link
                </label>
                <p className="mb-2 text-xs leading-5 text-gray-500">
                  Paste a PDF, Google Drive file, prospectus, rules pack or
                  invitation link shown in the tournament hero.
                </p>
                <input
                  type="url"
                  value={form.competition_document_url}
                  onChange={(event) =>
                    updateField("competition_document_url", event.target.value)
                  }
                  placeholder="https://..."
                  className={inputClass}
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Upload competition PDF
                </label>
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handleCompetitionDocumentUpload}
                  disabled={uploadingCompetitionDocument}
                  className="block w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-white file:px-4 file:py-2 file:font-semibold file:text-zinc-950 disabled:opacity-60"
                />
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  Uploading a PDF fills the document link automatically.
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Competition document button text
                </label>
                <input
                  value={form.competition_document_label}
                  onChange={(event) =>
                    updateField("competition_document_label", event.target.value)
                  }
                  placeholder="Competition document"
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
                <label className="mb-2 block text-sm font-semibold">
                  Postponement reason
                </label>
                <select
                  value={selectedPostponementReason(form.postponement_reason)}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateField(
                      "postponement_reason",
                      value === "__custom__" ? "" : value
                    );
                  }}
                  className={inputClass}
                >
                  {postponementReasonOptions.map((option) => (
                    <option key={option.value || "blank"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <textarea
                  value={form.postponement_reason}
                  onChange={(event) =>
                    updateField("postponement_reason", event.target.value)
                  }
                  className={`${inputClass} mt-3`}
                  rows={3}
                  placeholder="Write a custom reason or edit the selected reason..."
                />
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  This appears on the public page only when the status is
                  Postponed.
                </p>
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

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Tournament report
                </label>
                <textarea
                  value={form.tournament_report}
                  onChange={(event) =>
                    updateField("tournament_report", event.target.value)
                  }
                  rows={8}
                  placeholder="Write the public event report, highlights, winners and closing notes."
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
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="font-bold">
                        Section {index + 1}
                        {section.section_name ? `  -  ${section.section_name}` : ""}
                      </h3>

                      <div className="grid grid-cols-3 gap-2 sm:w-auto">
                        <button
                          type="button"
                          onClick={() => moveSection(index, "up")}
                          disabled={index === 0}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-red-500 disabled:opacity-30"
                        >
                          Up
                        </button>

                        <button
                          type="button"
                          onClick={() => moveSection(index, "down")}
                          disabled={index === sections.length - 1}
                          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-white transition hover:border-red-500 disabled:opacity-30"
                        >
                          Down
                        </button>

                        <button
                          type="button"
                          onClick={() => removeSection(index)}
                          className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10"
                        >
                          Remove
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-4">
                      <div className="md:col-span-2">
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
                          Allowed birth years
                        </p>
                        <label className="mb-2 block text-sm font-semibold">
                          Born from
                        </label>
                        <p className="mb-2 text-xs leading-5 text-gray-500">
                          Example: born from 1969 and born until 2026 means players born in 1969 up to 2026 can enter.
                        </p>
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

                      <div className="md:col-span-2">
                        <label className="mb-2 block text-sm font-semibold">
                          Section Chess-Results link
                        </label>
                        <input
                          type="url"
                          value={section.chess_results_url}
                          onChange={(event) =>
                            updateSection(
                              index,
                              "chess_results_url",
                              event.target.value
                            )
                          }
                          placeholder="https://chess-results.com/..."
                          className={inputClass}
                        />
                      </div>

                      <div className="rounded-xl border border-white/10 bg-zinc-950 p-3 md:col-span-2">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                          Allowed birth years
                        </p>
                        <label className="mb-2 block text-sm font-semibold">
                          Born until
                        </label>
                        <p className="mb-2 text-xs leading-5 text-gray-500">
                          Leave blank when there is no oldest or youngest birth-year limit.
                        </p>
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

                      <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                          Allowed rating
                        </p>
                        <label className="mb-2 block text-sm font-semibold">
                          Rated from
                        </label>
                        <p className="mb-2 text-xs leading-5 text-gray-500">
                          Example: rated from 1300 and rated until 1500 means only rated players from 1300 to 1500 are allowed.
                        </p>
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

                      <div className="rounded-xl border border-white/10 bg-zinc-950 p-3">
                        <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-red-300">
                          Allowed rating
                        </p>
                        <label className="mb-2 block text-sm font-semibold">
                          Rated until
                        </label>
                        <p className="mb-2 text-xs leading-5 text-gray-500">
                          Players not found in the rating file can still register as new or unrated players.
                        </p>
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
                          Section entry fee
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
                          placeholder="Leave blank to use the default fee"
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

