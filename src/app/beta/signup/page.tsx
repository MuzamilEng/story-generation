"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import "../../styles/beta-signup.css";

const TOTAL_SPOTS = 500;
const FALLBACK_COUNT = 101;

const REFERRAL_SOURCES = [
  { value: "", label: "Select a source", disabled: true },
  { value: "reddit", label: "Reddit" },
  { value: "facebook", label: "Facebook group" },
  { value: "forum", label: "Forum / message board" },
  { value: "friend", label: "Friend or referral" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "youtube", label: "YouTube" },
  { value: "podcast", label: "Podcast" },
  { value: "google", label: "Google search" },
  { value: "other", label: "Other" },
];

const DETAIL_SOURCES = ["reddit", "facebook", "forum", "instagram", "tiktok", "youtube", "podcast"];

export default function BetaSignupPage() {
  const [spotsClaimed, setSpotsClaimed] = useState(0);
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [referral, setReferral] = useState("");
  const [referralDetail, setReferralDetail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [btnText, setBtnText] = useState("Claim My Beta Spot →");
  const [btnStyle, setBtnStyle] = useState<React.CSSProperties>({});
  const [errors, setErrors] = useState<{ firstName?: boolean; email?: boolean }>({});
  const firstNameRef = useRef<HTMLInputElement>(null);

  const animateCounter = useCallback((target: number) => {
    const duration = 1200;
    const start = performance.now();
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
    const step = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setSpotsClaimed(Math.round(easeOut(progress) * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, []);

  const loadCounter = useCallback(() => {
    fetch("/api/beta/count")
      .then((r) => {
        if (!r.ok) throw new Error("non-200");
        return r.json();
      })
      .then((data) => {
        const count = data?.count ?? FALLBACK_COUNT;
        setTimeout(() => animateCounter(count), 400);
      })
      .catch(() => {
        setTimeout(() => animateCounter(FALLBACK_COUNT), 400);
      });
  }, [animateCounter]);

  useEffect(() => {
    loadCounter();
  }, [loadCounter]);

  // Scroll reveal
  useEffect(() => {
    const reveals = document.querySelectorAll(".reveal");
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    reveals.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async () => {
    const trimmedName = firstName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrors({ firstName: true });
      firstNameRef.current?.focus();
      return;
    }
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setErrors({ email: true });
      return;
    }

    setIsSubmitting(true);
    setBtnText("Claiming your spot…");
    setBtnStyle({ opacity: 0.6 });

    try {
      const res = await fetch("/api/beta/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: trimmedName,
          email: trimmedEmail,
          referral,
          referralDetail,
        }),
      });
      const data = await res.json();

      if (data.success) {
        setShowSuccess(true);
        loadCounter();
      } else if (data.error === "spots_full") {
        setBtnText("Beta is now full — join the waitlist");
        setBtnStyle({ opacity: 1, background: "var(--gold)" });
        setIsSubmitting(false);
      } else if (data.error === "duplicate") {
        setBtnText("That email is already registered");
        setBtnStyle({ opacity: 1 });
        setIsSubmitting(false);
      } else {
        setShowSuccess(true);
        loadCounter();
      }
    } catch {
      setShowSuccess(true);
      loadCounter();
    }
  };

  return (
    <div className="beta-signup-page">
      <nav className="beta-nav">
        <Link href="/" className="nav-logo">
          Manifest My Story
        </Link>
        <ul className="nav-links">
          <li><Link href="/#how">How it works</Link></li>
          <li><Link href="/why-it-works">Why it works</Link></li>
          <li><Link href="/our-story">Our story</Link></li>
        </ul>
        <Link href="/auth/signin" className="nav-signin">
          Sign In
        </Link>
      </nav>

      <main>
        {/* HERO */}
        <section className="hero">
          <p className="hero-eyebrow">Beta Access — 500 spots only</p>
          <h1 className="hero-headline">
            You found us<br />before the world did.<br />
            <em>That matters.</em>
          </h1>
          <p className="hero-sub">
            ManifestMyStory is open to a founding group of beta testers only. You
            get full access, a direct line to the team, and the chance to shape
            what this becomes.
          </p>

          {/* SPOTS COUNTER */}
          <div className="spots-counter">
            <div className="spots-bar-wrap">
              <div
                className="spots-bar-fill"
                style={{ width: `${(spotsClaimed / TOTAL_SPOTS) * 100}%` }}
              />
            </div>
            <p className="spots-text">
              <strong>{spotsClaimed}</strong> of 500 beta spots claimed
            </p>
          </div>

          {/* FORM */}
          {!showSuccess ? (
            <div className="form-card" id="betaForm">
              <span className="form-card-label">Claim your beta spot</span>

              <div className="form-group">
                <label htmlFor="firstName">First name</label>
                <input
                  ref={firstNameRef}
                  type="text"
                  id="firstName"
                  placeholder="Your first name"
                  autoComplete="given-name"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setErrors((p) => ({ ...p, firstName: false }));
                  }}
                  style={errors.firstName ? { borderColor: "rgba(201,168,76,0.5)" } : undefined}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email address</label>
                <input
                  type="email"
                  id="email"
                  placeholder="you@email.com"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors((p) => ({ ...p, email: false }));
                  }}
                  style={errors.email ? { borderColor: "rgba(201,168,76,0.5)" } : undefined}
                />
              </div>

              <div className="form-group">
                <label htmlFor="referral">How did you find us?</label>
                <select
                  id="referral"
                  value={referral}
                  onChange={(e) => setReferral(e.target.value)}
                >
                  {REFERRAL_SOURCES.map((s) => (
                    <option key={s.value} value={s.value} disabled={s.disabled}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>

              {DETAIL_SOURCES.includes(referral) && (
                <div className="form-group">
                  <label htmlFor="referralOther">Which community or post?</label>
                  <input
                    type="text"
                    id="referralOther"
                    placeholder="e.g. r/lawofattraction, a Facebook group…"
                    value={referralDetail}
                    onChange={(e) => setReferralDetail(e.target.value)}
                  />
                </div>
              )}

              <div className="form-divider" />

              <button
                className="btn-claim"
                onClick={handleSubmit}
                disabled={isSubmitting}
                style={btnStyle}
              >
                {btnText}
              </button>

              <p className="form-fine-print">
                No credit card. No commitment.
                <br />
                Beta access is free for the full testing period.
              </p>
            </div>
          ) : (
            <div className="form-card success-state" style={{ display: "block" }}>
              <div className="success-icon">
                <svg viewBox="0 0 24 24">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p className="success-title">
                You&apos;re in.
                <br />
                Check your inbox.
              </p>
              <p className="success-body">
                Your access code and everything you need to begin is on its way to
                you now.
                <br />
                <br />
                Tonight, you hear your future in your own voice.
              </p>
            </div>
          )}
        </section>

        {/* WHAT YOU GET */}
        <section className="what-section">
          <p className="section-eyebrow reveal">What beta testers receive</p>
          <h2 className="section-headline reveal">
            Full access.
            <br />
            Direct line.
            <br />
            <em>Founding pricing.</em>
          </h2>

          <div className="benefits-grid">
            <div className="benefit-card reveal">
              <p className="benefit-num">01</p>
              <h3 className="benefit-title">Full Amplifier-tier access</h3>
              <p className="benefit-body">
                Every feature, every layer — voice cloning, personalized story,
                hypnotic induction, binaural beats, NLP anchoring, identity
                affirmations. Nothing held back.
              </p>
            </div>
            <div className="benefit-card reveal">
              <p className="benefit-num">02</p>
              <h3 className="benefit-title">Founding member pricing</h3>
              <p className="benefit-body">
                When we launch publicly, your price is locked in at the founding
                rate. Whatever we charge the world, you pay less — permanently.
              </p>
            </div>
            <div className="benefit-card reveal">
              <p className="benefit-num">03</p>
              <h3 className="benefit-title">A direct line to the team</h3>
              <p className="benefit-body">
                Reply to any email and the founding team reads it. You are not a
                support ticket. You are the reason this product gets built right.
              </p>
            </div>
            <div className="benefit-card reveal">
              <p className="benefit-num">04</p>
              <h3 className="benefit-title">Shape what gets built</h3>
              <p className="benefit-body">
                Features, tiers, pricing — your feedback during beta directly
                determines what ships at launch. Most users never get this. You do.
              </p>
            </div>
          </div>
        </section>

        {/* WHAT WE ASK */}
        <section className="ask-section">
          <div className="ask-inner reveal">
            <div className="ask-header">
              <p className="section-eyebrow" style={{ marginBottom: "12px" }}>
                What we ask in return
              </p>
              <p className="ask-header-text">
                Two short surveys. Your honest experience. Nothing more.
              </p>
            </div>
            <div className="ask-body">
              <div className="ask-item">
                <p className="ask-item-label">Day 2 — ~4 minutes</p>
                <p className="ask-item-text">
                  First impressions: onboarding, voice cloning, your story, the
                  audio, and two gut-instinct pricing questions.
                </p>
              </div>
              <div className="ask-item">
                <p className="ask-item-label">Day 7 — ~90 seconds</p>
                <p className="ask-item-text">
                  Four pricing questions after you&apos;ve had real time with the
                  product. This data sets the price at launch.
                </p>
              </div>
              <div className="ask-item">
                <p className="ask-item-label">Honesty over praise</p>
                <p className="ask-item-text">
                  If something doesn&apos;t work, we need to know. A critical
                  response is worth ten times more to us than a perfect rating.
                </p>
              </div>
              <div className="ask-item">
                <p className="ask-item-label">That&apos;s it</p>
                <p className="ask-item-text">
                  No calls unless you volunteer. No ongoing obligations. Just two
                  emails, two surveys, and the full product for the duration of
                  beta.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FOUNDER QUOTE */}
        <section className="quote-section">
          <div className="quote-inner reveal">
            <p className="quote-text">
              &ldquo;The method I am asking you to trust is the same method I used
              to build this platform. I am a living demonstration of the practice.
              The tool works. The work is yours.&rdquo;
            </p>
            <p className="quote-attr">
              — Michael, Founder &nbsp;·&nbsp; ManifestMyStory
            </p>
          </div>
        </section>

        {/* SECOND CTA */}
        <section className="cta-section reveal">
          <h2 className="cta-headline">
            500 spots.
            <br />
            <em>One is yours.</em>
          </h2>
          <p className="cta-sub">
            When they are filled, this closes permanently.
          </p>
          <a
            href="#betaForm"
            className="btn-cta-large"
            onClick={() => firstNameRef.current?.focus()}
          >
            Claim My Spot →
          </a>
        </section>
      </main>

      <footer className="beta-footer">
        <Link href="/" className="footer-logo">
          Manifest My Story
        </Link>
        <p className="footer-copy">
          Copyright © 2026 Manifest My Story. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
