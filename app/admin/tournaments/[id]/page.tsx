"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  venue: string;
  province: string | null;
  registration_status: string;
  entry_fee: number;
  poster_image_url: string | null;
};

type TournamentStats = {
  tournament_id: string;
  total_registrations: number;
  approved_registrations: number;
  paid_registrations: number;
};

type SectionStat = {
  section_name: string;
  total: number;
};

type RegistrationSectionRow = {
  section_name: string | null;
};

type GalleryImage = {
  id: string;
  tournament_id: string;
  image_url: string;
  caption: string | null;
  display_order: number | null;
  created_at: string;
};

function formatDate(date: string | null) {
  if (!date) return "TBA";

  return new Date(date).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function isImageFile(file: File) {
  return /\.(jpg|jpeg|png|webp|heic|heif)$/i.test(file.name);
}

function isHeicFile(file: File) {
  return /\.(heic|heif)$/i.test(file.name);
}

function jpgFileName(name: string) {
  return name.replace(/\.(heic|heif)$/i, ".jpg");
}

async function convertHeicToJpeg(file: File) {
  const heic2any = (await import("heic2any")).default;

  const convertedBlob = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.88,
  });

  const jpegBlob = Array.isArray(convertedBlob)
    ? convertedBlob[0]
    : convertedBlob;

  return new File([jpegBlob], jpgFileName(file.name), {
    type: "image/jpeg",
    lastModified: Date.now(),
  });
}

export default function AdminTournamentDashboardPage() {
  const params = useParams();
  const tournamentId = String(params.id);

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [sectionStats, setSectionStats] = useState<SectionStat[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [galleryCaption, setGalleryCaption] = useState("");
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const unpaidCount = useMemo(() => {
    const approved = stats?.approved_registrations ?? 0;
    const paid = stats?.paid_registrations ?? 0;
    return Math.max(approved - paid, 0);
  }, [stats]);

  async function loadGallery() {
    const { data, error } = await supabase
      .from("tournament_gallery")
      .select("id, tournament_id, image_url, caption, display_order, created_at")
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(`Gallery could not be loaded: ${error.message}`);
      return;
    }

    setGallery((data ?? []) as GalleryImage[]);
  }

  useEffect(() => {
    async function loadTournamentDashboard() {
      setLoading(true);
      setMessage("");

      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select(
          "id, tournament_name, description, start_date, end_date, venue, province, registration_status, entry_fee, poster_image_url"
        )
        .eq("id", tournamentId)
        .single();

      if (tournamentError || !tournamentData) {
        setMessage("Tournament could not be loaded.");
        setLoading(false);
        return;
      }

      const { data: statsData } = await supabase
        .from("tournament_public_stats")
        .select("tournament_id, total_registrations, approved_registrations, paid_registrations")
        .eq("tournament_id", tournamentId)
        .single();

      const { data: registrationData } = await supabase
        .from("registration_details")
        .select("section_name")
        .eq("tournament_name", tournamentData.tournament_name);

      const groupedSections = ((registrationData ?? []) as RegistrationSectionRow[]).reduce<Record<string, number>>(
        (groups, item) => {
          const section = item.section_name ?? "No section";
          groups[section] = (groups[section] ?? 0) + 1;
          return groups;
        },
        {}
      );

      setTournament(tournamentData as Tournament);
      setStats((statsData ?? null) as TournamentStats | null);
      setSectionStats(
        Object.entries(groupedSections).map(([section_name, total]) => ({
          section_name,
          total: Number(total),
        }))
      );

      await loadGallery();
      setLoading(false);
    }

    if (tournamentId) loadTournamentDashboard();
  }, [tournamentId]);

  async function uploadGalleryFiles(files: File[]) {
    console.log("Upload function started:", files.length);

    const imageFiles = files.filter(isImageFile);

    console.log("Image files after filter:", imageFiles.length);
    setMessage(`Found ${imageFiles.length} image file(s). Uploading...`);

    if (imageFiles.length === 0) {
      setMessage("No image files were found in the selected folder.");
      return;
    }

    setUploadingGallery(true);
    setMessage("");
    setUploadProgress(`Preparing ${imageFiles.length} image(s)...`);

    let uploadedCount = 0;
    let failedCount = 0;

    for (let index = 0; index < imageFiles.length; index += 1) {
      const originalFile = imageFiles[index];

      let file = originalFile;

      if (isHeicFile(originalFile)) {
        setUploadProgress(
          `Converting ${index + 1} of ${imageFiles.length}: ${originalFile.name}`
        );

        try {
          file = await convertHeicToJpeg(originalFile);
        } catch (error) {
          console.error("HEIC CONVERSION ERROR:", error);
          failedCount += 1;
          continue;
        }
      }

      const safeName = cleanFileName(file.name);
      const relativePath =
        (originalFile as File & { webkitRelativePath?: string }).webkitRelativePath ??
        originalFile.name;

      const folderPart = relativePath
        .split("/")
        .slice(0, -1)
        .map(cleanFileName)
        .join("/");

      const filePath = folderPart
        ? `gallery/${tournamentId}/${folderPart}/${Date.now()}-${safeName}`
        : `gallery/${tournamentId}/${Date.now()}-${safeName}`;

      setUploadProgress(
        `Uploading ${index + 1} of ${imageFiles.length}: ${file.name}`
      );

      const { error: uploadError } = await supabase.storage
        .from("tournament-gallery")
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || "image/jpeg",
        });

      if (uploadError) {
        console.error("UPLOAD ERROR:", uploadError);
        setMessage(`Upload error: ${uploadError.message}`);
        failedCount += 1;
        continue;
      }

      const { data } = supabase.storage.from("tournament-gallery").getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("tournament_gallery").insert({
        tournament_id: tournamentId,
        image_url: data.publicUrl,
        caption: galleryCaption.trim() || null,
        display_order: gallery.length + uploadedCount + 1,
      });

      if (insertError) {
        console.error("DATABASE ERROR:", insertError);
        setMessage(`Database error: ${insertError.message}`);
        failedCount += 1;
        continue;
      }

      uploadedCount += 1;
    }

    await loadGallery();
    setGalleryCaption("");
    setUploadingGallery(false);
    setUploadProgress("");

    if (failedCount > 0) {
      setMessage(`Uploaded ${uploadedCount} image(s). ${failedCount} image(s) failed.`);
    } else {
      setMessage(`Uploaded ${uploadedCount} image(s) successfully.`);
    }
  }

 async function handleGalleryUpload(event: ChangeEvent<HTMLInputElement>) {
  const files = Array.from(event.target.files ?? []);

  console.log("Files selected:", files.length);

  setMessage(`Selected ${files.length} file(s). Starting upload...`);

  await uploadGalleryFiles(files);

  event.target.value = "";
}

  async function deleteGalleryImage(image: GalleryImage) {
    const confirmed = window.confirm("Delete this gallery image from the archive?");
    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase.from("tournament_gallery").delete().eq("id", image.id);

    if (error) {
      setMessage(`Could not delete gallery image: ${error.message}`);
      return;
    }

    await loadGallery();
    setMessage("Gallery image deleted.");
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
          Loading tournament dashboard...
        </div>
      </main>
    );
  }

  if (!tournament) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
          {message || "Tournament not found."}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
      <div className="mx-auto max-w-7xl">
        <Link href="/admin" className="text-sm font-semibold text-red-300 transition hover:text-red-200">
          ← Back to Admin Dashboard
        </Link>

        <div className="mt-6 grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-black">
            <div className="relative aspect-[3/4]">
              {tournament.poster_image_url ? (
                <Image
                  src={tournament.poster_image_url}
                  alt={`${tournament.tournament_name} poster`}
                  fill
                  sizes="320px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-gray-500">Poster coming soon</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">Tournament Dashboard</p>
            <h1 className="mt-3 text-3xl font-black leading-tight md:text-5xl">{tournament.tournament_name}</h1>

            <div className="mt-5 flex flex-wrap gap-3">
              <span className="rounded-full bg-zinc-800 px-4 py-2 text-sm font-semibold text-gray-200">
                {tournament.registration_status}
              </span>
              <span className="rounded-full bg-zinc-800 px-4 py-2 text-sm text-gray-300">
                {formatDate(tournament.start_date)}
              </span>
              <span className="rounded-full bg-zinc-800 px-4 py-2 text-sm text-gray-300">{tournament.venue}</span>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-4">
              <div className="rounded-xl bg-zinc-950 p-4">
                <p className="text-sm text-gray-400">Total</p>
                <p className="mt-2 text-3xl font-bold">{stats?.total_registrations ?? 0}</p>
              </div>
              <div className="rounded-xl bg-zinc-950 p-4">
                <p className="text-sm text-gray-400">Approved</p>
                <p className="mt-2 text-3xl font-bold text-green-300">{stats?.approved_registrations ?? 0}</p>
              </div>
              <div className="rounded-xl bg-zinc-950 p-4">
                <p className="text-sm text-gray-400">Paid</p>
                <p className="mt-2 text-3xl font-bold text-blue-300">{stats?.paid_registrations ?? 0}</p>
              </div>
              <div className="rounded-xl bg-zinc-950 p-4">
                <p className="text-sm text-gray-400">Unpaid</p>
                <p className="mt-2 text-3xl font-bold text-yellow-300">{unpaidCount}</p>
              </div>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                href={`/admin/registrations?tournament=${encodeURIComponent(tournament.tournament_name)}`}
                className="rounded-xl bg-red-600 px-4 py-3 text-center text-sm font-bold text-white transition hover:bg-red-700"
              >
                View Registrations
              </Link>
              <Link href="/admin/registrations" className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500">
                Export Swiss
              </Link>
              <Link href={`/admin/tournaments/${tournamentId}/edit`} className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500">
                Edit Tournament
              </Link>
              <Link href={`/tournaments/${tournamentId}`} className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500">
                Public Page
              </Link>
            </div>
          </div>
        </div>

        {message && (
          <p className="mt-6 rounded-lg border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">{message}</p>
        )}

        {uploadProgress && (
          <p className="mt-6 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">{uploadProgress}</p>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">Section Breakdown</h2>
            {sectionStats.length === 0 ? (
              <p className="mt-4 text-sm text-gray-400">No registrations have been submitted yet.</p>
            ) : (
              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3">
                {sectionStats.map((section) => (
                  <div key={section.section_name} className="rounded-xl border border-white/10 bg-zinc-950 p-4">
                    <p className="font-bold">{section.section_name}</p>
                    <p className="mt-2 text-2xl font-bold text-red-300">{section.total}</p>
                    <p className="text-xs text-gray-500">entries</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-white/10 bg-zinc-900 p-6">
            <h2 className="text-2xl font-bold">Tournament Tools</h2>
            <div className="mt-5 space-y-3">
              {["Upload Pairings", "Upload Standings", "Upload Results", "Post Tournament News", "Close Registration", "Set Tournament Live"].map((tool) => (
                <div key={tool} className="rounded-xl border border-white/10 bg-zinc-950 p-4 text-sm text-gray-400">
                  {tool} — coming soon
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">Archive Gallery</p>
              <h2 className="mt-2 text-2xl font-bold">Tournament Photos</h2>
              <p className="mt-2 text-sm text-gray-400">
                Upload individual photos or a full folder at once. Photos appear on the public archive page when the tournament is completed.
              </p>
            </div>
            <span className="rounded-full bg-zinc-950 px-4 py-2 text-sm text-gray-400">
              {gallery.length} photo{gallery.length === 1 ? "" : "s"}
            </span>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1fr_260px_260px]">
            <div>
              <label className="mb-2 block text-sm font-semibold">Caption for uploaded photo(s)</label>
              <input
                value={galleryCaption}
                onChange={(event) => setGalleryCaption(event.target.value)}
                placeholder="Prize-giving, round 1 action, winners, etc."
                className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Upload photo(s)</label>
              <input
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                onChange={handleGalleryUpload}
                disabled={uploadingGallery}
                className="block w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Upload folder</label>
             <input
  type="file"
  accept=".jpg,.jpeg,.png,.webp"
  multiple
  disabled={uploadingGallery}
  onChange={(event) => {
    console.log("Folder files:", event.target.files);
    handleGalleryUpload(event);
  }}
  className="block w-full rounded-lg border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
  // @ts-expect-error folder upload support
  webkitdirectory=""
/>
            </div>
          </div>

          {gallery.length === 0 ? (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">No gallery photos have been uploaded yet.</p>
          ) : (
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {gallery.map((image) => (
                <div key={image.id} className="overflow-hidden rounded-xl border border-white/10 bg-zinc-950">
                  <div className="relative aspect-square">
                    <Image
                      src={image.image_url}
                      alt={image.caption ?? "Tournament gallery image"}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <div className="p-3">
                    <p className="line-clamp-2 text-xs text-gray-400">{image.caption ?? "No caption"}</p>
                    <button
                      type="button"
                      onClick={() => deleteGalleryImage(image)}
                      className="mt-3 w-full rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10"
                    >
                      Delete Photo
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
