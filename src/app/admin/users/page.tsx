"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserRole } from "@/lib/roles";
import { format } from "date-fns";
import { useGlobalUI } from "@/components/ui/global-ui-context";
import styles from "./page.module.css";

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

  // Email compose modal
  const [emailModalTarget, setEmailModalTarget] = useState<User | "all" | null>(null);
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [emailSending, setEmailSending] = useState(false);
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
      <div className={styles.loadingContainer}>
        <div className={styles.spinnerWrapper}>
          <div className={styles.spinner} />
          <span className={styles.srOnly}>Loading users...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageRoot}>
      {/* Header Section */}
      <div className={styles.headerSection}>
        <div>
          <h1 className={styles.pageTitle}>
            User Management
          </h1>
          <p className={styles.pageSubtitle}>
            Manage user accounts, roles, and platform permissions.
          </p>
        </div>
        <button
          onClick={() => {
            setEmailSubject("");
            setEmailBody("");
            setEmailModalTarget("all");
          }}
          className={styles.emailAllButton}
        >
          <svg className={styles.smallIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          Email All Users
        </button>
      </div>

      {/* Users Table Card */}
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2 className={styles.cardTitle}>Member Directory</h2>
          <p className={styles.cardDescription}>Review all registered users and their session status.</p>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.usersTable}>
            <thead>
              <tr className={styles.tableHeadRow}>
                <th className={styles.tableHeadCell}>Name</th>
                <th className={styles.tableHeadCell}>Email</th>
                <th className={styles.tableHeadCell}>Role</th>
                <th className={styles.tableHeadCell}>Status</th>
                <th className={styles.tableHeadCell}>Payment</th>
                <th className={styles.tableHeadCell}>Stories</th>
                <th className={styles.tableHeadCell}>Joined</th>
                <th className={styles.tableHeadCell}>Actions</th>
              </tr>
            </thead>
            <tbody className={styles.tableBody}>
              {users.map((user, index) => {
                const openUpward = users.length > 2 && index >= users.length - 2;
                return (
                  <tr key={user.id} className={styles.tableRow}>
                    <td className={styles.nameCell}>
                      {user.name || "—"}
                    </td>
                    <td className={styles.emailCell}>{user.email}</td>
                    <td className={styles.tableCell}>
                      <select
                        value={user.role}
                        onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                        className={styles.roleSelect}
                      >
                        <option value={UserRole.USER}>User</option>
                        <option value={UserRole.MODERATOR}>Moderator</option>
                        <option value={UserRole.ADMIN}>Admin</option>
                      </select>
                    </td>
                    <td className={styles.tableCell}>
                      <span className={`${styles.statusBadge} ${
                        user.isActive
                          ? styles.statusActive
                          : styles.statusInactive
                      }`}>
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className={styles.paymentCell}>
                      <div className={styles.paymentStack}>
                        {user.hasStripeSubscription ? (
                          <>
                            <span className={`${styles.paymentBadge} ${
                              user.stripeCancelAtPeriodEnd
                                ? styles.paymentStripeCanceling
                                : styles.paymentStripeActive
                            }`}>
                              {user.stripeCancelAtPeriodEnd ? "Stripe Canceling" : "Stripe Active"}
                            </span>
                            <div className={styles.paymentMeta}>
                              {user.stripeSubscriptionId ? `${user.stripeSubscriptionId.slice(0, 10)}...` : "n/a"}
                            </div>
                            <div className={styles.paymentMeta}>
                              {user.stripeCurrentPeriodEnd
                                ? `${user.stripeCancelAtPeriodEnd ? "Ends" : "Renews"}: ${format(new Date(user.stripeCurrentPeriodEnd), "MMM dd, yyyy")}`
                                : "Billing date unavailable"}
                            </div>
                          </>
                        ) : user.isBetaUser ? (
                          <>
                            <span className={`${styles.paymentBadge} ${styles.paymentBeta}`}>
                              Beta Access
                            </span>
                            <div className={styles.paymentMeta}>No Stripe billing</div>
                            <div className={styles.paymentMeta}>
                              {user.betaExpiresAt
                                ? `Expires: ${format(new Date(user.betaExpiresAt), "MMM dd, yyyy")}`
                                : "Expiry unavailable"}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className={styles.paymentMeta}>No active payment data</div>
                            <div className={styles.paymentMetaMuted}>Manual or free access only</div>
                          </>
                        )}
                      </div>
                    </td>
                    <td className={styles.tableCell}>
                      <div className={styles.storyMeta}>
                        <span className={styles.storyCount}>{user.storyCount}</span>
                      </div>
                    </td>
                    <td className={styles.joinedCell}>
                      {format(new Date(user.createdAt), "MMM dd, yyyy")}
                    </td>
                    <td className={styles.actionsCell}>
                      <div className={styles.actionMenuRoot} data-action-menu-root="true">
                        <button
                          data-action-trigger="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenActionMenuUserId((current) => (current === user.id ? null : user.id));
                          }}
                          className={styles.actionTriggerButton}
                        >
                          <svg className={styles.smallIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                          </svg>
                        </button>
                        {openActionMenuUserId === user.id && (
                          <div
                            data-action-menu="true"
                            onClick={(e) => e.stopPropagation()}
                            className={`${styles.actionMenu} ${
                              openUpward ? styles.actionMenuUpward : styles.actionMenuDownward
                            }`}
                          >
                            {user.storyCount > 0 && (
                              <button
                                onClick={() => {
                                  setOpenActionMenuUserId(null);
                                  router.push(`/admin/users/${user.id}/stories`);
                                }}
                                className={styles.actionMenuButton}
                              >
                                Review Stories
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setOpenActionMenuUserId(null);
                                setSelectedUserId(user.id);
                              }}
                              className={styles.actionMenuButton}
                            >
                              Subscription Control
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionMenuUserId(null);
                                setEmailSubject("");
                                setEmailBody("");
                                setEmailModalTarget(user);
                              }}
                              className={styles.actionMenuButton}
                            >
                              Send Email
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionMenuUserId(null);
                                toggleUserStatus(user.id, user.isActive);
                              }}
                              className={`${styles.actionMenuButton} ${
                                user.isActive
                                  ? styles.actionDangerButton
                                  : styles.actionSuccessButton
                              }`}
                            >
                              {user.isActive ? "Deactivate Account" : "Enable Account"}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className={styles.paginationBar}>
          <span className={styles.paginationText}>
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} users
          </span>
          <div className={styles.paginationControls}>
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className={styles.paginationButton}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setPage(p)}
                className={`${styles.pageNumberButton} ${
                  p === page
                    ? styles.paginationButtonActive
                    : styles.paginationButtonInactive
                }`}
              >
                {p}
              </button>
            ))}
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className={styles.paginationButton}
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Control Modal */}
      {selectedUser && (
        <div
          onClick={() => setSelectedUserId(null)}
          className={`${styles.overlay} ${styles.subscriptionOverlay}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${styles.modalCard} ${styles.subscriptionModalCard}`}
          >
            <div className={`${styles.modalHeader} ${styles.modalHeaderGreen}`}>
              <div>
                <h3 className={`${styles.modalTitle} ${styles.modalTitleGreen}`}>Subscription Control</h3>
                <p className={`${styles.modalSubtitle} ${styles.modalSubtitleGreen}`}>
                  {selectedUser.name || "User"} • {selectedUser.email}
                </p>
              </div>
              <button
                onClick={() => setSelectedUserId(null)}
                className={`${styles.modalCloseButton} ${styles.modalCloseButtonGreen}`}
              >
                Close
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Plan Control Section */}
              <div className={styles.controlSection}>
                <span className={styles.controlLabel}>Plan Control</span>
                <select
                  value={selectedUser.plan}
                  disabled={selectedUser.hasStripeSubscription}
                  onChange={(e) => updateUserPlan(selectedUser.id, e.target.value as User["plan"])}
                  className={styles.controlSelect}
                >
                  <option value="free">Explorer</option>
                  <option value="activator">Activator</option>
                  <option value="manifester">Manifester</option>
                  <option value="amplifier">Amplifier</option>
                </select>
              </div>

              {/* Beta Control Section */}
              <div className={styles.controlSection}>
                <span className={styles.controlLabel}>Beta Control</span>
                <select
                  defaultValue=""
                  disabled={
                    assigningBetaUserId === selectedUser.id ||
                    updatingBetaCodeId === selectedUser.activeBetaCodeId
                  }
                  onChange={(e) => handleSubscriptionOptionChange(selectedUser, e.target.value, e.target)}
                  className={styles.controlSelect}
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

              {/* Info Note */}
              <div className={`${styles.infoNote} ${
                selectedUser.hasStripeSubscription
                  ? styles.infoNoteStripe
                  : styles.infoNoteManual
              }`}>
                {selectedUser.hasStripeSubscription
                  ? "Stripe-managed user: plan edits are limited to avoid subscription conflicts."
                  : "Manual control mode: assign beta, reactivate/deactivate beta code, or switch plan."}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModalTarget !== null && (
        <div
          onClick={() => { if (!emailSending) setEmailModalTarget(null); }}
          className={`${styles.overlay} ${styles.emailOverlay}`}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`${styles.modalCard} ${styles.emailModalCard}`}
          >
            <div className={`${styles.modalHeader} ${styles.modalHeaderAmber}`}>
              <div>
                <h3 className={`${styles.modalTitle} ${styles.modalTitleAmber}`}>
                  {emailModalTarget === "all" ? "Email All Users" : `Email: ${(emailModalTarget as User).name || (emailModalTarget as User).email}`}
                </h3>
                <p className={`${styles.modalSubtitle} ${styles.modalSubtitleAmber}`}>
                  {emailModalTarget === "all" ? "Sends to all active users" : (emailModalTarget as User).email}
                </p>
              </div>
              <button
                disabled={emailSending}
                onClick={() => setEmailModalTarget(null)}
                className={`${styles.modalCloseButton} ${styles.modalCloseButtonAmber}`}
              >
                Close
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.emailFieldGroup}>
                <label className={styles.emailLabel}>Subject</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Enter email subject…"
                  disabled={emailSending}
                  className={styles.emailInput}
                />
              </div>

              <div className={styles.emailFieldGroup}>
                <label className={styles.emailLabel}>Message</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder="Write your message here. Each line break becomes a paragraph."
                  rows={8}
                  disabled={emailSending}
                  className={styles.emailTextarea}
                />
              </div>

              <button
                disabled={emailSending || !emailSubject.trim() || !emailBody.trim()}
                onClick={async () => {
                  setEmailSending(true);
                  try {
                    const payload: { subject: string; message: string; userId?: string } = {
                      subject: emailSubject.trim(),
                      message: emailBody.trim(),
                    };
                    if (emailModalTarget !== "all") {
                      payload.userId = (emailModalTarget as User).id;
                    }
                    const res = await fetch("/api/admin/email", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify(payload),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      showToast(data.error || "Failed to send email", "error");
                    } else if (emailModalTarget === "all") {
                      showToast(`Email sent to ${data.sent} user${data.sent !== 1 ? "s" : ""}${data.failed > 0 ? ` (${data.failed} failed)` : ""}`, "success");
                      setEmailModalTarget(null);
                    } else {
                      showToast("Email sent successfully", "success");
                      setEmailModalTarget(null);
                    }
                  } catch {
                    showToast("Failed to send email", "error");
                  } finally {
                    setEmailSending(false);
                  }
                }}
                className={styles.sendEmailButton}
              >
                {emailSending
                  ? "Sending…"
                  : emailModalTarget === "all"
                  ? "Send to All Users"
                  : "Send Email"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}