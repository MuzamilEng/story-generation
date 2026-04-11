"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface ExpirationState {
    checking: boolean;
    expired: boolean;
    paymentFailed: boolean;
    message: string;
}

export default function PlanExpiredBanner() {
    const { data: session, update: updateSession } = useSession();
    const router = useRouter();
    const [state, setState] = useState<ExpirationState>({
        checking: false,
        expired: false,
        paymentFailed: false,
        message: "",
    });
    const [dismissed, setDismissed] = useState(false);

    const checkExpiration = useCallback(async () => {
        if (!session?.user?.id) return;

        // Only check for paid plans
        const plan = session.user.plan;
        if (!plan || plan === "free") return;

        // Check if stripeCurrentPeriodEnd exists and is in the past
        const periodEnd = session.user.stripeCurrentPeriodEnd;
        if (!periodEnd) return;

        const endDate = new Date(periodEnd);
        if (isNaN(endDate.getTime()) || endDate > new Date()) return;

        // Period has ended — call the check-expiration API
        setState((prev) => ({ ...prev, checking: true }));

        try {
            const res = await fetch("/api/user/subscription/check-expiration", {
                method: "POST",
            });

            if (!res.ok) return;

            const data = await res.json();

            if (data.status === "renewed") {
                // Plan was renewed successfully — refresh session
                await updateSession();
                setState({
                    checking: false,
                    expired: false,
                    paymentFailed: false,
                    message: "",
                });
            } else if (data.status === "expired") {
                setState({
                    checking: false,
                    expired: true,
                    paymentFailed: data.paymentFailed ?? false,
                    message: data.message || "Your plan has expired.",
                });
                // Refresh session so plan reflects "free" everywhere
                await updateSession();
            }
        } catch (err) {
            console.error("[PlanExpiredBanner] Error checking expiration:", err);
        } finally {
            setState((prev) => ({ ...prev, checking: false }));
        }
    }, [session, updateSession]);

    useEffect(() => {
        checkExpiration();
    }, [checkExpiration]);

    if (dismissed || !state.expired) return null;

    return (
        <div style={bannerStyles.wrapper}>
            <div style={bannerStyles.container}>
                <div style={bannerStyles.iconCol}>
                    <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#e74c3c"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="12" cy="12" r="10" />
                        <line x1="12" y1="8" x2="12" y2="12" />
                        <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                </div>
                <div style={bannerStyles.content}>
                    <div style={bannerStyles.title}>Plan Expired</div>
                    <div style={bannerStyles.message}>
                        {state.paymentFailed
                            ? "Your payment could not be processed. Your plan has been moved to Explorer. Premium features like soundscapes and binaural beats have been disabled."
                            : "Your subscription has ended. You are now on the Explorer plan. Upgrade anytime to restore premium features."}
                    </div>
                </div>
                <div style={bannerStyles.actions}>
                    <button
                        style={bannerStyles.upgradeBtn}
                        onClick={() => router.push("/user/manage-subscription")}
                    >
                        Renew Plan
                    </button>
                    <button
                        style={bannerStyles.dismissBtn}
                        onClick={() => setDismissed(true)}
                        aria-label="Dismiss"
                    >
                        &times;
                    </button>
                </div>
            </div>
        </div>
    );
}

const bannerStyles: Record<string, React.CSSProperties> = {
    wrapper: {
        width: "100%",
        background: "rgba(231, 76, 60, 0.08)",
        borderBottom: "1px solid rgba(231, 76, 60, 0.25)",
        zIndex: 100,
        flexShrink: 0,
    },
    container: {
        maxWidth: "1200px",
        margin: "0 auto",
        padding: "0.85rem 1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "12px",
    },
    iconCol: {
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    title: {
        fontWeight: 600,
        fontSize: "0.92rem",
        color: "#e74c3c",
        marginBottom: "2px",
    },
    message: {
        fontSize: "0.82rem",
        color: "rgba(255,255,255,0.75)",
        lineHeight: 1.4,
    },
    actions: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        flexShrink: 0,
    },
    upgradeBtn: {
        padding: "6px 16px",
        fontSize: "0.82rem",
        fontWeight: 600,
        color: "#fff",
        background: "#e74c3c",
        border: "none",
        borderRadius: "8px",
        cursor: "pointer",
        whiteSpace: "nowrap",
    },
    dismissBtn: {
        background: "none",
        border: "none",
        color: "rgba(255,255,255,0.5)",
        fontSize: "1.3rem",
        cursor: "pointer",
        padding: "4px",
        lineHeight: 1,
    },
};
