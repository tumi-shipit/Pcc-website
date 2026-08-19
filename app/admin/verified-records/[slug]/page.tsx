"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AdminGuard from "@/components/AdminGuard";
import { resizeImageForUpload } from "@/lib/imageCompression";
import { supabase } from "@/lib/supabase";
import {
  applyVerifiedRecordOverride,
  verifiedRecords,
  type VerifiedRecordOverride,
} from "@/lib/verifiedRecords";

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function peopleToText(items: Array<{ name: string; role: string }>) {
  return items.map((item) => `${item.name} | ${item.role}`).join("\n");
}

function textToPeople(value: string) {
  return value
    .split("\n")
    .map((line) => {
      const [name, ...roleParts] = line.split("|");
      return {
        name: name?.trim() ?? "",
        role: roleParts.join("|").trim() || "Role",
      };
    })
    .filter((item) => item.name);
}

export default function AdminVerifiedRecordPage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug);
  const baseRecord = useMemo(
    () => verifiedRecords.find((record) => record.slug === slug) ?? null,
    [slug]
  );

  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [albumUrl, setAlbumUrl] = useState("");
  const [albumLabel, setAlbumLabel] = useState("");
  const [dateLabel, setDateLabel] = useState("");
  const [organisationsText, setOrganisationsText] = useState("");
  const [facilitatorsText, setFacilitatorsText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadRecord() {
      if (!baseRecord) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessage("");

      const { data: roleData } = await supabase.rpc("current_admin_role");
      const canEdit = roleData === "super_admin";
      setIsSuperAdmin(canEdit);

      const { data: override } = await supabase
        .from("verified_record_overrides")
        .select(
          "title, summary, content, image_url, album_url, album_label, date_label, organisations, facilitators"
        )
        .eq("slug", slug)
        .maybeSingle();

      const record = applyVerifiedRecordOverride(
        baseRecord,
        override as VerifiedRecordOverride | null
      );

      setTitle(record.title);
      setSummary(record.summary);
      setContent(record.body.join("\n\n"));
      setImageUrl(record.image_url ?? "");
      setAlbumUrl(record.album_url ?? "");
      setAlbumLabel(record.album_label ?? "More pictures");
      setDateLabel(record.dateLabel);
      setOrganisationsText(peopleToText(record.organisations));
      setFacilitatorsText(peopleToText(record.facilitators));
      setLoading(false);
    }

    loadRecord();
  }, [baseRecord, slug]);

  async function uploadFeaturedImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please upload an image file.");
      event.target.value = "";
      return;
    }

    setUploadingImage(true);
    setMessage("");

    let uploadFile = file;

    try {
      uploadFile = await resizeImageForUpload(file, {
        maxDimension: 1600,
        quality: 0.84,
      });
    } catch {
      uploadFile = file;
    }

    const safeName = cleanFileName(uploadFile.name);
    const filePath = `verified-records/${slug}/${Date.now()}-${safeName}`;

    const { error } = await supabase.storage
      .from("news-images")
      .upload(filePath, uploadFile, {
        upsert: false,
        contentType: uploadFile.type || "image/jpeg",
      });

    if (error) {
      setMessage(`Image upload failed: ${error.message}`);
      setUploadingImage(false);
      event.target.value = "";
      return;
    }

    const { data } = supabase.storage.from("news-images").getPublicUrl(filePath);

    setImageUrl(data.publicUrl);
    setMessage("Image uploaded. Save the record to publish the change.");
    setUploadingImage(false);
    event.target.value = "";
  }

  async function saveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!baseRecord) return;

    if (!isSuperAdmin) {
      setMessage("Only a Super Admin can edit protected verified records.");
      return;
    }

    if (!title.trim() || !summary.trim()) {
      setMessage("Title and summary are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const payload = {
      slug,
      title: title.trim(),
      summary: summary.trim(),
      content: content.trim() || null,
      image_url: imageUrl.trim() || null,
      album_url: albumUrl.trim() || null,
      album_label: albumLabel.trim() || "More pictures",
      date_label: dateLabel.trim() || baseRecord.dateLabel,
      organisations: textToPeople(organisationsText),
      facilitators: textToPeople(facilitatorsText),
      updated_at: new Date().toISOString(),
    };

    const { data: savedRecord, error } = await supabase
      .from("verified_record_overrides")
      .upsert(payload, { onConflict: "slug" })
      .select("slug")
      .single();

    if (error) {
      setMessage(
        error.message.toLowerCase().includes("verified_record_overrides")
          ? "Verified record editing is not installed yet. Run database/verified_record_overrides_setup.sql, then save again."
          : `Could not save verified record: ${error.message}`
      );
      setSaving(false);
      return;
    }

    if (!savedRecord?.slug) {
      setMessage(
        "Supabase accepted the request but did not return the saved record. Please run database/verified_record_overrides_setup.sql again, then save once more."
      );
      setSaving(false);
      return;
    }

    setMessage("Protected verified record updated.");
    setSaving(false);
    router.refresh();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-4xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading verified record...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!baseRecord) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-4xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6">
            Verified record could not be found.
          </div>
        </main>
      </AdminGuard>
    );
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-4xl">
          <Link
            href="/admin/news"
            className="text-sm font-bold text-red-300 transition hover:text-red-200"
          >
            Back to Newsroom
          </Link>

          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            Protected Verified Record
          </p>
          <h1 className="mt-3 text-4xl font-black md:text-6xl">
            Edit retained record
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-400">
            This record appears in News and remains retained by PCC. Super Admin
            can update the writing and images, but it is not deleted from the
            ordinary newsroom.
          </p>

          {!isSuperAdmin && (
            <p className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm text-yellow-100">
              Only a Super Admin can save changes to this protected record.
            </p>
          )}

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <form
            onSubmit={saveRecord}
            className="mt-8 space-y-6 rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold">Title</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className={inputClass}
                disabled={!isSuperAdmin}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Date</label>
              <input
                value={dateLabel}
                onChange={(event) => setDateLabel(event.target.value)}
                className={inputClass}
                disabled={!isSuperAdmin}
                placeholder="8-9 August 2026"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Upload featured image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={uploadFeaturedImage}
                disabled={!isSuperAdmin || uploadingImage}
                className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Featured image URL
              </label>
              <input
                value={imageUrl}
                onChange={(event) => setImageUrl(event.target.value)}
                className={inputClass}
                disabled={!isSuperAdmin}
              />
            </div>

            {imageUrl && (
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
                <div className="relative aspect-video">
                  <Image
                    src={imageUrl}
                    alt={title}
                    fill
                    sizes="900px"
                    className="object-cover"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold">
                More pictures link
              </label>
              <p className="mb-2 text-xs leading-5 text-gray-500">
                Paste a Google Photos, Google Drive, iCloud, MEGA or other album
                link.
              </p>
              <input
                value={albumUrl}
                onChange={(event) => setAlbumUrl(event.target.value)}
                className={inputClass}
                disabled={!isSuperAdmin}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                More pictures button text
              </label>
              <input
                value={albumLabel}
                onChange={(event) => setAlbumLabel(event.target.value)}
                className={inputClass}
                disabled={!isSuperAdmin}
                placeholder="More pictures"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">Summary</label>
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={4}
                className={inputClass}
                disabled={!isSuperAdmin}
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Full article
              </label>
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                rows={12}
                className={inputClass}
                disabled={!isSuperAdmin}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Organisations involved
              </label>
              <p className="mb-2 text-xs leading-5 text-gray-500">
                One per line: Name | Role
              </p>
              <textarea
                value={organisationsText}
                onChange={(event) => setOrganisationsText(event.target.value)}
                rows={5}
                className={inputClass}
                disabled={!isSuperAdmin}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold">
                Facilitators
              </label>
              <p className="mb-2 text-xs leading-5 text-gray-500">
                One per line: Name | Role
              </p>
              <textarea
                value={facilitatorsText}
                onChange={(event) => setFacilitatorsText(event.target.value)}
                rows={5}
                className={inputClass}
                disabled={!isSuperAdmin}
              />
            </div>

            <button
              type="submit"
              disabled={!isSuperAdmin || saving}
              className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save protected record"}
            </button>
          </form>
        </div>
      </main>
    </AdminGuard>
  );
}
