"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

/**
 * Checks if a beta user has completed their first full session
 * (voice cloned + story generated) and hasn't done the feedback survey yet.
 * If so, shows a prompt to take the survey.
 */
export default function FeedbackPrompt() {
  const router = useRouter();
  const { data: session } = useSession();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!session?.user?.id || dismissed) return;

    // Check with the backend if we should show the survey
    // The API checks is_beta + has_completed_survey + voice + story
    const checkSurvey = async () => {
      try {
        const res = await fetch("/api/feedback");
        if (res.ok) {
          const data = await res.json();
          if (data.shouldShowSurvey) {
            setShow(true);
          }
        }
      } catch {
        // Silently fail — don't block the user
      }
    };

    // Delay check to let the user settle in
    const timer = setTimeout(checkSurvey, 5000);
    return () => clearTimeout(timer);
  }, [session, dismissed]);

  if (!show) return null;

  return (
    <div style={{
      position: "fixed",
      bottom: 24,
      right: 24,
      maxWidth: 380,
      background: "rgba(12, 15, 13, 0.95)",
      border: "1px solid var(--border2)",
      borderRadius: 14,
      padding: "28px 24px",
      zIndex: 1000,
      boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
      animation: "fadeUp 0.5s ease both",
    }}>
      <button
        onClick={() => { setShow(false); setDismissed(true); }}
        style={{
          position: "absolute",
          top: 12,
          right: 14,
          background: "none",
          border: "none",
          color: "var(--muted)",
          fontSize: 18,
          cursor: "pointer",
          padding: 4,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>

      <p style={{
        fontFamily: "var(--sans)",
        fontSize: 10,
        letterSpacing: 3,
        textTransform: "uppercase",
        color: "var(--green2)",
        marginBottom: 10,
      }}>
        BETA FEEDBACK
      </p>

      <h3 style={{
        fontFamily: "var(--serif)",
        fontSize: 22,
        fontWeight: 300,
        color: "var(--text)",
        marginBottom: 8,
        lineHeight: 1.3,
      }}>
        We&rsquo;d love your feedback
      </h3>

      <p style={{
        fontFamily: "var(--sans)",
        fontSize: 13,
        color: "var(--muted)",
        lineHeight: 1.7,
        marginBottom: 20,
      }}>
        You&rsquo;ve completed your first story! Take 3 minutes to help us shape the product before launch.
      </p>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => router.push("/feedback")}
          style={{
            flex: 1,
            padding: "10px 20px",
            background: "linear-gradient(135deg, var(--green1), var(--green2))",
            border: "none",
            borderRadius: 8,
            color: "var(--text)",
            fontFamily: "var(--sans)",
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 1,
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Take Survey
        </button>
        <button
          onClick={() => { setShow(false); setDismissed(true); }}
          style={{
            padding: "10px 16px",
            background: "transparent",
            border: "1px solid var(--border2)",
            borderRadius: 8,
            color: "var(--muted)",
            fontFamily: "var(--sans)",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}
