"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type Player = {
  id: string;
  full_name: string;
  chess_sa_id: string | null;
  rating: number | null;
};

type MemberRow = {
  id: string;
  user_id: string | null;
  player_id: string | null;
  chess_sa_id: string | null;
  member_email: string;
  membership_type: string;
  membership_status: string;
  start_date: string | null;
  end_date: string | null;
  amount_paid: number | null;
  payment_reference: string | null;
  payment_date: string | null;
  created_at: string;
  players: Player | Player[] | null;
};

const inputClass =
  "w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500";

function singlePlayer(value: Player | Player[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [memberEmail, setMemberEmail] = useState("");
  const [chessSaId, setChessSaId] = useState("");
  const [membershipType, setMembershipType] = useState("Annual");
  const [membershipStatus, setMembershipStatus] = useState("Active");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [amountPaid, setAmountPaid] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadMembers() {
    setLoading(true);
    setMessage("");

    const { data: memberData, error: memberError } = await supabase
      .from("member_memberships")
      .select(
        "id, user_id, player_id, chess_sa_id, member_email, membership_type, membership_status, start_date, end_date, amount_paid, payment_reference, payment_date, created_at, players(id, full_name, chess_sa_id, rating)"
      )
      .order("end_date", { ascending: true, nullsFirst: false });

    const { data: playerData, error: playerError } = await supabase
      .from("players")
      .select("id, full_name, chess_sa_id, rating")
      .order("full_name", { ascending: true })
      .limit(20000);

    if (memberError) {
      setMessage("Could not load memberships. Run the member centre SQL setup first.");
    } else {
      setMembers((memberData ?? []) as unknown as MemberRow[]);
    }

    if (playerError) {
      setMessage((current) => current || `Could not load players: ${playerError.message}`);
    } else {
      setPlayers((playerData ?? []) as Player[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadMembers();
  }, []);

  const matchedPlayer = useMemo(() => {
    const clean = chessSaId.trim().toLowerCase();
    if (!clean) return null;
    return (
      players.find((player) => player.chess_sa_id?.trim().toLowerCase() === clean) ??
      null
    );
  }, [players, chessSaId]);

  async function saveMembership(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");

    const email = memberEmail.trim().toLowerCase();
    const cleanChessSaId = chessSaId.trim() || matchedPlayer?.chess_sa_id || null;

    if (!email) {
      setMessage("Member email is required.");
      setSaving(false);
      return;
    }

    if (!matchedPlayer) {
      setMessage("Link the membership to an existing Player Centre profile using Chess SA ID.");
      setSaving(false);
      return;
    }

    const { error } = await supabase.from("member_memberships").upsert(
      {
        member_email: email,
        player_id: matchedPlayer.id,
        chess_sa_id: cleanChessSaId,
        membership_type: membershipType,
        membership_status: membershipStatus,
        start_date: startDate || null,
        end_date: endDate || null,
        amount_paid: amountPaid ? Number(amountPaid) : null,
        payment_reference: paymentReference.trim() || null,
        payment_date: paymentDate || null,
        notes: notes.trim() || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "member_email" }
    );

    if (error) {
      setMessage(`Could not save membership: ${error.message}`);
      setSaving(false);
      return;
    }

    setMemberEmail("");
    setChessSaId("");
    setStartDate("");
    setEndDate("");
    setAmountPaid("");
    setPaymentReference("");
    setPaymentDate("");
    setNotes("");
    setMessage("Membership saved.");
    setSaving(false);
    await loadMembers();
  }

  const stats = useMemo(() => {
    const active = members.filter((member) => member.membership_status === "Active").length;
    const expired = members.filter((member) => member.membership_status === "Expired").length;
    const linked = members.filter((member) => member.player_id).length;
    const expiringSoon = members.filter((member) => {
      if (!member.end_date || member.membership_status !== "Active") return false;
      const days = Math.ceil(
        (new Date(member.end_date).getTime() - new Date().getTime()) / 86400000
      );
      return days >= 0 && days <= 30;
    }).length;

    return { total: members.length, active, expired, linked, expiringSoon };
  }, [members]);

  const filteredMembers = useMemo(() => {
    const text = search.trim().toLowerCase();

    return members.filter((member) => {
      const player = singlePlayer(member.players);
      const matchesSearch =
        !text ||
        member.member_email.toLowerCase().includes(text) ||
        (member.chess_sa_id ?? "").toLowerCase().includes(text) ||
        (player?.full_name ?? "").toLowerCase().includes(text);
      const matchesStatus =
        statusFilter === "All" || member.membership_status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [members, search, statusFilter]);

  function loadMemberIntoForm(member: MemberRow) {
    setMemberEmail(member.member_email);
    setChessSaId(member.chess_sa_id ?? "");
    setMembershipType(member.membership_type);
    setMembershipStatus("Active");
    setStartDate(new Date().toISOString().slice(0, 10));

    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setEndDate(nextYear.toISOString().slice(0, 10));

    setAmountPaid(member.amount_paid?.toString() ?? "");
    setPaymentReference("");
    setPaymentDate(new Date().toISOString().slice(0, 10));
    setNotes(member.payment_reference ? `Previous ref: ${member.payment_reference}` : "");
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pt-28 text-white">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin/home" className="text-sm font-semibold text-red-300">
            Back to Command Centre
          </Link>

          <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-6 md:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
              Member Centre
            </p>
            <h1 className="mt-3 text-3xl font-black md:text-5xl">
              Paid Membership Register
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-400">
              Record confirmed membership payments, link each member to Player
              Centre and control the dates members see when they sign in.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-white/10 bg-zinc-900 p-4 text-sm text-zinc-200">
              {message}
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Total members" value={stats.total} />
            <StatCard label="Active" value={stats.active} />
            <StatCard label="Expired" value={stats.expired} />
            <StatCard label="Linked profiles" value={stats.linked} />
            <StatCard label="Expiring soon" value={stats.expiringSoon} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
            <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
              <h2 className="text-2xl font-black">Add or renew member</h2>
              <form onSubmit={saveMembership} className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold">Member email</span>
                  <input
                    type="email"
                    required
                    value={memberEmail}
                    onChange={(event) => setMemberEmail(event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold">Chess SA ID</span>
                  <input
                    value={chessSaId}
                    onChange={(event) => setChessSaId(event.target.value)}
                    className={inputClass}
                  />
                </label>

                <p className="rounded-xl border border-white/10 bg-zinc-950 p-3 text-xs text-zinc-400">
                  {matchedPlayer
                    ? `Linked to ${matchedPlayer.full_name}`
                    : "Enter a Chess SA ID that already exists in Player Centre."}
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold">Type</span>
                    <select
                      value={membershipType}
                      onChange={(event) => setMembershipType(event.target.value)}
                      className={inputClass}
                    >
                      <option>Annual</option>
                      <option>Junior</option>
                      <option>Family</option>
                      <option>Honorary</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">Status</span>
                    <select
                      value={membershipStatus}
                      onChange={(event) => setMembershipStatus(event.target.value)}
                      className={inputClass}
                    >
                      <option>Active</option>
                      <option>Expired</option>
                      <option>Pending</option>
                      <option>Suspended</option>
                    </select>
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold">Start date</span>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">End date</span>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(event) => setEndDate(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-semibold">Amount paid</span>
                    <input
                      type="number"
                      value={amountPaid}
                      onChange={(event) => setAmountPaid(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-semibold">Payment date</span>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(event) => setPaymentDate(event.target.value)}
                      className={inputClass}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-sm font-semibold">Payment reference</span>
                  <input
                    value={paymentReference}
                    onChange={(event) => setPaymentReference(event.target.value)}
                    className={inputClass}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-semibold">Notes</span>
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className={`${inputClass} min-h-24`}
                  />
                </label>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Membership"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-white/10 bg-zinc-900 p-5 md:p-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                <div>
                  <h2 className="text-2xl font-black">Membership list</h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Search members, filter status and quickly prepare renewals.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_160px] xl:w-[520px]">
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search member, email or Chess SA ID"
                    className={inputClass}
                  />
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                    className={inputClass}
                  >
                    <option>All</option>
                    <option>Active</option>
                    <option>Expired</option>
                    <option>Pending</option>
                    <option>Suspended</option>
                  </select>
                </div>
              </div>
              {loading ? (
                <p className="mt-5 text-sm text-zinc-400">Loading memberships...</p>
              ) : filteredMembers.length === 0 ? (
                <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-zinc-400">
                  No memberships match the current view.
                </p>
              ) : (
                <div className="mt-5 overflow-hidden rounded-xl border border-white/10">
                  <div className="hidden grid-cols-[1fr_110px_110px_100px_110px] bg-zinc-950 px-4 py-3 text-xs font-bold uppercase tracking-wide text-zinc-500 md:grid">
                    <span>Member</span>
                    <span>Starts</span>
                    <span>Ends</span>
                    <span>Status</span>
                    <span>Action</span>
                  </div>
                  <div className="divide-y divide-white/10">
                    {filteredMembers.map((member) => {
                      const player = singlePlayer(member.players);
                      return (
                        <div
                          key={member.id}
                          className="grid gap-3 bg-zinc-950 p-4 md:grid-cols-[1fr_110px_110px_100px_110px] md:items-center"
                        >
                          <div>
                            <p className="font-bold text-white">
                              {player?.full_name ?? member.member_email}
                            </p>
                            <p className="mt-1 text-xs text-zinc-500">
                              {member.member_email}
                              {member.chess_sa_id ? ` - ${member.chess_sa_id}` : ""}
                            </p>
                          </div>
                          <p className="text-sm text-zinc-300">
                            {formatDate(member.start_date)}
                          </p>
                          <p className="text-sm text-zinc-300">
                            {formatDate(member.end_date)}
                          </p>
                          <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-zinc-200">
                            {member.membership_status}
                          </span>
                          <button
                            type="button"
                            onClick={() => loadMemberIntoForm(member)}
                            className="w-fit rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-red-500"
                          >
                            Renew
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </AdminGuard>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-black">{value}</p>
    </div>
  );
}
