"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";
import { formatDate, valueOrDash, singleRelation } from "@/lib/supabaseHelpers";

type RequestTournament = {
  tournament_name: string;
  start_date: string | null;
};

type RequestRegistration = {
  id: string;
  payment_status: string | null;
  registration_status: string | null;
  players: {
    full_name: string;
    chess_sa_id: string | null;
    rating: number | null;
  } | null;
  tournament_sections: {
    section_name: string | null;
  } | null;
};

type RequestQueryRow = {
  id: string;
  tournament_id: string;
  registration_id: string;
  organiser_email: string;
  requested_payment_status: string | null;
  requested_registration_status: string | null;
  current_payment_status: string | null;
  current_registration_status: string | null;
  request_status: string;
  requested_at: string;
  reviewed_at: string | null;
  review_note: string | null;
  tournaments: RequestTournament | RequestTournament[] | null;
  registrations: RequestRegistration | RequestRegistration[] | null;
};

type RequestRow = Omit<RequestQueryRow, "tournaments" | "registrations"> & {
  tournaments: RequestTournament | null;
  registrations: RequestRegistration | null;
};

function statusClass(status: string | null) {
  if (status === "Approved" || status === "Paid") return "bg-green-500/10 text-green-300";
  if (status === "Rejected") return "bg-red-500/10 text-red-300";
  if (status === "Pending") return "bg-yellow-500/10 text-yellow-300";
  return "bg-zinc-800 text-zinc-300";
}

export default function AdminOrganiserRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");

  async function loadRequests() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("organiser_registration_change_requests")
      .select(
        "id, tournament_id, registration_id, organiser_email, requested_payment_status, requested_registration_status, current_payment_status, current_registration_status, request_status, requested_at, reviewed_at, review_note, tournaments(tournament_name, start_date), registrations(id, payment_status, registration_status, players(full_name, chess_sa_id, rating), tournament_sections(section_name))"
      )
      .order("requested_at", { ascending: false });

    if (error) {
      setMessage(`Could not load organiser requests: ${error.message}`);
    } else {
      const rows = (data ?? []) as unknown as RequestQueryRow[];
      setRequests(
        rows.map((row) => ({
          ...row,
          tournaments: singleRelation(row.tournaments),
          registrations: singleRelation(row.registrations),
        }))
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  const filteredRequests = useMemo(() => {
    if (statusFilter === "All") return requests;
    return requests.filter((request) => request.request_status === statusFilter);
  }, [requests, statusFilter]);

  async function reviewRequest(requestId: string, decision: "Approved" | "Rejected") {
    setUpdatingId(requestId);
    setMessage("");

    const { error } = await supabase.rpc(
      "admin_review_organiser_registration_request",
      {
        p_request_id: requestId,
        p_decision: decision,
        p_review_note: null,
      }
    );

    if (error) {
      setMessage(`Could not ${decision.toLowerCase()} request: ${error.message}`);
      setUpdatingId("");
      return;
    }

    setMessage(`Request ${decision.toLowerCase()}.`);
    await loadRequests();
    setUpdatingId("");
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <Link href="/admin/home" className="text-sm font-semibold text-red-300">
            Back to Command Centre
          </Link>

          <section className="mt-6 border-b border-white/10 pb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-red-400">
              Safety Review
            </p>
            <h1 className="mt-3 text-4xl font-black md:text-6xl">
              Organiser Requests
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-zinc-300">
              Organisers can request entry changes, but nothing is applied until
              an admin approves it here.
            </p>
          </section>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-4">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500 md:max-w-xs"
            >
              <option value="Pending">Pending</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
              <option value="All">All requests</option>
            </select>
          </section>

          {loading ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
              Loading organiser requests...
            </p>
          ) : filteredRequests.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-sm text-zinc-400">
              No organiser requests found.
            </p>
          ) : (
            <section className="mt-8 space-y-4">
              {filteredRequests.map((request) => {
                const registration = request.registrations;
                const player = registration?.players;
                const section = registration?.tournament_sections;
                return (
                  <article
                    key={request.id}
                    className="rounded-2xl border border-white/10 bg-zinc-900 p-5"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              request.request_status
                            )}`}
                          >
                            {request.request_status}
                          </span>
                          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-300">
                            {formatDate(request.requested_at)}
                          </span>
                        </div>

                        <h2 className="mt-3 text-2xl font-black text-white">
                          {player?.full_name ?? "Unknown player"}
                        </h2>
                        <p className="mt-1 text-sm text-zinc-400">
                          {request.tournaments?.tournament_name ?? "Tournament"} -{" "}
                          {section?.section_name ?? "No section"}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          Requested by {request.organiser_email}
                        </p>

                        <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
                          <ChangeCard
                            label="Entry status"
                            current={
                              request.current_registration_status ??
                              registration?.registration_status
                            }
                            requested={request.requested_registration_status}
                          />
                          <ChangeCard
                            label="Payment status"
                            current={
                              request.current_payment_status ??
                              registration?.payment_status
                            }
                            requested={request.requested_payment_status}
                          />
                        </div>

                        <p className="mt-4 text-xs text-zinc-500">
                          Chess SA: {valueOrDash(player?.chess_sa_id)} | Rating:{" "}
                          {valueOrDash(player?.rating)}
                        </p>
                      </div>

                      {request.request_status === "Pending" && (
                        <div className="grid min-w-[220px] gap-2">
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => reviewRequest(request.id, "Approved")}
                            className="rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve request
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => reviewRequest(request.id, "Rejected")}
                            className="rounded-lg border border-red-500/40 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Reject request
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </section>
          )}
        </div>
      </main>
    </AdminGuard>
  );
}

function ChangeCard({
  label,
  current,
  requested,
}: {
  label: string;
  current: string | null | undefined;
  requested: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-zinc-400">Current: {valueOrDash(current)}</p>
      <p className="mt-1 font-bold text-white">
        Requested: {requested ? requested : "No change"}
      </p>
    </div>
  );
}
