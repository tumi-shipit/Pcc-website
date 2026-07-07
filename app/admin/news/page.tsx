"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

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
  updated_at: string;
};

type Tournament = {
  id: string;
  tournament_name: string;
  start_date: string;
  registration_status: string;
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
  category: "Tournament News",
  published: false,
};

const categories = [
  "Tournament News",
  "Registration",
  "Live Update",
  "Results",
  "Pairings",
  "Announcement",
  "Achievement",
  "Player Spotlight",
  "Club News",
  "Platform Update",
];

const quickTemplates = [
  {
    title: "Round Pairings Published",
    category: "Pairings",
    excerpt: "The next round pairings have been published. Players should check their board numbers.",
    content:
      "The next round pairings have been published. Players are requested to check their board numbers and report to their boards on time.",
  },
  {
    title: "Final Results Published",
    category: "Results",
    excerpt: "The final standings and prize winners have been published.",
    content:
      "The final standings and prize winners have been published. Congratulations to all players who participated.",
  },
  {
    title: "Registration Reminder",
    category: "Registration",
    excerpt: "Players are reminded to complete registration and payment before the closing date.",
    content:
      "Players are reminded to complete their tournament registration and payment before the closing date to secure their place.",
  },
  {
    title: "Tournament Live Update",
    category: "Live Update",
    excerpt: "Live update from the tournament venue.",
    content: "Live update from the tournament venue:",
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

function formatDateTime(value: string | null) {
  if (!value) return "Not published";

  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getCategoryStyle(category: string | null) {
  if (category === "Live Update") return "bg-red-500/10 text-red-200";
  if (category === "Registration") return "bg-green-500/10 text-green-200";
  if (category === "Tournament News") return "bg-blue-500/10 text-blue-200";
  if (category === "Platform Update") return "bg-purple-500/10 text-purple-200";
  if (category === "Achievement") return "bg-yellow-500/10 text-yellow-200";
  if (category === "Results") return "bg-orange-500/10 text-orange-200";
  if (category === "Pairings") return "bg-cyan-500/10 text-cyan-200";
  return "bg-zinc-800 text-zinc-300";
}

function cleanFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
}

export default function AdminNewsPage() {
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [form, setForm] = useState<NewsForm>(emptyForm);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [activePanel, setActivePanel] = useState<"compose" | "control">("compose");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const editingPost = useMemo(() => {
    return posts.find((post) => post.id === editingPostId) ?? null;
  }, [editingPostId, posts]);

  const stats = useMemo(() => {
    return {
      total: posts.length,
      published: posts.filter((post) => post.published).length,
      drafts: posts.filter((post) => !post.published).length,
      liveUpdates: posts.filter((post) => post.category === "Live Update").length,
      images: posts.filter((post) => post.image_url).length,
    };
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const searchText = search.toLowerCase();

    return posts.filter((post) => {
      const matchesSearch =
        post.title.toLowerCase().includes(searchText) ||
        post.excerpt.toLowerCase().includes(searchText) ||
        (post.content ?? "").toLowerCase().includes(searchText) ||
        (post.category ?? "").toLowerCase().includes(searchText);

      const matchesCategory =
        selectedCategory === "All" || post.category === selectedCategory;

      const matchesStatus =
        selectedStatus === "All" ||
        (selectedStatus === "Published" && post.published) ||
        (selectedStatus === "Draft" && !post.published);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [posts, search, selectedCategory, selectedStatus]);

  const latestLivePost = useMemo(() => {
    return posts.find((post) => post.category === "Live Update" && post.published) ?? null;
  }, [posts]);

  async function loadPosts() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("news_posts")
      .select(
        "id, title, excerpt, content, image_url, category, published, published_at, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    const { data: tournamentData } = await supabase
      .from("tournaments")
      .select("id, tournament_name, start_date, registration_status")
      .neq("registration_status", "Draft")
      .order("start_date", { ascending: false })
      .limit(20);

    if (error) {
      setMessage(`Could not load news posts: ${error.message}`);
    } else {
      setPosts((data ?? []) as NewsPost[]);
      setTournaments((tournamentData ?? []) as Tournament[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadPosts();
  }, []);

  function updateField(field: keyof NewsForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingPostId(null);
    setMessage("");
    setActivePanel("compose");
  }

  function editPost(post: NewsPost) {
    setEditingPostId(post.id);
    setForm({
      title: post.title ?? "",
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      image_url: post.image_url ?? "",
      category: post.category ?? "Tournament News",
      published: post.published,
    });

    setActivePanel("compose");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function useTemplate(template: (typeof quickTemplates)[number]) {
    setForm({
      title: template.title,
      excerpt: template.excerpt,
      content: template.content,
      image_url: form.image_url,
      category: template.category,
      published: false,
    });
    setEditingPostId(null);
    setActivePanel("compose");
  }

  function insertTournamentMention(tournament: Tournament) {
    const line = `\n\nTournament: ${tournament.tournament_name}\nPublic page: /tournaments/${tournament.id}`;
    setForm((current) => ({
      ...current,
      content: `${current.content}${line}`,
    }));
    setActivePanel("compose");
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

    const safeName = cleanFileName(file.name);
    const filePath = `news/${Date.now()}-${safeName}`;

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

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
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

    if (editingPostId) {
      const { error } = await supabase
        .from("news_posts")
        .update(payload)
        .eq("id", editingPostId);

      if (error) {
        setMessage(`Could not update article: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Article updated successfully.");
    } else {
      const { error } = await supabase.from("news_posts").insert(payload);

      if (error) {
        setMessage(`Could not create article: ${error.message}`);
        setSaving(false);
        return;
      }

      setMessage("Article created successfully.");
    }

    await loadPosts();
    resetForm();
    setSaving(false);
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

    await loadPosts();
  }

  async function deletePost(post: NewsPost) {
    const confirmed = window.confirm(
      `Delete "${post.title}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setMessage("");

    const { error } = await supabase
      .from("news_posts")
      .delete()
      .eq("id", post.id);

    if (error) {
      setMessage(`Could not delete article: ${error.message}`);
      return;
    }

    if (editingPostId === post.id) {
      resetForm();
    }

    await loadPosts();
    setMessage("Article deleted.");
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/admin/home"
            className="text-sm font-semibold text-red-300 transition hover:text-red-200"
          >
            ← Back to Admin Dashboard
          </Link>

          <section className="mt-6 overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(220,38,38,0.24),_transparent_36%),linear-gradient(135deg,_#18181b,_#09090b)] p-6 shadow-2xl md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                  Media Command Centre
                </p>

                <h1 className="mt-3 text-4xl font-black md:text-6xl">
                  Newsroom Dashboard
                </h1>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-gray-300 md:text-base md:leading-8">
                  Create announcements, live updates, reports, tournament posts,
                  player spotlights and public website content from one place.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700"
                >
                  + New Article
                </button>

                <Link
                  href="/admin/live"
                  className="rounded-xl border border-white/10 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
                >
                  Live Control Room
                </Link>
              </div>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-5">
              <StatCard label="Total" value={stats.total} />
              <StatCard label="Published" value={stats.published} tone="green" />
              <StatCard label="Drafts" value={stats.drafts} tone="yellow" />
              <StatCard label="Live Updates" value={stats.liveUpdates} tone="red" />
              <StatCard label="With Images" value={stats.images} tone="blue" />
            </div>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-gray-300">
              {message}
            </p>
          )}

          <section className="mt-8 grid gap-8 lg:grid-cols-[440px_1fr]">
            <aside className="space-y-6">
              <section className="rounded-3xl border border-white/10 bg-zinc-900 p-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePanel("compose")}
                    className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      activePanel === "compose"
                        ? "bg-red-600 text-white"
                        : "text-gray-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    Compose
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePanel("control")}
                    className={`rounded-2xl px-4 py-3 text-sm font-bold transition ${
                      activePanel === "control"
                        ? "bg-red-600 text-white"
                        : "text-gray-400 hover:bg-zinc-800 hover:text-white"
                    }`}
                  >
                    Control Tools
                  </button>
                </div>
              </section>

              {activePanel === "compose" ? (
                <section className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    {editingPostId ? "Edit Article" : "Create Article"}
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    {editingPostId ? "Update news post" : "New newsroom post"}
                  </h2>

                  <form onSubmit={handleSubmit} className="mt-6 space-y-5">
                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Title
                      </label>
                      <input
                        value={form.title}
                        onChange={(event) =>
                          updateField("title", event.target.value)
                        }
                        placeholder="Round 4 pairings published"
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Category
                      </label>
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
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Upload featured image
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={uploadFeaturedImage}
                        disabled={uploadingImage}
                        className="block w-full rounded-xl border border-white/10 bg-zinc-950 p-3 text-sm text-gray-300 file:mr-4 file:rounded file:border-0 file:bg-red-600 file:px-4 file:py-2 file:font-semibold file:text-white disabled:opacity-60"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Featured image URL
                      </label>
                      <input
                        value={form.image_url}
                        onChange={(event) =>
                          updateField("image_url", event.target.value)
                        }
                        placeholder="Supabase public URL or /images/news/photo.jpg"
                        className={inputClass}
                      />
                    </div>

                    {form.image_url && (
                      <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
                        <div className="relative aspect-video">
                          <Image
                            src={form.image_url}
                            alt="Featured image preview"
                            fill
                            sizes="440px"
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Excerpt
                      </label>
                      <textarea
                        value={form.excerpt}
                        onChange={(event) =>
                          updateField("excerpt", event.target.value)
                        }
                        rows={3}
                        placeholder="Short summary shown on homepage and news cards..."
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold">
                        Full article
                      </label>
                      <textarea
                        value={form.content}
                        onChange={(event) =>
                          updateField("content", event.target.value)
                        }
                        rows={10}
                        placeholder="Write the full update, report or announcement here..."
                        className={inputClass}
                      />
                    </div>

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
                          Published posts appear on the website immediately.
                        </span>
                      </span>
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <button
                        type="submit"
                        disabled={saving}
                        className="rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {saving
                          ? "Saving..."
                          : editingPostId
                          ? "Save Changes"
                          : "Create Article"}
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
              ) : (
                <section className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                    Control Tools
                  </p>

                  <h2 className="mt-3 text-2xl font-black">Quick publishing</h2>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        Templates
                      </p>

                      <div className="mt-3 grid gap-3">
                        {quickTemplates.map((template) => (
                          <button
                            key={template.title}
                            type="button"
                            onClick={() => useTemplate(template)}
                            className="rounded-2xl border border-white/10 bg-zinc-950 p-4 text-left transition hover:border-red-500"
                          >
                            <p className="font-bold text-white">
                              {template.title}
                            </p>
                            <p className="mt-1 text-sm text-gray-500">
                              {template.category}
                            </p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-semibold text-white">
                        Link tournament
                      </p>

                      <div className="mt-3 max-h-[360px] overflow-auto rounded-2xl border border-white/10">
                        {tournaments.length === 0 ? (
                          <p className="p-4 text-sm text-gray-400">
                            No tournaments found.
                          </p>
                        ) : (
                          tournaments.map((tournament) => (
                            <button
                              key={tournament.id}
                              type="button"
                              onClick={() => insertTournamentMention(tournament)}
                              className="block w-full border-b border-white/10 bg-zinc-950 p-4 text-left last:border-b-0 hover:bg-zinc-800"
                            >
                              <p className="font-bold text-white">
                                {tournament.tournament_name}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {formatDate(tournament.start_date)} •{" "}
                                {tournament.registration_status}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    </div>

                    {latestLivePost && (
                      <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4">
                        <p className="text-sm font-semibold text-red-200">
                          Latest live update
                        </p>
                        <p className="mt-2 font-bold text-white">
                          {latestLivePost.title}
                        </p>
                        <p className="mt-1 text-xs text-red-100/70">
                          {formatDateTime(latestLivePost.published_at)}
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              )}
            </aside>

            <section>
              <div className="rounded-3xl border border-white/10 bg-zinc-900 p-5 md:p-6">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
                      Published & Drafts
                    </p>
                    <h2 className="mt-2 text-2xl font-black">Newsroom Posts</h2>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search articles..."
                      className={inputClass}
                    />

                    <select
                      value={selectedCategory}
                      onChange={(event) =>
                        setSelectedCategory(event.target.value)
                      }
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
                      value={selectedStatus}
                      onChange={(event) => setSelectedStatus(event.target.value)}
                      className={inputClass}
                    >
                      <option value="All">All status</option>
                      <option value="Published">Published</option>
                      <option value="Draft">Draft</option>
                    </select>
                  </div>
                </div>
              </div>

              {loading ? (
                <p className="mt-6 text-sm text-gray-400">Loading posts...</p>
              ) : filteredPosts.length === 0 ? (
                <p className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-gray-400">
                  No news posts found.
                </p>
              ) : (
                <div className="mt-6 space-y-4">
                  {filteredPosts.map((post) => (
                    <article
                      key={post.id}
                      className="overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 transition hover:border-red-500/60"
                    >
                      <div className="grid gap-0 xl:grid-cols-[220px_1fr]">
                        <div className="relative min-h-[180px] bg-zinc-950">
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

                                <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs text-gray-300">
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
                                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() => togglePublished(post)}
                                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                                  post.published
                                    ? "border border-yellow-500/40 text-yellow-200 hover:bg-yellow-500/10"
                                    : "bg-green-600 text-white hover:bg-green-700"
                                }`}
                              >
                                {post.published ? "Unpublish" : "Publish"}
                              </button>

                              <Link
                                href={`/news/${post.id}`}
                                className="rounded-xl border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:border-red-500"
                              >
                                View
                              </Link>

                              <button
                                type="button"
                                onClick={() => deletePost(post)}
                                className="rounded-xl border border-red-500/40 px-4 py-2 text-sm font-bold text-red-200 transition hover:bg-red-500/10"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </section>
        </div>
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
  value: number;
  tone?: "default" | "green" | "yellow" | "red" | "blue";
}) {
  const valueClass =
    tone === "green"
      ? "text-green-300"
      : tone === "yellow"
      ? "text-yellow-300"
      : tone === "red"
      ? "text-red-300"
      : tone === "blue"
      ? "text-blue-300"
      : "text-white";

  return (
    <div className="rounded-2xl border border-white/10 bg-black/35 p-5">
      <p className="text-sm text-gray-400">{label}</p>
      <p className={`mt-2 text-3xl font-black ${valueClass}`}>{value}</p>
    </div>
  );
}
