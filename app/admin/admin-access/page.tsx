"use client";

import { useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  user_id: string;
  email: string | null;
  display_name: string | null;
  role: string;
  access_status: string;
  requires_super_admin_approval: boolean;
  created_at: string | null;
};

type AdminActionRequest = {
  id: string;
  requested_by: string;
  action_type: string;
  action_label: string;
  target_table: string | null;
  target_id: string | null;
  target_label: string | null;
  request_status: string;
  request_note: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

const roleLabels: Record<string, string> = {
  super_admin: "Super admin",
  tournament_manager: "Tournament manager",
  event_assistant: "Event assistant",
  payment_reviewer: "Payment reviewer",
  content_editor: "Content editor",
  data_manager: "Data manager",
  viewer: "Viewer",
};

const roleDescriptions: Record<string, string> = {
  super_admin: "Full control, including approvals, admins, payment settings and deletes.",
  tournament_manager: "Can manage assigned tournament work; restricted changes need approval.",
  event_assistant: "Can help with registrations, proof checks and event-day work.",
  payment_reviewer: "Can review payment queues and mark payments after checks.",
  content_editor: "Can prepare reports, news and galleries; publishing can require approval.",
  data_manager: "Can clean player data and imports; merges/deletes need approval.",
  viewer: "Can view admin information without making changes.",
};

function formatDate(value: string | null) {
  if (!value) return "Not recorded";

  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status: string) {
  if (status === "Active" || status === "Approved") {
    return "bg-green-500/10 text-green-300";
  }
  if (status === "Pending") return "bg-yellow-500/10 text-yellow-300";
  if (status === "Rejected" || status === "Suspended") {
    return "bg-red-500/10 text-red-300";
  }
  return "bg-zinc-800 text-zinc-300";
}

export default function AdminAccessPage() {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [requests, setRequests] = useState<AdminActionRequest[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState("Pending");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");

  const isSuperAdmin = currentRole === "super_admin";

  async function loadAccess() {
    setLoading(true);
    setMessage("");

    const { data: roleData, error: roleError } =
      await supabase.rpc("current_admin_role");

    if (roleError) {
      setMessage(
        "Admin roles are not installed yet. Run database/admin_roles_and_approvals.sql in Supabase."
      );
      setLoading(false);
      return;
    }

    setCurrentRole((roleData as string | null) ?? null);

    const { data: adminData, error: adminError } = await supabase
      .from("admin_users")
      .select(
        "user_id, email, display_name, role, access_status, requires_super_admin_approval, created_at"
      )
      .order("role", { ascending: true })
      .order("created_at", { ascending: true });

    if (adminError) {
      setMessage(
        `Could not load admin users. Run database/admin_roles_and_approvals.sql if you have not yet. ${adminError.message}`
      );
      setLoading(false);
      return;
    }

    const { data: requestData, error: requestError } = await supabase
      .from("admin_action_requests")
      .select(
        "id, requested_by, action_type, action_label, target_table, target_id, target_label, request_status, request_note, reviewed_at, review_note, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(200);

    if (requestError) {
      setMessage(`Could not load admin approval requests: ${requestError.message}`);
    }

    setAdmins((adminData ?? []) as unknown as AdminUser[]);
    setRequests((requestData ?? []) as unknown as AdminActionRequest[]);
    setLoading(false);
  }

  useEffect(() => {
    loadAccess();
  }, []);

  const filteredRequests = useMemo(() => {
    if (requestStatus === "All") return requests;
    return requests.filter((request) => request.request_status === requestStatus);
  }, [requests, requestStatus]);

  const stats = useMemo(() => {
    return {
      totalAdmins: admins.length,
      superAdmins: admins.filter((admin) => admin.role === "super_admin").length,
      limitedAdmins: admins.filter((admin) => admin.role !== "super_admin").length,
      pendingRequests: requests.filter(
        (request) => request.request_status === "Pending"
      ).length,
    };
  }, [admins, requests]);

  async function reviewRequest(
    requestId: string,
    decision: "Approved" | "Rejected"
  ) {
    setUpdatingId(requestId);
    setMessage("");

    const { error } = await supabase.rpc("admin_review_action_request", {
      p_request_id: requestId,
      p_decision: decision,
      p_review_note: null,
    });

    if (error) {
      setMessage(`Could not ${decision.toLowerCase()} request: ${error.message}`);
      setUpdatingId("");
      return;
    }

    setMessage(`Request ${decision.toLowerCase()}.`);
    await loadAccess();
    setUpdatingId("");
  }

  return (
    <AdminGuard>
      <main className="min-h-screen bg-zinc-950 px-4 pb-16 pt-28 text-white md:px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-400">
            PCC Admin
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-black md:text-5xl">
                Admin Access
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-gray-400">
                Manage who can help on the site while keeping restricted changes
                under super-admin approval.
              </p>
            </div>
            <button
              type="button"
              onClick={loadAccess}
              className="rounded-lg border border-white/10 bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
            >
              Refresh
            </button>
          </div>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Admins" value={stats.totalAdmins} />
            <StatCard label="Super admins" value={stats.superAdmins} />
            <StatCard label="Limited admins" value={stats.limitedAdmins} />
            <StatCard label="Pending approvals" value={stats.pendingRequests} />
          </div>

          {!isSuperAdmin && !loading && (
            <p className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
              You can view admin access, but only a super admin can approve
              restricted requests or change admin roles.
            </p>
          )}

          <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Roles
                </p>
                <h2 className="mt-2 text-2xl font-black">Admin users</h2>
              </div>
              <span className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-gray-400">
                Role changes are done in Supabase for now
              </span>
            </div>

            {loading ? (
              <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                Loading admin access...
              </p>
            ) : admins.length === 0 ? (
              <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                No admin users found.
              </p>
            ) : (
              <div className="mt-5 grid gap-3">
                {admins.map((admin) => (
                  <article
                    key={admin.user_id}
                    className="rounded-xl border border-white/10 bg-zinc-950 p-4"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              admin.access_status
                            )}`}
                          >
                            {admin.access_status}
                          </span>
                          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-gray-300">
                            {roleLabels[admin.role] ?? admin.role}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-black text-white">
                          {admin.display_name || admin.email || admin.user_id}
                        </h3>
                        <p className="mt-1 text-sm text-gray-400">
                          {roleDescriptions[admin.role] ?? "Custom admin role."}
                        </p>
                      </div>
                      <div className="text-sm text-gray-500 lg:text-right">
                        <p>{admin.email ?? "No email recorded"}</p>
                        <p>Added {formatDate(admin.created_at)}</p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Approval Queue
                </p>
                <h2 className="mt-2 text-2xl font-black">
                  Restricted admin requests
                </h2>
              </div>
              <select
                value={requestStatus}
                onChange={(event) => setRequestStatus(event.target.value)}
                className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
              >
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
                <option value="Cancelled">Cancelled</option>
                <option value="All">All requests</option>
              </select>
            </div>

            {filteredRequests.length === 0 ? (
              <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                No restricted requests found.
              </p>
            ) : (
              <div className="mt-5 grid gap-3">
                {filteredRequests.map((request) => (
                  <article
                    key={request.id}
                    className="rounded-xl border border-white/10 bg-zinc-950 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                              request.request_status
                            )}`}
                          >
                            {request.request_status}
                          </span>
                          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-bold text-gray-300">
                            {request.action_type}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-black text-white">
                          {request.action_label}
                        </h3>
                        <p className="mt-1 text-sm text-gray-400">
                          {request.target_label ||
                            request.target_id ||
                            request.target_table ||
                            "No target recorded"}
                        </p>
                        {request.request_note && (
                          <p className="mt-3 text-sm text-gray-500">
                            {request.request_note}
                          </p>
                        )}
                        <p className="mt-3 text-xs text-gray-600">
                          Requested {formatDate(request.created_at)}
                        </p>
                      </div>

                      {request.request_status === "Pending" && isSuperAdmin && (
                        <div className="grid min-w-[220px] gap-2">
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => reviewRequest(request.id, "Approved")}
                            className="rounded-lg bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={updatingId === request.id}
                            onClick={() => reviewRequest(request.id, "Rejected")}
                            className="rounded-lg border border-red-500/40 px-4 py-3 text-sm font-bold text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </AdminGuard>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900 p-4">
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-white">{value}</p>
    </div>
  );
}
