"use client";

import { use, ChangeEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminTournamentTabs from "@/components/admin/AdminTournamentTabs";
import { supabase } from "@/lib/supabase";
import {
  chunkItems,
  getTournamentGalleryStoragePath,
} from "@/lib/tournamentGallery";
import { resizeImageForUpload } from "@/lib/imageCompression";

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  venue: string | null;
  registration_status: string | null;
  external_gallery_url?: string | null;
  external_gallery_label?: string | null;
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
const maxFeaturedGalleryImages = 4;

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
  const [externalGalleryUrl, setExternalGalleryUrl] = useState("");
  const [externalGalleryLabel, setExternalGalleryLabel] = useState("");
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [selectedImageIds, setSelectedImageIds] = useState<Set<string>>(
    () => new Set()
  );
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
    setSelectedImageIds((current) => {
      const availableIds = new Set((data ?? []).map((image) => image.id));
      return new Set([...current].filter((id) => availableIds.has(id)));
    });
  }

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const { data: tournamentData, error: tournamentError } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, venue, registration_status, external_gallery_url, external_gallery_label")
      .eq("id", tournamentId)
      .single();

    if (tournamentError || !tournamentData) {
      const fallback = await supabase
        .from("tournaments")
        .select("id, tournament_name, start_date, venue, registration_status")
        .eq("id", tournamentId)
        .single();

      if (fallback.error || !fallback.data) {
        setMessage("Tournament could not be loaded.");
        setLoading(false);
        return;
      }

      setTournament(fallback.data as Tournament);
      setExternalGalleryUrl("");
      setExternalGalleryLabel("");
      setMessage(
        "External gallery fields are not installed yet. Run database/tournament_external_gallery_setup.sql in Supabase."
      );
      await loadGallery();
      setLoading(false);
      return;
    }

    setTournament(tournamentData as Tournament);
    setExternalGalleryUrl(tournamentData.external_gallery_url ?? "");
    setExternalGalleryLabel(tournamentData.external_gallery_label ?? "");
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
      remaining: Math.max(maxFeaturedGalleryImages - gallery.length, 0),
    };
  }, [gallery]);

  async function uploadFiles(files: File[]) {
    const remainingSlots = Math.max(maxFeaturedGalleryImages - gallery.length, 0);

    if (remainingSlots <= 0) {
      setMessage(
        `This tournament already has the maximum ${maxFeaturedGalleryImages} featured photos. Delete one before uploading another.`
      );
      return;
    }

    const selectedImageFiles = files.filter((file) => file.type.startsWith("image/"));
    const imageFiles = selectedImageFiles.slice(0, remainingSlots);

    if (imageFiles.length === 0) {
      setMessage("No image files selected.");
      return;
    }

    setUploading(true);
    setMessage("");
    setUploadProgress(`Preparing ${imageFiles.length} image(s)...`);
    if (selectedImageFiles.length > imageFiles.length) {
      setMessage(
        `Only ${imageFiles.length} image(s) will be uploaded because featured photos are limited to ${maxFeaturedGalleryImages}.`
      );
    }

    let uploaded = 0;
    let failed = 0;

    for (let index = 0; index < imageFiles.length; index += 1) {
      let file = imageFiles[index];

      try {
        file = await resizeImageForUpload(file, {
          maxDimension: 1600,
          quality: 0.82,
        });
      } catch {
        file = imageFiles[index];
      }

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

  async function saveExternalGallery() {
    const { error } = await supabase
      .from("tournaments")
      .update({
        external_gallery_url: externalGalleryUrl.trim() || null,
        external_gallery_label: externalGalleryLabel.trim() || null,
      })
      .eq("id", tournamentId);

    if (error) {
      setMessage(
        `Could not save external gallery link: ${error.message}. Run database/tournament_external_gallery_setup.sql in Supabase first.`
      );
      return;
    }

    setMessage("External gallery link saved.");
    await loadPage();
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

  function toggleImageSelection(imageId: string) {
    setSelectedImageIds((current) => {
      const next = new Set(current);

      if (next.has(imageId)) {
        next.delete(imageId);
      } else {
        next.add(imageId);
      }

      return next;
    });
  }

  function selectAllImages() {
    setSelectedImageIds(new Set(gallery.map((image) => image.id)));
  }

  function clearSelection() {
    setSelectedImageIds(new Set());
  }

  async function deleteImages(images: GalleryImage[], confirmMessage: string) {
    if (images.length === 0 || deleting) return;

    const confirmed = window.confirm(confirmMessage);
    if (!confirmed) return;

    setDeleting(true);
    setMessage(`Deleting ${images.length} gallery photo(s)...`);

    const storagePaths = images
      .map((image) => getTournamentGalleryStoragePath(image.image_url))
      .filter((path): path is string => Boolean(path));

    let storageWarning = "";

    for (const paths of chunkItems(storagePaths, 100)) {
      const { error: storageError } = await supabase.storage
        .from("tournament-gallery")
        .remove(paths);

      if (storageError && !storageWarning) {
        storageWarning = storageError.message;
      }
    }

    let deletedRows = 0;

    for (const imageChunk of chunkItems(images, 100)) {
      const { error } = await supabase
        .from("tournament_gallery")
        .delete()
        .in(
          "id",
          imageChunk.map((image) => image.id)
        );

      if (error) {
        setDeleting(false);
        setMessage(`Could not delete gallery images: ${error.message}`);
        return;
      }

      deletedRows += imageChunk.length;
    }

    setDeleting(false);
    setSelectedImage(null);
    setSelectedImageIds(new Set());
    setMessage(
      storageWarning
        ? `Removed ${deletedRows} gallery record(s). Storage cleanup warning: ${storageWarning}`
        : `Deleted ${deletedRows} gallery photo(s).`
    );
    await loadGallery();
  }

  async function deleteImage(image: GalleryImage) {
    await deleteImages([image], "Delete this gallery image from the archive?");
  }

  async function deleteSelectedImages() {
    const selectedImages = gallery.filter((image) =>
      selectedImageIds.has(image.id)
    );

    await deleteImages(
      selectedImages,
      `Delete ${selectedImages.length} selected gallery photo(s)?`
    );
  }

  async function clearGallery() {
    await deleteImages(
      gallery,
      `Delete all ${gallery.length} gallery photo(s) for this tournament?`
    );
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
              Link the full tournament album from external storage. Supabase
              uploads can still be used for a few featured photos only.
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
            <StatCard label="Featured photos" value={`${stats.total}/${maxFeaturedGalleryImages}`} />
            <StatCard label="Captioned" value={stats.captioned} tone="green" />
            <StatCard label="Slots left" value={stats.remaining} tone="yellow" />
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-300">
                  External Album
                </p>
                <h2 className="mt-2 text-2xl font-black">Photo storage link</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                  Use Google Drive, Google Photos, MEGA, iCloud or another
                  album link for the full tournament gallery.
                </p>
              </div>

              {externalGalleryUrl.trim() && (
                <a
                  href={externalGalleryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-white/10 px-4 py-3 text-center text-sm font-bold text-white transition hover:border-red-500"
                >
                  Test link
                </a>
              )}
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_260px_160px]">
              <div>
                <label className="mb-2 block text-sm font-semibold">
                  External gallery link
                </label>
                <input
                  type="url"
                  value={externalGalleryUrl}
                  onChange={(event) => setExternalGalleryUrl(event.target.value)}
                  placeholder="https://drive.google.com/... or https://photos.app.goo.gl/..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Button label
                </label>
                <input
                  value={externalGalleryLabel}
                  onChange={(event) => setExternalGalleryLabel(event.target.value)}
                  placeholder="View more photos"
                  className={inputClass}
                />
              </div>

              <button
                type="button"
                onClick={saveExternalGallery}
                className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
              >
                Save link
              </button>
            </div>
          </section>

          <section className="mt-8 rounded-3xl border border-white/10 bg-zinc-900 p-6">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-300">
                Optional Featured Photos
              </p>
              <h2 className="mt-2 text-2xl font-black">Supabase photos</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
                Keep this strict: maximum 4 highlights. Store full albums
                externally to protect Supabase storage.
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-[1fr_320px]">
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
                  disabled={uploading || stats.remaining <= 0}
                  className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                />
                <p className="mt-2 text-xs leading-5 text-gray-500">
                  {stats.remaining > 0
                    ? `${stats.remaining} featured photo slot${
                        stats.remaining === 1 ? "" : "s"
                      } left.`
                    : "Featured photo limit reached."}
                </p>
              </div>
            </div>
          </section>

          {gallery.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
              No gallery photos uploaded yet.
            </p>
          ) : (
            <>
              <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm font-semibold text-gray-300">
                    {selectedImageIds.size} of {gallery.length} selected
                  </p>

                  <div className="grid gap-2 sm:grid-cols-4">
                    <button
                      type="button"
                      onClick={selectAllImages}
                      disabled={deleting || selectedImageIds.size === gallery.length}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-red-500 disabled:opacity-40"
                    >
                      Select all
                    </button>

                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={deleting || selectedImageIds.size === 0}
                      className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-red-500 disabled:opacity-40"
                    >
                      Clear
                    </button>

                    <button
                      type="button"
                      onClick={deleteSelectedImages}
                      disabled={deleting || selectedImageIds.size === 0}
                      className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-100 transition hover:bg-red-500/20 disabled:opacity-40"
                    >
                      Delete selected
                    </button>

                    <button
                      type="button"
                      onClick={clearGallery}
                      disabled={deleting}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:opacity-40"
                    >
                      Clear gallery
                    </button>
                  </div>
                </div>
              </section>

              <section className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {gallery.map((image, index) => {
                  const selected = selectedImageIds.has(image.id);

                  return (
                    <article
                      key={image.id}
                      className={`overflow-hidden rounded-2xl border bg-zinc-900 ${
                        selected ? "border-red-500" : "border-white/10"
                      }`}
                    >
                      <div className="relative aspect-square bg-zinc-950">
                        <Image
                          src={image.image_url}
                          alt={image.caption ?? "Tournament gallery image"}
                          fill
                          sizes="(max-width: 768px) 50vw, 25vw"
                          className="object-cover"
                        />

                        <button
                          type="button"
                          onClick={() => setSelectedImage(image)}
                          className="absolute inset-0"
                          aria-label="Open gallery image"
                        />

                        <label className="absolute left-2 top-2 flex items-center gap-2 rounded-full bg-black/75 px-3 py-2 text-xs font-bold text-white">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleImageSelection(image.id)}
                            className="h-4 w-4 accent-red-600"
                          />
                          Select
                        </label>
                      </div>

                      <div className="space-y-3 p-3">
                        <input
                          defaultValue={image.caption ?? ""}
                          onBlur={(event) =>
                            updateCaption(image, event.target.value)
                          }
                          placeholder="Caption..."
                          className="w-full rounded-lg border border-white/10 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-red-500"
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <button
                            type="button"
                            onClick={() => moveImage(image, "up")}
                            disabled={index === 0 || deleting}
                            className="rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-white disabled:opacity-30"
                          >
                            Up
                          </button>

                          <button
                            type="button"
                            onClick={() => moveImage(image, "down")}
                            disabled={index === gallery.length - 1 || deleting}
                            className="rounded-lg border border-white/10 px-2 py-2 text-xs font-bold text-white disabled:opacity-30"
                          >
                            Down
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteImage(image)}
                            disabled={deleting}
                            className="rounded-lg border border-red-500/40 px-2 py-2 text-xs font-bold text-red-200 disabled:opacity-40"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </section>
            </>
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

