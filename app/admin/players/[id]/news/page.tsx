"use client";

import { use, ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import AdminPlayerTabs from "@/components/admin/AdminPlayerTabs";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  fide_id: string | null;
  club: string | null;
  province: string | null;
  rating: number | null;
  verification_status: string | null;
  profile_photo_url: string | null;
};

type NewsPost = {
  id: string;
  title: string;
  excerpt: string;
  content: string | null;
  image_url: string | null;
  category: string | null;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string | null;
};

type PlayerNewsTag = {
  id: string;
  player_id: string;
  news_post_id: string;
  created_at: string | null;
  news_posts: NewsPost | null;
};

type NewsForm = {
  title: string;
  excerpt: string;
  content: string;
  image_url: string;
  category: string;
  published: boolean;
};

const emptyForm: NewsForm = {
  title: "",
  excerpt: "",
  content: "",
  image_url: "",
  category: "Player Spotlight",
  published: false,
};

const categories = [
  "Player Spotlight",
  "Achievement",
  "Tournament News",
  "Interview",
  "Announcement",
  "Club News",
  "Platform Update",
  "Live Update",
];

const quickTemplates = [
  {
    title: "Player Spotlight",
    category: "Player Spotlight",
    excerpt: "A spotlight feature on this player's chess journey and achievements.",
    content:
      "This player spotlight looks at their chess journey, recent performances, achievements and contribution to the game.",
  },
  {
    title: "Achievement Announcement",
    category: "Achievement",
    excerpt: "A new achievement has been added to this player's profile.",
    content:
      "Congratulations to this player on their latest achievement. This milestone has been added to their permanent PCC player profile.",
  },
  {
    title: "Tournament Performance",
    category: "Tournament News",
    excerpt: "A strong tournament performance has been recorded for this player.",
    content:
      "This player delivered a strong tournament performance and has been recognised in the PCC archive.",
  },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-gray-600 focus:border-red-500";

function formatDate(value: string | null) {
  if (!value) return "Not published";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function valueOrDash(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getCategoryStyle(category: string | null) {
  if (category === "Player Spotlight") return "bg-red-500/10 text-red-200";
  if (category === "Achievement") return "bg-yellow-500/10 text-yellow-200";
  if (category === "Tournament News") return "bg-blue-500/10 text-blue-200";
  if (category === "Interview") return "bg-purple-500/10 text-purple-200";
  if (category === "Announcement") return "bg-green-500/10 text-green-200";
  return "bg-zinc-800 text-zinc-300";
}

export default function AdminPlayerNewsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const playerId = id;

  const [player, setPlayer] = useState<Player | null>(null);
  const [taggedNews, setTaggedNews] = useState<PlayerNewsTag[]>([]);
  const [allNews, setAllNews] = useState<NewsPost[]>([]);
  const [form, setForm] = useState<NewsForm>(emptyForm);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedExistingPostId, setSelectedExistingPostId] = useState("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");

  const editingPost = useMemo(() => {
    return allNews.find((post) => post.id === editingPostId) ?? null;
  }, [allNews, editingPostId]);

  const taggedPostIds = useMemo(() => {
    return new Set(taggedNews.map((tag) => tag.news_post_id));
  }, [taggedNews]);

  const availableNewsToTag = useMemo(() => {
    return allNews.filter((post) => !taggedPostIds.has(post.id));
  }, [allNews, taggedPostIds]);

  const filteredTaggedNews = useMemo(() => {
    const text = search.trim().toLowerCase();

    return taggedNews.filter((tag) => {
      const post = tag.news_posts;
      if (!post) return false;

      const matchesSearch =
        !text ||
        post.title.toLowerCase().includes(text) ||
        post.excerpt.toLowerCase().includes(text) ||
        (post.content ?? "").toLowerCase().includes(text) ||
        (post.category ?? "").toLowerCase().includes(text);

      const matchesCategory =
        categoryFilter === "All" || post.category === categoryFilter;

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Published" && post.published) ||
        (statusFilter === "Draft" && !post.published);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [taggedNews, search, categoryFilter, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: taggedNews.length,
      published: taggedNews.filter((tag) => tag.news_posts?.published).length,
      drafts: taggedNews.filter((tag) => tag.news_posts && !tag.news_posts.published)
        .length,
      spotlights: taggedNews.filter(
        (tag) => tag.news_posts?.category === "Player Spotlight"
      ).length,
    };
  }, [taggedNews]);

  async function loadPage() {
    setLoading(true);
    setMessage("");

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select(
        "id, full_name, chess_sa_id, fide_id, club, province, rating, verification_status, profile_photo_url"
      )
      .eq("id", playerId)
      .single();

    if (playerError || !playerData) {
      setMessage("Player could not be loaded.");
      setLoading(false);
      return;
    }

    const { data: tagData, error: tagError } = await supabase
      .from("player_news_tags")
      .select(
        "id, player_id, news_post_id, created_at, news_posts(id, title, excerpt, content, image_url, category, published, published_at, created_at, updated_at)"
      )
      .eq("player_id", playerId)
      .order("created_at", { ascending: false });

    const { data: newsData, error: newsError } = await supabase
      .from("news_posts")
      .select(
        "id, title, excerpt, content, image_url, category, published, published_at, created_at, updated_at"
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    if (tagError) {
      setMessage(`Could not load player news tags: ${tagError.message}`);
    } else if (newsError) {
      setMessage(`Could not load news posts: ${newsError.message}`);
    }

    setPlayer(playerData as Player);
    setTaggedNews((tagData ?? []) as unknown as PlayerNewsTag[]);
    setAllNews((newsData ?? []) as unknown as NewsPost[]);
    setLoading(false);
  }

  useEffect(() => {
    loadPage();
  }, [playerId]);

  function updateField(field: keyof NewsForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingPostId(null);
  }

  function useTemplate(template: (typeof quickTemplates)[number]) {
    setForm({
      title: `${template.title}: ${player?.full_name ?? ""}`,
      excerpt: template.excerpt,
      content: template.content,
      image_url: player?.profile_photo_url ?? "",
      category: template.category,
      published: false,
    });
    setEditingPostId(null);
  }

  function editPost(post: NewsPost) {
    setEditingPostId(post.id);
    setForm({
      title: post.title ?? "",
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      image_url: post.image_url ?? "",
      category: post.category ?? "Player Spotlight",
      published: post.published,
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

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

    const filePath = `news/players/${playerId}/${Date.now()}-${cleanFileName(
      file.name
    )}`;

    const { error: uploadError } = await supabase.storage
      .from("news-images")
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || "image/jpeg",
      });

    if (uploadError) {
      setMessage(`Image upload failed: ${uploadError.message}`);
      setUploadingImage(false);
      event.target.value = "";
      return;
    }

    const { data } = supabase.storage.from("news-images").getPublicUrl(filePath);

    setForm((current) => ({
      ...current,
      image_url: data.publicUrl,
    }));

    setUploadingImage(false);
    setMessage("Featured image uploaded.");
    event.target.value = "";
  }

  async function submitPost(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.title.trim() || !form.excerpt.trim()) {
      setMessage("Title and excerpt are required.");
      return;
    }

    setSaving(true);
    setMessage("");

    const now = new Date().toISOString();

    const payload = {
      title: form.title.trim(),
      excerpt: form.excerpt.trim(),
      content: form.content.trim() || null,
      image_url: form.image_url.trim() || null,
      category: form.category || null,
      published: form.published,
      published_at:
        form.published && !editingPost?.published_at
          ? now
          : form.published
          ? editingPost?.published_at ?? now
          : null,
      updated_at: now,
    };

    let newsPostId = editingPostId;

    if (editingPostId) {
      const { error } = await supabase
        .from("news_posts")
        .update(payload)
        .eq("id", editingPostId);

      if (error) {
        setMessage(`Could not update news post: ${error.message}`);
        setSaving(false);
        return;
      }
    } else {
      const { data, error } = await supabase
        .from("news_posts")
        .insert(payload)
        .select("id")
        .single();

      if (error || !data) {
        setMessage(`Could not create news post: ${error?.message ?? "Unknown error"}`);
        setSaving(false);
        return;
      }

      newsPostId = (data as { id: string }).id;

      const { error: tagError } = await supabase.from("player_news_tags").insert({
        player_id: playerId,
        news_post_id: newsPostId,
      });

      if (tagError) {
        setMessage(`Article created, but player tag failed: ${tagError.message}`);
        setSaving(false);
        await loadPage();
        return;
      }
    }

    if (editingPostId && newsPostId && !taggedPostIds.has(newsPostId)) {
      const { error: tagError } = await supabase.from("player_news_tags").insert({
        player_id: playerId,
        news_post_id: newsPostId,
      });

      if (tagError) {
        setMessage(`Post saved, but player tag failed: ${tagError.message}`);
        setSaving(false);
        await loadPage();
        return;
      }
    }

    setMessage(editingPostId ? "News post updated." : "News post created and tagged.");
    resetForm();
    setSaving(false);
    await loadPage();
  }

  async function tagExistingPost() {
    if (!selectedExistingPostId) {
      setMessage("Select a news post to tag.");
      return;
    }

    setMessage("");

    const { error } = await supabase.from("player_news_tags").insert({
      player_id: playerId,
      news_post_id: selectedExistingPostId,
    });

    if (error) {
      setMessage(`Could not tag article: ${error.message}`);
      return;
    }

    setSelectedExistingPostId("");
    setMessage("Article linked to player.");
    await loadPage();
  }

  async function untagPost(tag: PlayerNewsTag) {
    const confirmed = window.confirm(
      `Remove "${tag.news_posts?.title ?? "this article"}" from this player profile?`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("player_news_tags")
      .delete()
      .eq("id", tag.id);

    if (error) {
      setMessage(`Could not remove tag: ${error.message}`);
      return;
    }

    setMessage("Article removed from player profile.");
    await loadPage();
  }

  async function togglePublished(post: NewsPost) {
    setMessage("");

    const nextPublished = !post.published;

    const { error } = await supabase
      .from("news_posts")
      .update({
        published: nextPublished,
        published_at: nextPublished
          ? post.published_at ?? new Date().toISOString()
          : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", post.id);

    if (error) {
      setMessage(`Could not update publishing status: ${error.message}`);
      return;
    }

    await loadPage();
  }

  async function deletePost(tag: PlayerNewsTag) {
    const confirmed = window.confirm(
      `Delete "${tag.news_posts?.title ?? "this article"}" completely? This removes it from the newsroom too.`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("news_posts")
      .delete()
      .eq("id", tag.news_post_id);

    if (error) {
      setMessage(`Could not delete article: ${error.message}`);
      return;
    }

    setMessage("Article deleted.");
    await loadPage();
  }

  if (loading) {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-7xl rounded-2xl border border-white/10 bg-zinc-900 p-6 text-gray-400">
            Loading player news...
          </div>
        </main>
      </AdminGuard>
    );
  }

  if (!player || message === "Player could not be loaded.") {
    return (
      <AdminGuard>
        <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
          <div className="mx-auto max-w-3xl rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-100">
            {message || "Player could not be found."}
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
            href={`/admin/players/${playerId}`}
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Player Profile
          </Link>

          <section className="mt-6 rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-red-500/30 bg-red-600/10 text-2xl font-black text-red-200">
                {player.profile_photo_url ? (
                  <Image
                    src={player.profile_photo_url}
                    alt={player.full_name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                ) : (
                  initials(player.full_name)
                )}
              </div>

              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Player Media
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-6xl">
                  {player.full_name}
                </h1>

                <p className="mt-3 text-gray-300">
                  News mentions, player spotlights, interviews and achievement
                  posts linked to this player profile.
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                    Chess SA: {valueOrDash(player.chess_sa_id)}
                  </span>
                  <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-bold text-gray-300">
                    FIDE: {valueOrDash(player.fide_id)}
                  </span>
                </div>
              </div>
            </div>

            <AdminPlayerTabs id={playerId} />
          </section>

          {message && message !== "Player could not be loaded." && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-4 md:grid-cols-4">
            <StatCard label="Tagged Articles" value={stats.total} />
            <StatCard label="Published" value={stats.published} tone="green" />
            <StatCard label="Drafts" value={stats.drafts} tone="yellow" />
            <StatCard label="Spotlights" value={stats.spotlights} tone="red" />
          </section>

          <section className="mt-8 grid gap-8 lg:grid-cols-[430px_1fr]">
            <aside className="space-y-8">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  {editingPostId ? "Edit Article" : "Create Article"}
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  {editingPostId ? "Update player story" : "New player story"}
                </h2>

                <div className="mt-5 grid gap-3">
                  {quickTemplates.map((template) => (
                    <button
                      key={template.title}
                      type="button"
                      onClick={() => useTemplate(template)}
                      className="rounded-xl border border-white/10 bg-zinc-950 p-3 text-left text-sm transition hover:border-red-500"
                    >
                      <p className="font-bold text-white">{template.title}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {template.category}
                      </p>
                    </button>
                  ))}
                </div>

                <form onSubmit={submitPost} className="mt-6 space-y-5">
                  <Field label="Title">
                    <input
                      value={form.title}
                      onChange={(event) => updateField("title", event.target.value)}
                      placeholder="Player Spotlight: ..."
                      className={inputClass}
                      required
                    />
                  </Field>

                  <Field label="Category">
                    <select
                      value={form.category}
                      onChange={(event) =>
                        updateField("category", event.target.value)
                      }
                      className={inputClass}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Upload featured image">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={uploadFeaturedImage}
                      disabled={uploadingImage}
                      className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                    />
                  </Field>

                  <Field label="Featured image URL">
                    <input
                      value={form.image_url}
                      onChange={(event) =>
                        updateField("image_url", event.target.value)
                      }
                      className={inputClass}
                    />
                  </Field>

                  {form.image_url && (
                    <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
                      <div className="relative aspect-video">
                        <Image
                          src={form.image_url}
                          alt="Featured image preview"
                          fill
                          sizes="430px"
                          className="object-cover"
                        />
                      </div>
                    </div>
                  )}

                  <Field label="Excerpt">
                    <textarea
                      value={form.excerpt}
                      onChange={(event) =>
                        updateField("excerpt", event.target.value)
                      }
                      rows={3}
                      className={inputClass}
                      required
                    />
                  </Field>

                  <Field label="Full article">
                    <textarea
                      value={form.content}
                      onChange={(event) =>
                        updateField("content", event.target.value)
                      }
                      rows={8}
                      className={inputClass}
                    />
                  </Field>

                  <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-zinc-950 p-4">
                    <input
                      type="checkbox"
                      checked={form.published}
                      onChange={(event) =>
                        updateField("published", event.target.checked)
                      }
                      className="h-5 w-5 accent-red-600"
                    />
                    <span>
                      <span className="block font-semibold">Publish now</span>
                      <span className="block text-sm text-gray-500">
                        Published posts appear on the public website.
                      </span>
                    </span>
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="submit"
                      disabled={saving}
                      className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {saving
                        ? "Saving..."
                        : editingPostId
                        ? "Save Changes"
                        : "Create & Tag"}
                    </button>

                    <button
                      type="button"
                      onClick={resetForm}
                      className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                    >
                      Clear
                    </button>
                  </div>
                </form>
              </section>

              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Link Existing
                </p>

                <h2 className="mt-3 text-2xl font-black">Tag article</h2>

                <div className="mt-6 space-y-4">
                  <select
                    value={selectedExistingPostId}
                    onChange={(event) =>
                      setSelectedExistingPostId(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">Select existing article</option>
                    {availableNewsToTag.map((post) => (
                      <option key={post.id} value={post.id}>
                        {post.title}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={tagExistingPost}
                    className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                  >
                    Link Article to Player
                  </button>
                </div>
              </section>
            </aside>

            <section className="rounded-3xl border border-white/10 bg-zinc-900 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Tagged Media
                  </p>
                  <h2 className="mt-3 text-2xl font-black">Player Articles</h2>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search articles..."
                    className={inputClass}
                  />

                  <select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All categories</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option value="All">All status</option>
                    <option value="Published">Published</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              {filteredTaggedNews.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  No tagged articles found.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredTaggedNews.map((tag) => {
                    const post = tag.news_posts;
                    if (!post) return null;

                    return (
                      <article
                        key={tag.id}
                        className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950"
                      >
                        <div className="grid gap-0 xl:grid-cols-[220px_1fr]">
                          <div className="relative min-h-[180px] bg-zinc-900">
                            {post.image_url ? (
                              <Image
                                src={post.image_url}
                                alt={post.title}
                                fill
                                sizes="220px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full min-h-[180px] items-center justify-center text-sm text-gray-600">
                                No image
                              </div>
                            )}
                          </div>

                          <div className="p-5">
                            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                              <div>
                                <div className="flex flex-wrap gap-2">
                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${getCategoryStyle(
                                      post.category
                                    )}`}
                                  >
                                    {post.category ?? "News"}
                                  </span>

                                  <span
                                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                                      post.published
                                        ? "bg-green-500/10 text-green-200"
                                        : "bg-yellow-500/10 text-yellow-200"
                                    }`}
                                  >
                                    {post.published ? "Published" : "Draft"}
                                  </span>

                                  <span className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-gray-300">
                                    {formatDate(post.published_at)}
                                  </span>
                                </div>

                                <h3 className="mt-4 text-xl font-black text-white">
                                  {post.title}
                                </h3>

                                <p className="mt-2 line-clamp-2 text-sm leading-6 text-gray-400">
                                  {post.excerpt}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => editPost(post)}
                                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-red-500"
                                >
                                  Edit
                                </button>

                                <button
                                  type="button"
                                  onClick={() => togglePublished(post)}
                                  className={`rounded-xl px-4 py-2 text-xs font-bold transition ${
                                    post.published
                                      ? "border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                                      : "bg-green-600 text-white hover:bg-green-700"
                                  }`}
                                >
                                  {post.published ? "Unpublish" : "Publish"}
                                </button>

                                <Link
                                  href={`/news/${post.id}`}
                                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-red-500"
                                >
                                  View
                                </Link>

                                <button
                                  type="button"
                                  onClick={() => untagPost(tag)}
                                  className="rounded-xl border border-white/10 px-4 py-2 text-xs font-bold text-white transition hover:border-red-500"
                                >
                                  Untag
                                </button>

                                <button
                                  type="button"
                                  onClick={() => deletePost(tag)}
                                  className="rounded-xl border border-red-500/40 px-4 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-gray-200">
        {label}
      </span>
      {children}
    </label>
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
