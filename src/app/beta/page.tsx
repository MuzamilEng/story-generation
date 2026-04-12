"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../styles/BetaAccess.module.css";

export default function BetaAccessPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;

    setIsLoading(true);
    setError("");

    try {
      // Validate the code exists and is active
      const res = await fetch("/api/beta/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "That code doesn't look right. Contact us if you need help.");
        setIsLoading(false);
        return;
      }

      // Valid code — redirect to signup with the beta code
      router.push(`/auth/signup?betaCode=${encodeURIComponent(trimmed)}`);
    } catch {
      setError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.logo}>
          Manifest<span>My</span>Story
        </div>

        <h1 className={styles.title}>You&rsquo;ve been invited to test ManifestMyStory</h1>
        <p className={styles.subtitle}>
          Enter your private access code below to create your free account with full feature access.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="betaCode">Access Code</label>
            <input
              id="betaCode"
              type="text"
              className={styles.input}
              placeholder="Enter your access code"
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError("");
              }}
              autoFocus
              autoComplete="off"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={!code.trim() || isLoading}
          >
            {isLoading ? <div className={styles.spinner} /> : "Continue"}
          </button>
        </form>

        <p className={styles.helpText}>
          Don&rsquo;t have a code? <Link href="/">Join the waitlist</Link> to be notified at launch.
        </p>

        <Link href="/" className={styles.backLink}>
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}
