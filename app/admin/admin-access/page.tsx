"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import AdminGuard from "@/components/AdminGuard";
import { supabase } from "@/lib/supabase";

type AdminUser = {
  id: string;
  admin_user_id: string | null;
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

type Organisation = {
  id: string;
  name: string;
};

type OrganisationPermission = {
  id: string;
  organisation_id: string;
  admin_user_id: string | null;
  email: string;
  display_name: string | null;
  role: string;
  access_status: string;
  created_at: string | null;
  organisations: {
    name: string;
  } | null;
};

type AdminAuditLog = {
  id: string;
  target_email: string;
  action_type: string;
  previous_role: string | null;
  new_role: string | null;
  previous_status: string | null;
  new_status: string | null;
  created_at: string | null;
};

const roleLabels: Record<string, string> = {
  super_admin: "Super admin",
  admin: "Admin",
  organisation_admin: "Organisation admin",
  tournament_staff: "Tournament staff",
  finance_viewer: "Finance viewer",
};

const roleDescriptions: Record<string, string> = {
  super_admin: "Full control, including approvals, admins, payment settings and deletes.",
  admin: "Club director or trusted platform admin under the super admin.",
  organisation_admin: "Can manage one organisation and its tournament work.",
  tournament_staff: "Can help operate assigned organisation tournaments.",
  finance_viewer: "Can review payment status without changing platform access.",
};

const editableRoles = ["admin"];
const organisationRoles = [
  "organisation_admin",
  "tournament_staff",
  "finance_viewer",
];

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
  const [organisations, setOrganisations] = useState<Organisation[]>([]);
  const [organisationAdmins, setOrganisationAdmins] = useState<
    OrganisationPermission[]
  >([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [requests, setRequests] = useState<AdminActionRequest[]>([]);
  const [currentRole, setCurrentRole] = useState<string | null>(null);
  const [requestStatus, setRequestStatus] = useState("Pending");
  const [adminSearch, setAdminSearch] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminRole, setAdminRole] = useState("admin");
  const [adminStatus, setAdminStatus] = useState("Active");
  const [organisationId, setOrganisationId] = useState("");
  const [organisationEmail, setOrganisationEmail] = useState("");
  const [organisationName, setOrganisationName] = useState("");
  const [organisationRole, setOrganisationRole] = useState("organisation_admin");
  const [organisationStatus, setOrganisationStatus] = useState("Active");
  const [loading, setLoading] = useState(true);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [savingOrganisationAdmin, setSavingOrganisationAdmin] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [message, setMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);

  const isSuperAdmin = currentRole === "super_admin";

  async function loadAccess(options: { keepMessage?: boolean } = {}) {
    setLoading(true);
    if (!options.keepMessage) setMessage("");

    try {
      const { data: userData } = await supabase.auth.getUser();
      setCurrentUserId(userData.user?.id ?? null);
      setCurrentEmail(userData.user?.email?.toLowerCase() ?? null);

      const { data: roleData, error: roleError } =
        await supabase.rpc("current_admin_role");

      if (roleError) {
        setMessage(
          `Admin roles are not installed correctly. Run database/admin_access_rebuild.sql in Supabase. ${roleError.message}`
        );
        return false;
      }

      setCurrentRole((roleData as string | null) ?? null);

      const { data: adminData, error: adminError } = await supabase
        .from("admin_staff_permissions")
        .select(
          "id, admin_user_id, email, display_name, role, access_status, requires_super_admin_approval, created_at"
        )
        .order("role", { ascending: true })
        .order("created_at", { ascending: true });

      if (adminError) {
        setMessage(
          `Could not load admin permissions. Run database/admin_access_rebuild.sql in Supabase. ${adminError.message}`
        );
        return false;
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

      const { data: organisationData, error: organisationError } = await supabase
        .from("organisations")
        .select("id, name")
        .order("name", { ascending: true });

      if (organisationError) {
        setMessage(`Could not load organisations: ${organisationError.message}`);
      }

      const { data: organisationAdminData, error: organisationAdminError } =
        await supabase
          .from("organisation_admin_permissions")
          .select(
            "id, organisation_id, admin_user_id, email, display_name, role, access_status, created_at, organisations(name)"
          )
          .order("created_at", { ascending: false });

      if (organisationAdminError) {
        setMessage(
          `Could not load organisation admin permissions. Run database/admin_access_rebuild.sql in Supabase. ${organisationAdminError.message}`
        );
      }

      const { data: auditData } = await supabase
        .from("admin_access_audit_log")
        .select(
          "id, target_email, action_type, previous_role, new_role, previous_status, new_status, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(12);

      setAdmins((adminData ?? []) as unknown as AdminUser[]);
      setOrganisations((organisationData ?? []) as unknown as Organisation[]);
      setOrganisationAdmins(
        (organisationAdminData ?? []) as unknown as OrganisationPermission[]
      );
      setAuditLogs((auditData ?? []) as unknown as AdminAuditLog[]);
      setRequests((requestData ?? []) as unknown as AdminActionRequest[]);
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown admin access error.";
      setMessage(`Could not load admin access: ${message}`);
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccess();
  }, []);

  const filteredRequests = useMemo(() => {
    if (requestStatus === "All") return requests;
    return requests.filter((request) => request.request_status === requestStatus);
  }, [requests, requestStatus]);

  const filteredAdmins = useMemo(() => {
    const query = adminSearch.trim().toLowerCase();
    if (!query) return admins;

    return admins.filter((admin) => {
      const values = [
        admin.email,
        admin.display_name,
        roleLabels[admin.role],
        admin.access_status,
        admin.admin_user_id,
      ];

      return values.some((value) => value?.toLowerCase().includes(query));
    });
  }, [admins, adminSearch]);

  const stats = useMemo(() => {
    return {
      totalAdmins: admins.length,
      superAdmins: admins.filter((admin) => admin.role === "super_admin").length,
      limitedAdmins: admins.filter((admin) => admin.role === "admin").length,
      linkedAdmins: admins.filter((admin) => Boolean(admin.admin_user_id)).length,
      pendingLogin: admins.filter((admin) => !admin.admin_user_id).length,
      suspendedAdmins: admins.filter((admin) => admin.access_status === "Suspended")
        .length,
      organisationAdmins: organisationAdmins.length,
      activeOrganisationAdmins: organisationAdmins.filter(
        (admin) => admin.access_status === "Active"
      ).length,
      pendingRequests: requests.filter(
        (request) => request.request_status === "Pending"
      ).length,
    };
  }, [admins, organisationAdmins, requests]);

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

  async function saveAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingAdmin(true);
    setMessage("");

    try {
      const email = adminEmail.trim().toLowerCase();
      const name = adminName.trim();

      const { error } = await supabase.rpc("admin_upsert_staff_permission", {
        p_email: email,
        p_display_name: name,
        p_role: adminRole,
        p_access_status: adminStatus,
      });

      if (error) {
        setMessage(`Could not save admin access: ${error.message}`);
        return;
      }

      setAdminEmail("");
      setAdminName("");
      setAdminRole("admin");
      setAdminStatus("Active");
      await loadAccess({ keepMessage: true });
      setMessage(
        `Admin access saved for ${email}. They can log in with that same email.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown admin save error.";
      setMessage(`Could not save admin access: ${message}`);
    } finally {
      setSavingAdmin(false);
    }
  }

  async function saveOrganisationAdmin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSavingOrganisationAdmin(true);
    setMessage("");

    try {
      const email = organisationEmail.trim().toLowerCase();
      const name = organisationName.trim();

      const { error } = await supabase.rpc("admin_upsert_organisation_permission", {
        p_organisation_id: organisationId,
        p_email: email,
        p_display_name: name,
        p_role: organisationRole,
        p_access_status: organisationStatus,
      });

      if (error) {
        setMessage(`Could not save organisation access: ${error.message}`);
        return;
      }

      setOrganisationEmail("");
      setOrganisationName("");
      setOrganisationRole("organisation_admin");
      setOrganisationStatus("Active");
      await loadAccess({ keepMessage: true });
      setMessage(`Organisation access saved for ${email}.`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown organisation access error.";
      setMessage(`Could not save organisation access: ${message}`);
    } finally {
      setSavingOrganisationAdmin(false);
    }
  }

  function editOrganisationAdmin(admin: OrganisationPermission) {
    setOrganisationId(admin.organisation_id);
    setOrganisationEmail(admin.email);
    setOrganisationName(admin.display_name ?? "");
    setOrganisationRole(admin.role);
    setOrganisationStatus(admin.access_status);
  }

  function editAdmin(admin: AdminUser) {
    if (admin.role === "super_admin") {
      setMessage(
        "Super admin accounts are protected. Keep this role limited to platform ownership."
      );
      return;
    }

    setAdminEmail(admin.email ?? "");
    setAdminName(admin.display_name ?? "");
    setAdminRole(admin.role);
    setAdminStatus(admin.access_status);
  }

  function isCurrentAdmin(admin: AdminUser) {
    return (
      (admin.admin_user_id && admin.admin_user_id === currentUserId) ||
      (admin.email && admin.email.toLowerCase() === currentEmail)
    );
  }

  async function suspendAdmin(admin: AdminUser) {
    if (isCurrentAdmin(admin)) {
      setMessage("You cannot suspend your own active admin access from here.");
      return;
    }

    setSavingAdmin(true);
    setMessage("");

    try {
      const { error } = await supabase.rpc("admin_upsert_staff_permission", {
        p_email: admin.email ?? "",
        p_display_name: admin.display_name ?? "",
        p_role: admin.role,
        p_access_status: "Suspended",
      });

      if (error) {
        setMessage(`Could not suspend admin: ${error.message}`);
        return;
      }

      await loadAccess({ keepMessage: true });
      setMessage("Admin suspended.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown admin suspend error.";
      setMessage(`Could not suspend admin: ${message}`);
    } finally {
      setSavingAdmin(false);
    }
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
                Manage who can work inside the admin side while keeping platform
                control protected. You can add someone by email before their
                first admin login.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <span className="rounded-lg border border-white/10 bg-zinc-900 px-5 py-3 text-sm font-bold text-zinc-300">
                Your role: {currentRole ? roleLabels[currentRole] ?? currentRole : "Checking"}
              </span>
              <button
                type="button"
                onClick={() => loadAccess()}
                className="rounded-lg border border-white/10 bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition hover:border-red-500"
              >
                Refresh
              </button>
            </div>
          </div>

          {message && (
            <p className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100">
              {message}
            </p>
          )}

          <div className="mt-8 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Accounts" value={stats.totalAdmins} />
            <StatCard label="Super admins" value={stats.superAdmins} />
            <StatCard label="Admins" value={stats.limitedAdmins} />
            <StatCard label="Waiting login" value={stats.pendingLogin} />
          </div>

          <section className="mt-6 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-300">
                Super Admin
              </p>
              <h2 className="mt-2 text-xl font-black">Platform owner control</h2>
              <p className="mt-3 text-sm leading-6 text-red-100/80">
                Super admin access should stay with you or a trusted co-owner
                only. It controls admin access, restricted approvals, payment
                settings and high-risk changes.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-400">
                Admin
              </p>
              <h2 className="mt-2 text-xl font-black">Tournament operator access</h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Admins are for your club directors or trusted platform helpers.
                They can run day-to-day tournament work, but they stay under
                Super Admin control and cannot grant admin access or approve
                protected requests.
              </p>
            </div>
          </section>

          <div className="mt-3 grid gap-3 md:grid-cols-3">
            <MiniStat label="Linked logins" value={stats.linkedAdmins} />
            <MiniStat label="Suspended" value={stats.suspendedAdmins} />
            <MiniStat
              label="Organisation access"
              value={stats.activeOrganisationAdmins}
            />
          </div>

          {!isSuperAdmin && !loading && (
            <p className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-4 text-sm leading-6 text-yellow-100">
              You can view admin access, but only a super admin can approve
              restricted requests or change admin roles.
            </p>
          )}

          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                    Roles
                  </p>
                  <h2 className="mt-2 text-2xl font-black">Admin accounts</h2>
                </div>
                <input
                  type="search"
                  value={adminSearch}
                  onChange={(event) => setAdminSearch(event.target.value)}
                  placeholder="Search admins"
                  className="rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-red-500"
                />
              </div>

              {loading ? (
                <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  Loading admin access...
                </p>
              ) : admins.length === 0 ? (
                <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  No admin permissions found.
                </p>
              ) : filteredAdmins.length === 0 ? (
                <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  No admin accounts match this search.
                </p>
              ) : (
                <div className="mt-5 grid gap-3">
                  {filteredAdmins.map((admin) => (
                    <article
                      key={admin.id}
                      className="rounded-xl border border-white/10 bg-zinc-950 p-4"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
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
                            {isCurrentAdmin(admin) && (
                              <span className="rounded-full bg-red-500/10 px-3 py-1 text-xs font-bold text-red-200">
                                Your account
                              </span>
                            )}
                            {admin.role === "super_admin" && (
                              <span className="rounded-full border border-red-500/30 px-3 py-1 text-xs font-bold text-red-200">
                                Protected
                              </span>
                            )}
                          </div>
                          <h3 className="mt-3 text-lg font-black text-white">
                            {admin.display_name || admin.email || admin.admin_user_id}
                          </h3>
                          <p className="mt-1 text-sm text-gray-400">
                            {roleDescriptions[admin.role] ?? "Custom admin role."}
                          </p>
                        </div>
                        <div className="grid gap-2 text-sm text-gray-500 xl:min-w-[180px] xl:text-right">
                          <p>{admin.email ?? "No email recorded"}</p>
                          <p>
                            {admin.admin_user_id
                              ? "Linked to login"
                              : "Waiting for first login"}
                          </p>
                          <p>Added {formatDate(admin.created_at)}</p>
                          {isSuperAdmin &&
                            !isCurrentAdmin(admin) &&
                            admin.role !== "super_admin" && (
                              <div className="flex gap-2 xl:justify-end">
                                <button
                                  type="button"
                                  onClick={() => editAdmin(admin)}
                                  className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-red-500"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    savingAdmin ||
                                    admin.access_status === "Suspended"
                                  }
                                  onClick={() => suspendAdmin(admin)}
                                  className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-bold text-red-200 transition hover:bg-red-500/10 disabled:opacity-40"
                                >
                                  Suspend
                                </button>
                              </div>
                            )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={saveAdmin}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                Add Admin
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Grant director/admin access
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Use this for your two directors or trusted internal helpers.
                Use the exact email they will sign in with. This does not give
                them Super Admin control.
              </p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">Email</span>
                  <input
                    required
                    type="email"
                    value={adminEmail}
                    onChange={(event) => setAdminEmail(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">Name</span>
                  <input
                    value={adminName}
                    onChange={(event) => setAdminName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">Role</span>
                  <select
                    value={adminRole}
                    onChange={(event) => setAdminRole(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  >
                    {editableRoles.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleLabels[roleOption]}
                      </option>
                    ))}
                  </select>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    Super admin promotion stays locked out of normal granting so
                    nobody gets full control by accident.
                  </p>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">Status</span>
                  <select
                    value={adminStatus}
                    onChange={(event) => setAdminStatus(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  >
                    <option>Active</option>
                    <option>Suspended</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={!isSuperAdmin || savingAdmin}
                className="mt-6 w-full rounded-lg bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {savingAdmin ? "Saving..." : "Save admin access"}
              </button>
            </form>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="rounded-2xl border border-white/10 bg-zinc-900 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                    Organisation Scope
                  </p>
                  <h2 className="mt-2 text-2xl font-black">
                    Organisation access
                  </h2>
                </div>
                <span className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-gray-400">
                  {stats.organisationAdmins} scoped account
                  {stats.organisationAdmins === 1 ? "" : "s"}
                </span>
              </div>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                Use this when a school, academy, club or partner should work on
                their own events without receiving platform-owner control.
              </p>

              {organisationAdmins.length === 0 ? (
                <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                  No organisation-scoped access has been granted yet.
                </p>
              ) : (
                <div className="mt-5 grid gap-3">
                  {organisationAdmins.map((admin) => (
                    <article
                      key={admin.id}
                      className="rounded-xl border border-white/10 bg-zinc-950 p-4"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
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
                            {admin.display_name || admin.email}
                          </h3>
                          <p className="mt-1 text-sm text-gray-400">
                            {admin.organisations?.name ?? admin.organisation_id}
                          </p>
                        </div>
                        <div className="grid gap-2 text-sm text-gray-500 xl:min-w-[180px] xl:text-right">
                          <p className="break-all">{admin.email}</p>
                          <p>
                            {admin.admin_user_id
                              ? "Linked to login"
                              : "Waiting for first login"}
                          </p>
                          <p>Added {formatDate(admin.created_at)}</p>
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => editOrganisationAdmin(admin)}
                              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-white transition hover:border-red-500"
                            >
                              Edit
                            </button>
                          )}
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={saveOrganisationAdmin}
              className="rounded-2xl border border-white/10 bg-zinc-900 p-5"
            >
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                Scoped Grant
              </p>
              <h2 className="mt-2 text-2xl font-black">
                Grant organisation access
              </h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                This gives access under one organisation. It is the safer route
                for schools, colleges, clubs and partner tournament teams.
              </p>

              <div className="mt-5 space-y-4">
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">
                    Organisation
                  </span>
                  <select
                    required
                    value={organisationId}
                    onChange={(event) => setOrganisationId(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  >
                    <option value="">Select organisation</option>
                    {organisations.map((organisation) => (
                      <option key={organisation.id} value={organisation.id}>
                        {organisation.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">Email</span>
                  <input
                    required
                    type="email"
                    value={organisationEmail}
                    onChange={(event) => setOrganisationEmail(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">Name</span>
                  <input
                    value={organisationName}
                    onChange={(event) => setOrganisationName(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">Role</span>
                  <select
                    value={organisationRole}
                    onChange={(event) => setOrganisationRole(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  >
                    {organisationRoles.map((roleOption) => (
                      <option key={roleOption} value={roleOption}>
                        {roleLabels[roleOption]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-200">Status</span>
                  <select
                    value={organisationStatus}
                    onChange={(event) => setOrganisationStatus(event.target.value)}
                    className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-red-500"
                  >
                    <option>Active</option>
                    <option>Suspended</option>
                  </select>
                </label>
              </div>

              <button
                type="submit"
                disabled={!isSuperAdmin || savingOrganisationAdmin}
                className="mt-6 w-full rounded-lg bg-red-600 px-5 py-3 font-bold text-white transition hover:bg-red-700 disabled:opacity-50"
              >
                {savingOrganisationAdmin ? "Saving..." : "Save organisation access"}
              </button>
            </form>
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

          <section className="mt-8 rounded-2xl border border-white/10 bg-zinc-900 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-400">
                  Audit
                </p>
                <h2 className="mt-2 text-2xl font-black">Recent access changes</h2>
              </div>
              <span className="rounded-full bg-zinc-950 px-4 py-2 text-xs font-bold text-gray-400">
                Last {auditLogs.length}
              </span>
            </div>

            {auditLogs.length === 0 ? (
              <p className="mt-5 rounded-xl border border-white/10 bg-zinc-950 p-5 text-sm text-gray-400">
                No access changes recorded yet.
              </p>
            ) : (
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {auditLogs.map((log) => (
                  <article
                    key={log.id}
                    className="rounded-xl border border-white/10 bg-zinc-950 p-4"
                  >
                    <p className="text-sm font-black text-white">
                      {log.action_type.replaceAll("_", " ")}
                    </p>
                    <p className="mt-1 break-all text-sm text-gray-400">
                      {log.target_email}
                    </p>
                    <p className="mt-3 text-xs text-gray-500">
                      Role: {log.previous_role ?? "-"} to {log.new_role ?? "-"}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      Status: {log.previous_status ?? "-"} to{" "}
                      {log.new_status ?? "-"}
                    </p>
                    <p className="mt-3 text-xs text-gray-600">
                      {formatDate(log.created_at)}
                    </p>
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

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-xl font-black text-white">{value}</p>
    </div>
  );
}
