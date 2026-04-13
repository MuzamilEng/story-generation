"use client";
import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import styles from "../../../styles/Subscription.module.css";
import {
  CheckIcon,
  XIcon,
  ArrowLeftIcon,
} from "../../../components/icons/SubscriptionIcons";
import { BillingRecord, CurrentPlan } from "../../../types/subscription";
import { useGlobalUI } from "@/components/ui/global-ui-context";

// Current Plan Banner Component
interface CurrentPlanBannerProps {
  plan: CurrentPlan;
}

const CurrentPlanBanner: React.FC<CurrentPlanBannerProps> = ({ plan }) => (
  <div className={styles.currentBanner}>
    <div className={styles.cbLeft}>
      <div className={styles.cbEyebrow}>Your current plan</div>
      <div className={styles.cbPlan}>{plan.name}</div>
      <div className={styles.cbPrice}>{plan.price}</div>
    </div>
    <div className={styles.cbRight}>
      {plan.nextRenewal && !isNaN(new Date(plan.nextRenewal).getTime()) && (
        <div className={styles.cbRenewal}>
          {plan.price?.includes("Beta") ? "Program expires" : "Next renewal"}:{" "}
          {format(new Date(plan.nextRenewal), "MMMM d, yyyy")}
        </div>
      )}
      <div className={styles.cbStatus}>
        <span className={styles.cbDot} />
        {plan.status === "active"
          ? "Active"
          : plan.status === "canceling"
            ? "Canceling"
            : plan.status}
      </div>
    </div>
  </div>
);

// Billing History Component
interface BillingHistoryProps {
  records: BillingRecord[];
  onReceiptClick: (record: BillingRecord) => void;
}

const BillingHistory: React.FC<BillingHistoryProps> = ({
  records,
  onReceiptClick,
}) => (
  <div className={styles.billingCard}>
    <div className={styles.billingHead}>Billing History</div>

    {records.map((record, index) => (
      <div key={index} className={styles.billingRow}>
        <div>
          <div className={styles.billingDate}>
            {format(record.date, "MMMM d, yyyy")}
          </div>
          <div className={styles.billingDesc}>{record.description}</div>
        </div>
        <div className={styles.billingRight}>
          <span
            className={`${styles.billingStatus} ${styles[`status-${record.status}`]}`}
          >
            {record.status === "paid" ? "Paid" : record.status}
          </span>
          <span className={styles.billingAmount}>
            ${record.amount.toFixed(2)}
          </span>
          <button
            className={styles.billingReceipt}
            onClick={() => onReceiptClick(record)}
          >
            Receipt
          </button>
        </div>
      </div>
    ))}
  </div>
);

// Cancel Section Component
interface CancelSectionProps {
  nextRenewal?: Date | null;
  onCancel: () => void;
}

const CancelSection: React.FC<CancelSectionProps> = ({
  nextRenewal,
  onCancel,
}) => (
  <div className={styles.cancelSection}>
    <div className={styles.cancelTop}>
      <div>
        <div className={styles.cancelTitle}>Cancel subscription</div>
        <div className={styles.cancelSub}>
          You can cancel at any time with one click.{" "}
          {nextRenewal
            ? `Your plan stays active until the end of your current billing period (${format(nextRenewal, "MMMM d, yyyy")}). `
            : ""}
          Your stories and audio files remain accessible until then.
        </div>
      </div>
      <button className={styles.cancelBtn} onClick={onCancel}>
        Cancel Plan
      </button>
    </div>
    <div className={styles.cancelNote}>
      After cancellation, your account switches to Free. Stories above the free
      limit will be archived and restored if you resubscribe within 90 days.
    </div>
  </div>
);

// Toast Component
interface ToastProps {
  message: string;
  visible: boolean;
}

const Toast: React.FC<ToastProps> = ({ message, visible }) => (
  <div className={`${styles.toast} ${visible ? styles.show : ""}`}>
    {message}
  </div>
);

// Main Component
const Subscription: React.FC = () => {
  const { showConfirm: showGlobalConfirm } = useGlobalUI();
  const [toast, setToast] = useState({ message: "", visible: false });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [subStatus, setSubStatus] = useState<any>(null);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);

  const [isPolling, setIsPolling] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);
  const { update: updateSession } = useSession();

  useEffect(() => {
    // Handle URL parameters for success/canceled
    const searchParams = new URLSearchParams(window.location.search);
    const isSuccess = searchParams.get("success") === "true";
    const isCanceled = searchParams.get("canceled") === "true";

    if (isSuccess) {
      showToast("✓ Payment initiated. Almost ready!");
      setIsPolling(true);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    if (isCanceled) {
      showToast("Checkout canceled.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const fetchData = async () => {
      try {
        const [statusRes, historyRes] = await Promise.all([
          fetch("/api/user/subscription/status"),
          fetch("/api/user/subscription/history"),
        ]);

        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setSubStatus(statusData);

          // If we were polling and the plan has now changed from "free" (or whatever it was), stop polling
          // This logic assumes a success redirect means a plan was actually changed or extended.
          if (isSuccess && isPolling) {
            // We check if the status update reflects new data.
            // For simplicity, if we see a valid subscription ID or period end, we consider it done.
          }
        }
        if (historyRes.ok) {
          const hData = await historyRes.json();
          setBillingRecords(
            hData.map((record: any) => ({
              ...record,
              date: new Date(record.date),
            })),
          );
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
        setInitialLoadDone(true);
      }
    };

    fetchData();
  }, []);

  // Polling effect for plan updates after checkout success
  useEffect(() => {
    if (!isPolling) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch("/api/user/subscription/status");
        if (res.ok) {
          const data = await res.json();

          // Simple check: if we see a non-free plan or a new renewal date, consider it updated
          if (data.plan !== "free" || data.stripeSubscriptionId) {
            setSubStatus(data);
            setIsPolling(false);
            showToast("✓ Subscription active! Enjoy your new features.");
            updateSession(); // Refresh next-auth session so plan is updated across all pages
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error("Polling error:", e);
      }
    }, 3000);

    // Stop polling after 30 seconds max to prevent infinite loops
    const timeout = setTimeout(() => {
      setIsPolling(false);
      clearInterval(interval);
    }, 30000);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isPolling]);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast({ message: "", visible: false }), 3500);
  };

  const currentPlanId = subStatus?.plan || "free";
  const planNamesMap: Record<string, string> = {
    free: "Explorer",
    activator: "Activator",
    manifester: "Manifester",
    amplifier: "Amplifier",
  };

  const nextRenewalDate = subStatus?.stripeCurrentPeriodEnd
    ? new Date(subStatus.stripeCurrentPeriodEnd)
    : null;
  const isDateValid = nextRenewalDate && !isNaN(nextRenewalDate.getTime());

  const isActuallyBeta =
    subStatus?.isBetaUser && !subStatus?.stripeSubscriptionId;

  const currentPlan: CurrentPlan = {
    name: isActuallyBeta
      ? subStatus.betaPlanName || planNamesMap[currentPlanId] || "Beta"
      : planNamesMap[currentPlanId] || "Free",
    price: isActuallyBeta
      ? `${subStatus.betaPlanName || planNamesMap[currentPlanId] || "Beta"} (Beta — 2 month trial)`
      : currentPlanId === "free"
        ? "Free"
        : planNamesMap[currentPlanId] || "Active",
    nextRenewal: isActuallyBeta
      ? subStatus.betaExpiresAt
        ? new Date(subStatus.betaExpiresAt)
        : null
      : isDateValid
        ? nextRenewalDate
        : null,
    status:
      subStatus?.stripeSubscriptionId && subStatus?.stripeCancelAtPeriodEnd
        ? "canceling"
        : subStatus?.stripeSubscriptionId
          ? "active"
          : "active",
  };

  const handleCancel = () => {
    if (actionLoading) return;
    showGlobalConfirm({
      title: "Cancel Subscription",
      message:
        "Cancel your plan? Your subscription will be cancelled immediately.",
      confirmText: "Cancel Plan",
      danger: true,
      onConfirm: async () => {
        try {
          setActionLoading(true);
          const res = await fetch("/api/user/subscription/cancel", {
            method: "POST",
          });

          if (res.ok) {
            showToast("Subscription cancelled successfully.");
            const newStatus = await fetch("/api/user/subscription/status").then(
              (r) => r.json(),
            );
            setSubStatus(newStatus);
          } else {
            const err = await res.text();
            showToast(`Failed to cancel: ${err}`);
          }
        } catch (err) {
          showToast("Error occurred while cancelling.");
        } finally {
          setActionLoading(false);
        }
      },
    });
  };

  const handleReceipt = (record: BillingRecord) => {
    if (record.receiptUrl) {
      window.open(record.receiptUrl, "_blank");
    } else {
      showToast("Receipt not available.");
    }
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <main className={styles.page}>
          <h1 className={styles.pageTitle} style={{ marginTop: "2rem" }}>
            Loading subscription...
          </h1>
        </main>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>ManifestMyStory — Manage Subscription</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap"
          rel="stylesheet"
        />
      </Head>

      <div className={styles.container}>
        <main className={styles.page}>
          {/* Back Link */}
          <Link href="/user/account-setting" className={styles.backLink}>
            <ArrowLeftIcon />
            Back to Account Settings
          </Link>

          <h1 className={styles.pageTitle}>Manage Subscription</h1>
          <p className={styles.pageSub}>
            Upgrade, downgrade, or cancel your plan at any time.
          </p>

          {/* Processing Banner */}
          {isPolling && (
            <div
              style={{
                marginBottom: "2rem",
                padding: "1.2rem 1.5rem",
                background: "rgba(201,168,76,0.08)",
                border: "1px solid rgba(201,168,76,0.25)",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
                color: "#c9a84c",
              }}
            >
              <div
                className={styles.cbDot}
                style={{ background: "#c9a84c", width: 8, height: 8 }}
              />
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.92rem" }}>
                  Payment processing...
                </div>
                <div style={{ fontSize: "0.82rem", opacity: 0.8 }}>
                  We're finalizing your plan. These changes will reflect
                  automatically in a few seconds.
                </div>
              </div>
            </div>
          )}

          {/* Current Plan Banner */}
          <CurrentPlanBanner plan={currentPlan} />

          {/* Billing History */}
          {billingRecords.length > 0 && (
            <BillingHistory
              records={billingRecords}
              onReceiptClick={handleReceipt}
            />
          )}

          {/* Cancel Section */}
          {currentPlanId !== "free" && (
            <CancelSection
              nextRenewal={currentPlan.nextRenewal}
              onCancel={handleCancel}
            />
          )}
        </main>

        {/* Toast */}
        <Toast message={toast.message} visible={toast.visible} />
      </div>
    </>
  );
};

export default Subscription;
