"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/roles";
import { format } from "date-fns";
import { useGlobalUI } from "@/components/ui/global-ui-context";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  plan: "free" | "activator" | "manifester" | "amplifier";
  isActive: boolean;
  isBetaUser: boolean;
  betaSource: string | null;
  activeBetaCodeId: string | null;
  activeBetaCode: string | null;
  activeBetaCodeType: string | null;
  activeBetaCodeIsActive: boolean | null;
  betaExpiresAt: string | null;
  hasStripeSubscription: boolean;
  stripeSubscriptionId: string | null;
  stripeCurrentPeriodEnd: string | null;
  stripeCancelAtPeriodEnd: boolean;
  createdAt: string;
  lastLogin: string | null;
  storyCount: number;
}

const planLabels: Record<User["plan"], string> = {
  free: "Explorer",
  activator: "Activator",
  manifester: "Manifester",
  amplifier: "Amplifier",
};

export default function UserManagement() {
  const router = useRouter();
  const { showToast, showConfirm } = useGlobalUI();
  const [users, setUsers] = useState<User[]>([]);
  const [updatingBetaCodeId, setUpdatingBetaCodeId] = useState<string | null>(null);
  const [assigningBetaUserId, setAssigningBetaUserId] = useState<string | null>(null);
  const [openActionMenuUserId, setOpenActionMenuUserId] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 5;

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest('[data-action-menu-root="true"]')) {
        return;
      }
      setOpenActionMenuUserId(null);
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [page]);

  const fetchUsers = async (p: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/users?page=${p}&limit=${limit}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUserBetaCodeStatus = (user: User) => {
    if (!user.activeBetaCodeId) {
      showToast("No beta code linked to this user", "error");
      return;
    }

    const currentActive = Boolean(user.activeBetaCodeIsActive);
    const nextActive = !currentActive;
    showConfirm({
      title: nextActive ? "Reactivate Beta Code" : "Deactivate Beta Code",
      message: nextActive
        ? "This beta code will be active again and can be used if redemptions are available."
        : "This beta code will be deactivated and assigned users may lose beta benefits.",
      confirmText: nextActive ? "Reactivate" : "Deactivate",
      danger: true,
      onConfirm: async () => {
        setUpdatingBetaCodeId(user.activeBetaCodeId);
        setUsers((prev) =>
          prev.map((item) =>
            item.id === user.id
              ? {
                  ...item,
                  activeBetaCodeIsActive: nextActive,
                }
              : item,
          ),
        );

        try {
          const response = await fetch(`/api/admin/beta-codes/${user.activeBetaCodeId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ isActive: nextActive }),
          });

          if (!response.ok) {
            setUsers((prev) =>
              prev.map((item) =>
                item.id === user.id
                  ? {
                      ...item,
                      activeBetaCodeIsActive: currentActive,
                    }
                  : item,
              ),
            );
            showToast(`Failed to ${nextActive ? "reactivate" : "deactivate"} beta code`, "error");
            return;
          }

          const data = await response.json();
          if (!nextActive && data.affectedUsers > 0) {
            showToast(`Beta code deactivated. ${data.affectedUsers} user(s) moved off beta.`, "success");
          } else {
            showToast(`Beta code ${nextActive ? "reactivated" : "deactivated"}`, "success");
          }

          fetchUsers(page);
        } catch (error) {
          setUsers((prev) =>
            prev.map((item) =>
              item.id === user.id
                ? {
                    ...item,
                    activeBetaCodeIsActive: currentActive,
                  }
                : item,
            ),
          );
          console.error("Failed to update beta code:", error);
          showToast("Failed to update beta code", "error");
        } finally {
          setUpdatingBetaCodeId(null);
        }
      },
    });
  };

  const assignTwoMonthBeta = async (user: User) => {
    if (user.hasStripeSubscription) {
      showToast("Cannot assign beta code to Stripe-managed subscription", "error");
      return;
    }

    setAssigningBetaUserId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignBetaTwoMonths: true }),
      });

      if (!response.ok) {
        showToast("Failed to assign 2-month beta code", "error");
        return;
      }

      const data = await response.json();
      setUsers((prevUsers) =>
        prevUsers.map((item) =>
          item.id === user.id ? { ...item, ...data.user } : item,
        ),
      );
      showToast("2-month beta code activated for user", "success");
    } catch (error) {
      console.error("Failed to assign beta code:", error);
      showToast("Failed to assign 2-month beta code", "error");
    } finally {
      setAssigningBetaUserId(null);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to update user role:", error);
    }
  };

  const updateUserPlan = async (userId: string, newPlan: User["plan"]) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan: newPlan }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, ...data.user } : user,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to update user plan:", error);
    }
  };

  const revokeUserBeta = async (userId: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ revokeBeta: true }),
      });

      if (response.ok) {
        const data = await response.json();
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.id === userId ? { ...user, ...data.user } : user,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to revoke beta access:", error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, isActive: !currentStatus } : user,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };

  const handleSubscriptionOptionChange = async (
    user: User,
    value: string,
    selectElement: HTMLSelectElement,
  ) => {
    if (!value) return;

    if (value === "assign_beta") {
      await assignTwoMonthBeta(user);
    }

    if (value === "toggle_beta" && user.activeBetaCodeId) {
      toggleUserBetaCodeStatus(user);
    }

    if (value === "revoke_beta") {
      await revokeUserBeta(user.id);
    }

    selectElement.value = "";
  };

  const selectedUser = selectedUserId
    ? users.find((user) => user.id === selectedUserId) ?? null
    : null;

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "64px", color: "rgba(255, 255, 255, 0.4)" }}>
        Loading users...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", color: "#fff" }}>
      <div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(1.4rem, 5vw, 2.5rem)", fontWeight: 700, marginBottom: "8px" }}>
          User <em>Management</em>
        </h2>
        <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.55)" }}>
          Manage user accounts, roles, and platform permissions.
        </p>
      </div>

      <div
        style={{
          width: "100%",
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          overflow: "visible",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ padding: "24px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, fontFamily: "'Fraunces', serif" }}>Member Directory</h3>
          <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.45)" }}>
            Review all registered users and their session status.
          </p>
        </div>

        <div style={{ overflowX: "auto", overflowY: "visible", position: "relative", zIndex: 1 }}>
          <table
            style={{
              width: "100%",
              minWidth: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr
                style={{ 
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)", 
                  textAlign: "left",
                  backgroundColor: "rgba(255, 255, 255, 0.02)"
                }}
              >
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Name</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Email</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Role</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Status</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Payment</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Stories</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Joined</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => {
                const openUpward = index >= users.length - 2;
                return (
                <tr key={user.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", transition: "background-color 0.15s" }}>
                  <td style={{ padding: "16px 20px", fontWeight: 500, color: "#fff" }}>
                    {user.name || "N/A"}
                  </td>
                  <td style={{ padding: "16px 20px", color: "rgba(255, 255, 255, 0.6)" }}>{user.email}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateUserRole(user.id, e.target.value as UserRole)
                      }
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        color: "#fff",
                        fontSize: "0.85rem",
                        outline: "none"
                      }}
                    >
                      <option value={UserRole.USER}>User</option>
                      <option value={UserRole.MODERATOR}>Moderator</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "99px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        backgroundColor: user.isActive ? "rgba(82, 183, 136, 0.1)" : "rgba(255, 255, 255, 0.05)",
                        color: user.isActive ? "#52b788" : "rgba(255, 255, 255, 0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em"
                      }}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", minWidth: "220px" }}>
                    <div style={{ display: "grid", gap: "6px" }}>
                      {user.hasStripeSubscription ? (
                        <>
                          <span
                            style={{
                              display: "inline-flex",
                              width: "fit-content",
                              padding: "4px 10px",
                              borderRadius: "999px",
                              backgroundColor: user.stripeCancelAtPeriodEnd ? "rgba(232, 168, 56, 0.12)" : "rgba(82, 183, 136, 0.12)",
                              color: user.stripeCancelAtPeriodEnd ? "#e8a838" : "#52b788",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            {user.stripeCancelAtPeriodEnd ? "Stripe Canceling" : "Stripe Active"}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                            Subscription: {user.stripeSubscriptionId ? `${user.stripeSubscriptionId.slice(0, 10)}...` : "n/a"}
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                            {user.stripeCurrentPeriodEnd
                              ? `${user.stripeCancelAtPeriodEnd ? "Ends" : "Renews"}: ${format(new Date(user.stripeCurrentPeriodEnd), "MMM dd, yyyy")}`
                              : "Billing date unavailable"}
                          </span>
                        </>
                      ) : user.isBetaUser ? (
                        <>
                          <span
                            style={{
                              display: "inline-flex",
                              width: "fit-content",
                              padding: "4px 10px",
                              borderRadius: "999px",
                              backgroundColor: "rgba(201, 168, 76, 0.12)",
                              color: "#d8ba64",
                              fontSize: "0.68rem",
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            Beta Access
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                            No Stripe billing
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                            {user.betaExpiresAt
                              ? `Expires: ${format(new Date(user.betaExpiresAt), "MMM dd, yyyy")}`
                              : "Expiry unavailable"}
                          </span>
                        </>
                      ) : (
                        <>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.55)", lineHeight: 1.4 }}>
                            No active payment data
                          </span>
                          <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.4)", lineHeight: 1.4 }}>
                            Manual or free access only
                          </span>
                        </>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: "rgba(255, 255, 255, 0.8)", fontWeight: 600 }}>{user.storyCount}</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", color: "rgba(255, 255, 255, 0.4)", whiteSpace: "nowrap", minWidth: "130px" }}>
                    {format(new Date(user.createdAt), "MMM dd, yyyy")}
                  </td>
                  <td style={{ padding: "16px 20px", position: "relative" }}>
                    <div style={{ position: "relative", width: "fit-content", marginLeft: "auto" }} data-action-menu-root="true">
                      <button
                        data-action-trigger="true"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenActionMenuUserId((current) => (current === user.id ? null : user.id));
                        }}
                        style={{
                          listStyle: "none",
                          cursor: "pointer",
                          width: "28px",
                          height: "28px",
                          borderRadius: "8px",
                          border: "1px solid rgba(255,255,255,0.1)",
                          display: "grid",
                          placeItems: "center",
                          color: "rgba(255,255,255,0.75)",
                          backgroundColor: "rgba(255,255,255,0.08)",
                          userSelect: "none",
                          transition: "all 0.2s ease",
                          position: "relative",
                          zIndex: 21000,
                        }}
                      >
                        ...
                      </button>
                      {openActionMenuUserId === user.id && (
                        <div
                          data-action-menu="true"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            position: "absolute",
                            right: 0,
                            top: openUpward ? "auto" : "34px",
                            bottom: openUpward ? "34px" : "auto",
                            minWidth: "180px",
                            background: "linear-gradient(180deg, rgba(17, 20, 30, 0.98), rgba(10, 12, 18, 0.98))",
                            border: "1px solid rgba(255,255,255,0.14)",
                            borderRadius: "12px",
                            padding: "10px",
                            zIndex: 21000,
                            display: "grid",
                            gap: "6px",
                            boxShadow: "0 14px 34px rgba(0,0,0,0.45)",
                            animation: "actionMenuIn 160ms ease-out",
                            transformOrigin: openUpward ? "bottom right" : "top right",
                          }}
                        >
                        {user.storyCount > 0 && (
                          <button
                            onClick={() => {
                              setOpenActionMenuUserId(null);
                              router.push(`/admin/users/${user.id}/stories`);
                            }}
                            style={{
                              padding: "8px 10px",
                              borderRadius: "8px",
                              border: "1px solid rgba(255, 255, 255, 0.1)",
                              backgroundColor: "rgba(255, 255, 255, 0.06)",
                              color: "rgba(255, 255, 255, 0.82)",
                              cursor: "pointer",
                              fontSize: "0.75rem",
                              fontWeight: 500,
                              textAlign: "left",
                            }}
                          >
                            Review Stories
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setOpenActionMenuUserId(null);
                            setSelectedUserId(user.id);
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            backgroundColor: "rgba(255, 255, 255, 0.06)",
                            color: "rgba(255, 255, 255, 0.82)",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            textAlign: "left",
                          }}
                        >
                          Subscription Control
                        </button>
                        <button
                          onClick={() => {
                            setOpenActionMenuUserId(null);
                            toggleUserStatus(user.id, user.isActive);
                          }}
                          style={{
                            padding: "8px 10px",
                            borderRadius: "8px",
                            border: "1px solid rgba(255, 255, 255, 0.1)",
                            backgroundColor: "transparent",
                            color: user.isActive ? "rgba(255, 107, 107, 0.9)" : "#52b788",
                            cursor: "pointer",
                            fontSize: "0.75rem",
                            fontWeight: 500,
                            textAlign: "left",
                          }}
                        >
                          {user.isActive ? "Deactivate Account" : "Enable Account"}
                        </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.06)",
            fontSize: "0.85rem",
            color: "rgba(255, 255, 255, 0.45)",
          }}
        >
          <span>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} users
          </span>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: page <= 1 ? "rgba(255,255,255,0.2)" : "#fff",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                fontSize: "0.8rem",
              }}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid",
                  borderColor: p === page ? "#52b788" : "rgba(255, 255, 255, 0.1)",
                  backgroundColor: p === page ? "rgba(82, 183, 136, 0.15)" : "rgba(255, 255, 255, 0.05)",
                  color: p === page ? "#52b788" : "rgba(255, 255, 255, 0.6)",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                  fontWeight: p === page ? 600 : 400,
                }}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              style={{
                padding: "6px 14px",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                backgroundColor: "rgba(255, 255, 255, 0.05)",
                color: page >= totalPages ? "rgba(255,255,255,0.2)" : "#fff",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                fontSize: "0.8rem",
              }}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {selectedUser && (
        <div
          onClick={() => setSelectedUserId(null)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(5, 8, 14, 0.68)",
            backdropFilter: "blur(2px)",
            zIndex: 12000,
            display: "grid",
            placeItems: "center",
            padding: "20px",
            animation: "modalOverlayFadeIn 180ms ease-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(760px, 100%)",
              borderRadius: "18px",
              border: "1px solid rgba(97, 191, 149, 0.34)",
              background: "radial-gradient(circle at top right, rgba(63, 160, 117, 0.28), transparent 38%), linear-gradient(180deg, rgba(9, 24, 19, 0.98), rgba(7, 16, 14, 0.99))",
              boxShadow: "0 24px 64px rgba(0,0,0,0.55)",
              overflow: "hidden",
              animation: "modalPanelIn 220ms cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          >
            <div
              style={{
                padding: "18px 22px",
                borderBottom: "1px solid rgba(97, 196, 152, 0.3)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(90deg, rgba(52, 151, 109, 0.24), rgba(12, 45, 32, 0.06))",
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#ecfff6" }}>Subscription Control</h3>
                <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "rgba(200, 244, 222, 0.78)" }}>
                  {selectedUser.name || "User"} • {selectedUser.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                style={{
                  border: "1px solid rgba(116, 208, 166, 0.4)",
                  backgroundColor: "rgba(47, 122, 90, 0.26)",
                  color: "#dcfff0",
                  borderRadius: "8px",
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontSize: "0.8rem",
                }}
              >
                Close
              </button>
            </div>

            <div style={{ padding: "18px 20px", display: "grid", gap: "12px" }}>
              <div
                style={{
                  display: "grid",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(92, 194, 149, 0.33)",
                  background: "linear-gradient(180deg, rgba(29, 88, 63, 0.32), rgba(20, 61, 45, 0.34))",
                }}
              >
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(188, 247, 216, 0.88)" }}>
                  Plan Control
                </span>
              <select
                value={selectedUser.plan}
                disabled={selectedUser.hasStripeSubscription}
                onChange={(e) => updateUserPlan(selectedUser.id, e.target.value as User["plan"])}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(108, 208, 166, 0.38)",
                  backgroundColor: selectedUser.hasStripeSubscription ? "rgba(24, 56, 43, 0.56)" : "rgba(33, 94, 68, 0.52)",
                  color: selectedUser.hasStripeSubscription ? "rgba(198, 241, 221, 0.62)" : "#ecfff6",
                  outline: "none",
                  fontSize: "0.9rem",
                }}
              >
                <option value="free">Explorer</option>
                <option value="activator">Activator</option>
                <option value="manifester">Manifester</option>
                <option value="amplifier">Amplifier</option>
              </select>
              </div>

              <div
                style={{
                  display: "grid",
                  gap: "8px",
                  padding: "12px",
                  borderRadius: "12px",
                  border: "1px solid rgba(84, 170, 129, 0.34)",
                  background: "linear-gradient(180deg, rgba(30, 76, 55, 0.3), rgba(18, 53, 39, 0.32))",
                }}
              >
                <span style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(172, 236, 202, 0.88)" }}>
                  Beta Control
                </span>
              <select
                defaultValue=""
                disabled={
                  assigningBetaUserId === selectedUser.id ||
                  updatingBetaCodeId === selectedUser.activeBetaCodeId
                }
                onChange={(e) => handleSubscriptionOptionChange(selectedUser, e.target.value, e.target)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(98, 196, 154, 0.4)",
                  backgroundColor: "rgba(33, 88, 63, 0.5)",
                  color: "#ebfff5",
                  outline: "none",
                  fontSize: "0.9rem",
                }}
              >
                <option value="">Subscription & Beta Options</option>
                <option value="meta_plan" disabled>Plan: {planLabels[selectedUser.plan]}</option>
                {selectedUser.hasStripeSubscription ? (
                  <option value="meta_stripe" disabled>Stripe-managed subscription</option>
                ) : (
                  <option value="assign_beta">Assign 2-Month Beta</option>
                )}
                {(selectedUser.isBetaUser || Boolean(selectedUser.activeBetaCodeId)) && (
                  <>
                    <option value="meta_beta" disabled>
                      {selectedUser.activeBetaCode ? `Beta Code: ${selectedUser.activeBetaCode}` : "Beta Access: Enabled"}
                    </option>
                    {selectedUser.betaExpiresAt && (
                      <option value="meta_expiry" disabled>
                        Expires: {format(new Date(selectedUser.betaExpiresAt), "MMM dd, yyyy")}
                      </option>
                    )}
                    {selectedUser.activeBetaCodeId ? (
                      <option value="toggle_beta">
                        {selectedUser.activeBetaCodeIsActive ? "Deactivate Beta Code" : "Reactivate Beta Code"}
                      </option>
                    ) : (
                      <option value="revoke_beta">Deactivate Beta Access</option>
                    )}
                  </>
                )}
              </select>
              </div>

              <div
                style={{
                  fontSize: "0.82rem",
                  color: "rgba(207, 247, 226, 0.92)",
                  lineHeight: 1.5,
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: selectedUser.hasStripeSubscription
                    ? "1px solid rgba(103, 198, 154, 0.32)"
                    : "1px solid rgba(88, 171, 132, 0.32)",
                  backgroundColor: selectedUser.hasStripeSubscription
                    ? "rgba(28, 80, 58, 0.24)"
                    : "rgba(20, 66, 48, 0.24)",
                }}
              >
                {selectedUser.hasStripeSubscription
                  ? "Stripe-managed user: plan edits are limited to avoid subscription conflicts."
                  : "Manual control mode: assign beta, reactivate/deactivate beta code, or switch plan."}
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes actionMenuIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes modalOverlayFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes modalPanelIn {
          from {
            opacity: 0;
            transform: translateY(16px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>

    </div>
  );
}
