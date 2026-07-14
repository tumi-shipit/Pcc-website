"use client";

import { use, ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminTournamentTabs from "@/components/admin/AdminTournamentTabs";
import { supabase } from "@/lib/supabase";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
};

type GalleryImage = {
  id: string;
  tournament_id: string;
  image_url: string;
  caption: string | null;
  display_order: number | null;
  created_at: string;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function formatDate(value: string | null) {
  if (!value) return "TBA";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export default function TournamentGalleryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const tournamentId = id;

  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [caption, setCaption] = useState("");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadGallery() {
    const { data, error } = await supabase
      .from("tournament_gallery")
      .select("id, tournament_id, image_url, caption, display_order, created_at")
      .eq("tournament_id", tournamentId)
      .order("display_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true });

    if (error) {
      setMessage(`Could not load gallery: ${error.message}`);
      return;
    }

    setGallery((data ?? []) as unknown as GalleryImage[]);
  }

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      setMessage("Tournament could not be loaded.");
      setLoading(false);
      return;
    }

    setTournament(tournamentData as Tournament);
    await loadGallery();
    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [tournamentId]);

  const stats = useMemo(() => {
    return {
      total: gallery.length,
      captioned: gallery.filter((image) => image.caption).length,
      uncaptained: gallery.filter((image) => !image.caption).length,
    };
  }, [gallery]);

  async function uploadFiles(files: File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));

    if (imageFiles.length === 0) {
      setMessage("No image files selected.");
      return;
    }

    setUploading(true);
    setMessage("");
    setUploadProgress(`Preparing ${imageFiles.length} image(s)...`);

    let uploaded = 0;
    let failed = 0;

    for (let index = 0; index < imageFiles.length; index += 1) {
      const file = imageFiles[index];
      const safeName = cleanFileName(file.name);
      const filePath = `gallery/${tournamentId}/${Date.now()}-${index}-${safeName}`;

      setUploadProgress(`Uploading ${index + 1} of ${imageFiles.length}: ${file.name}`);

      const { error: uploadError } = await supabase.storage
        .from("tournament-gallery")
        .upload(filePath, file, {
          upsert: false,
          contentType: file.type || "image/jpeg",
        });

      if (uploadError) {
        failed += 1;
        continue;
      }

      const { data } = supabase.storage
        .from("tournament-gallery")
        .getPublicUrl(filePath);

      const { error: insertError } = await supabase
        .from("tournament_gallery")
        .insert({
          tournament_id: tournamentId,
          image_url: data.publicUrl,
          caption: caption.trim() || null,
          display_order: gallery.length + uploaded + 1,
        });

      if (insertError) {
        failed += 1;
        continue;
      }

      uploaded += 1;
    }

    setUploading(false);
    setUploadProgress("");
    setCaption("");
    setMessage(
      failed > 0
        ? `Uploaded ${uploaded} image(s). ${failed} failed.`
        : `Uploaded ${uploaded} image(s) successfully.`
    );

    await loadGallery();
  }

  async function handleUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    await uploadFiles(files);
    event.target.value = "";
  }

  async function updateCaption(image: GalleryImage, newCaption: string) {
    const { error } = await supabase
      .from("tournament_gallery")
      .update({ caption: newCaption.trim() || null })
      .eq("id", image.id);

    if (error) {
      setMessage(`Could not update caption: ${error.message}`);
      return;
    }

    setMessage("Caption updated.");
    await loadGallery();
  }

  async function moveImage(image: GalleryImage, direction: "up" | "down") {
    const currentIndex = gallery.findIndex((item) => item.id === image.id);
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= gallery.length) return;

    const targetImage = gallery[targetIndex];

    const currentOrder = image.display_order ?? currentIndex + 1;
    const targetOrder = targetImage.display_order ?? targetIndex + 1;

    await supabase
      .from("tournament_gallery")
      .update({ display_order: targetOrder })
      .eq("id", image.id);

    await supabase
      .from("tournament_gallery")
      .update({ display_order: currentOrder })
      .eq("id", targetImage.id);

    await loadGallery();
  }

  async function deleteImage(image: GalleryImage) {
    const confirmed = window.confirm("Delete this gallery image from the archive?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("tournament_gallery")
      .delete()
      .eq("id", image.id);

    if (error) {
      setMessage(`Could not delete image: ${error.message}`);
      return;
    }

    setSelectedImage(null);
    setMessage("Gallery image deleted.");
    await loadGallery();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading gallery...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!tournament) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
            {message || "Tournament could not be found."}
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href={`/admin/tournaments/${tournamentId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
             Back to Tournament Dashboard
          </Link>

          <AdminTournamentTabs id={tournamentId} />

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
              Tournament Gallery
            </p>

            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              {tournament.tournament_name}
            </h1>

            <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
              Upload and manage tournament photos. These images appear on the
              public tournament archive when the event is completed.
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {formatDate(tournament.start_date)}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {tournament.venue ?? "Venue TBA"}
              </span>
              <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                {tournament.registration_status ?? "Status TBA"}
              </span>
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          {uploadProgress && (
            <p className="mt-6 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm text-blue-100">
              {uploadProgress}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-3">
            <StatCard label="Photos" value={stats.total} />
            <StatCard label="Captioned" value={stats.captioned} tone="green" />
            <StatCard label="No Caption" value={stats.uncaptained} tone="yellow" />
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_320px]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Caption for uploaded photos
                </label>
                <input
                  value={caption}
                  onChange={(event) => setCaption(event.target.value)}
                  placeholder="Prize-giving, round 1 action, winners, etc."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Upload photos
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleUpload}
                  disabled={uploading}
                  className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                />
              </div>
            </div>
          </section>

          {gallery.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
              No gallery photos uploaded yet.
            </p>
          ) : (
            <section className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {gallery.map((image, index) => (
                <article
                  key={image.id}
                  className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900"
                >
                  <button
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className="group relative block aspect-square w-full bg-zinc-950"
                  >
                    <Image
                      src={image.image_url}
                      alt={image.caption ?? "Tournament gallery image"}
                      fill
                      sizes="(max-width: 768px) 50vw, 25vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </button>

                  <div className="space-y-3 p-3">
                    <input
                      defaultValue={image.caption ?? ""}
                      onBlur={(event) => updateCaption(image, event.target.value)}
                      placeholder="Caption..."
                      className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                    />

                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => moveImage(image, "up")}
                        disabled={index === 0}
                        className="rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-white disabled:opacity-30"
                      >
                        Up
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage(image, "down")}
                        disabled={index === gallery.length - 1}
                        className="rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-white disabled:opacity-30"
                      >
                        Down
                      </button>

                      <button
                        type="button"
                        onClick={() => deleteImage(image)}
                        className="rounded-lg border border-red-500/40 px-2 py-2 text-xs font-bold text-red-200"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>

        {selectedImage && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
            <button
              type="button"
              onClick={() => setSelectedImage(null)}
              className="absolute right-4 top-4 rounded-full bg-white px-4 py-2 text-sm font-bold text-black transition hover:bg-gray-200"
            >
              Close
            </button>

            <div className="max-h-[90vh] w-full max-w-5xl overflow-auto rounded-2xl border border-white/10 bg-zinc-950 p-3">
              <img
                src={selectedImage.image_url}
                alt={selectedImage.caption ?? "Tournament gallery image"}
                className="mx-auto max-h-[78vh] w-auto rounded-xl object-contain"
              />

              {selectedImage.caption && (
                <p className="px-3 py-4 text-center text-sm text-gray-300">
                  {selectedImage.caption}
                </p>
              )}
            </div>
          </div>
        )}
      </main>
    </AdminGuard>
  );
}

function StatCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "green" | "yellow" | "red";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "red"
      ? "text-red-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}

