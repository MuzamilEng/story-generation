"use client";
import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import styles from "../../styles/CreateAccount.module.css";

// Icons as components
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.7 9.05 7.4c1.39.07 2.36.76 3.17.8 1.21-.24 2.37-.98 3.66-.9 1.56.13 2.73.76 3.49 1.94-3.19 1.91-2.43 6.12.73 7.3-.57 1.56-1.3 3.09-2.05 3.74zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const EyeIcon = ({ isVisible }: { isVisible: boolean }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    {isVisible ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <polyline points="22,6 12,13 2,6" />
  </svg>
);

const ArrowIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

interface StepItemProps {
  number: number;
  label: string;
  status: "done" | "active" | "pending";
}

const StepItem: React.FC<StepItemProps> = ({ number, label, status }) => (
  <div className={`${styles.stepItem} ${styles[status]}`}>
    <div className={styles.stepNum}>
      {status === "done" ? <CheckIcon /> : number}
    </div>
    {label}
  </div>
);

const CreateAccountForm: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/user/dashboard";
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    terms: false,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showVerify, setShowVerify] = useState(false);
  const [errors, setErrors] = useState({
    firstName: false,
    email: false,
    password: false,
  });
  const [strength, setStrength] = useState({
    width: "0%",
    color: "var(--border)",
    text: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    document.title = "ManifestMyStory — Create Your Account";
    const link = document.createElement("link");
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  useEffect(() => {
    validateForm();
  }, [formData]);

  const validateForm = () => {
    const newErrors = {
      firstName: formData.firstName.trim() === "",
      email: !formData.email.includes("@"),
      password: formData.password.length < 8,
    };
    setErrors(newErrors);
  };

  const checkStrength = (password: string) => {
    let score = 0;
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    const levels = [
      { width: "0%", color: "var(--border)", text: "" },
      { width: "25%", color: "var(--red)", text: "Weak" },
      { width: "50%", color: "var(--gold)", text: "Fair" },
      { width: "75%", color: "var(--accent-mid)", text: "Good" },
      { width: "100%", color: "var(--accent)", text: "Strong ✓" },
    ];
    setStrength(levels[Math.min(score, 4)]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === "checkbox" ? checked : value,
    }));

    if (id === "password") {
      checkStrength(value);
    }
  };

  const handleSocial = async (provider: string) => {
    await signIn(provider.toLowerCase(), { callbackUrl: "/user/dashboard" });
  };

  const isFormValid = () => {
    return (
      formData.firstName.trim() !== "" &&
      formData.email.includes("@") &&
      formData.password.length >= 8 &&
      formData.terms
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.terms || !isFormValid()) return;

    setIsLoading(true);
    setApiError("");

    try {
      const name = `${formData.firstName} ${formData.lastName}`.trim();
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setApiError(data.error || "An error occurred during signup.");
        setIsLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        setApiError(
          "Account created but sign in failed. Please sign in manually.",
        );
        setIsLoading(false);
      } else {
        // Hard navigation so the session cookie is sent on the very first request
        window.location.href = nextUrl;
      }
    } catch (error) {
      setApiError("An unexpected error occurred. Please try again.");
      setIsLoading(false);
    }
  };

  const resendEmail = () => {
    // Implement resend logic
    alert("Verification email resent!");
  };

  const goToPricing = () => {
    router.push("/pricing");
  };

  return (
    <div className={styles.container}>
      <div className={styles.topbar}>
        <div className={styles.logo}>
          Manifest<span>MyStory</span>
        </div>
        <div className={styles.topbarRight}>
          Already have an account? <Link href="/auth/signin">Sign in</Link>
        </div>
      </div>

      <div className={styles.stepsBar}>
        <div className={styles.stepsRow}>
          <StepItem number={1} label="Your Goals" status="done" />
          <StepItem number={2} label="Your Story" status="done" />
          <StepItem number={3} label="Free Sample" status="done" />
          <StepItem number={4} label="Create Account" status="active" />
          <StepItem number={5} label="Choose Plan" status="pending" />
          <StepItem number={6} label="Full Audio" status="pending" />
        </div>
      </div>

      <div className={styles.page}>
        {/* LEFT PREVIEW */}
        <div className={styles.leftPreview}>
          <div className={styles.previewLabel}>Your approved story</div>
          <div className={styles.previewCard}>
            <div className={styles.previewTop}>
              <div className={styles.previewEyebrow}>
                Personal Manifestation Story
              </div>
              <div className={styles.previewTitle}>
                A Day in the Life of My Highest Self
              </div>
              <div className={styles.previewMeta}>
                1,740 words · ~13 min audio
              </div>
            </div>
            <div className={styles.previewBody}>
              <div className={styles.previewExcerpt}>
                I open my eyes before my alarm has a chance to sound. The room
                is quiet except for the low hum of the sea beyond the open
                window — that familiar rhythm that has become the backdrop of my
                whole life here…
              </div>
              <div className={styles.previewLocked}>
                <LockIcon />
                Audio locked — create account to continue
              </div>
            </div>
          </div>

          <div className={styles.whatYouGet}>
            <div className={styles.wygTitle}>What you're unlocking</div>
            {[
              "Your story saved to your account forever",
              "Audio generated in your own voice",
              "Downloadable MP3 to listen anytime",
              "Morning & night reminder notifications",
              "Story library — update as you grow",
            ].map((text, i) => (
              <div key={i} className={styles.wygRow}>
                <div className={styles.wygCheck}>
                  <CheckIcon />
                </div>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: FORM */}
        <div className={styles.formCol}>
          <div className={styles.formHeader}>
            <div className={styles.formEyebrow}>Almost there</div>
            <h1 className={styles.formTitle}>
              Save your story.
              <br />
              <em>Hear your future.</em>
            </h1>
            <p className={styles.formSub}>
              Create a free account to record your voice and generate your
              personal audio story. No credit card required.
            </p>
          </div>

          {/* SOCIAL LOGINS */}
          <div className={styles.socialBtns}>
            <button
              className={styles.socialBtn}
              onClick={() => handleSocial("Google")}
            >
              <div className={styles.socialIcon}>
                <GoogleIcon />
              </div>
              Continue with Google
            </button>
            <button
              className={styles.socialBtn}
              onClick={() => handleSocial("Apple")}
            >
              <div className={styles.socialIcon}>
                <AppleIcon />
              </div>
              Continue with Apple
            </button>
          </div>

          <div className={styles.orRow}>or create account with email</div>

          {/* EMAIL FORM */}
          {!showVerify ? (
            <form
              className={styles.formCard}
              id="formCard"
              onSubmit={handleSubmit}
            >
              {apiError && (
                <div
                  className={`${styles.fieldErr} ${styles.show}`}
                  style={{
                    display: "block",
                    marginBottom: "1rem",
                    color: "var(--red)",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                >
                  {apiError}
                </div>
              )}
              <div className={styles.fieldRow}>
                <div className={styles.field}>
                  <label htmlFor="firstName">First name</label>
                  <input
                    type="text"
                    id="firstName"
                    placeholder="Sarah"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={errors.firstName ? styles.err : ""}
                  />
                  <span
                    className={`${styles.fieldErr} ${errors.firstName ? styles.show : ""}`}
                  >
                    Please enter your first name
                  </span>
                </div>
                <div className={styles.field}>
                  <label htmlFor="lastName">Last name</label>
                  <input
                    type="text"
                    id="lastName"
                    placeholder="Johnson"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </div>
              </div>

              <div className={styles.field}>
                <label htmlFor="email">Email address</label>
                <input
                  type="email"
                  id="email"
                  placeholder="sarah@example.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className={errors.email ? styles.err : ""}
                />
                <span
                  className={`${styles.fieldErr} ${errors.email ? styles.show : ""}`}
                >
                  Please enter a valid email
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="password">Password</label>
                <div className={styles.pwWrap}>
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    placeholder="At least 8 characters"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={errors.password ? styles.err : ""}
                  />
                  <button
                    type="button"
                    className={styles.pwToggle}
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <EyeIcon isVisible={showPassword} />
                  </button>
                </div>
                <div className={styles.strengthRow}>
                  <div className={styles.strengthTrack}>
                    <div
                      className={styles.strengthBar}
                      style={{
                        width: strength.width,
                        background: strength.color,
                      }}
                    />
                  </div>
                  <div
                    className={styles.strengthText}
                    style={{ color: strength.color }}
                  >
                    {strength.text}
                  </div>
                </div>
                <span
                  className={`${styles.fieldErr} ${errors.password ? styles.show : ""}`}
                >
                  Password must be at least 8 characters
                </span>
              </div>

              <div className={styles.termsRow}>
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.terms}
                  onChange={handleInputChange}
                />
                <label htmlFor="terms">
                  I agree to the <Link href="/terms">Terms of Service</Link> and{" "}
                  <Link href="/privacy">Privacy Policy</Link>. I understand my
                  voice sample is used only to generate my personal audio story.
                </label>
              </div>

              <button
                type="submit"
                className={styles.submitBtn}
                disabled={!isFormValid() || isLoading}
              >
                {isLoading ? "Creating Account..." : "Create My Free Account"}
                {!isLoading && <ArrowIcon />}
              </button>
            </form>
          ) : (
            /* VERIFY STATE */
            <div className={`${styles.verifyScreen} ${styles.show}`}>
              <div className={styles.verifyIcon}>
                <EmailIcon />
              </div>
              <div className={styles.verifyTitle}>Check your email</div>
              <div className={styles.verifySub}>
                We sent a verification link to{" "}
                <span className={styles.verifyEmail}>{formData.email}</span>.
                Click the link to confirm your account and continue.
              </div>
              <div className={styles.verifyActions}>
                <button className={styles.verifyNextBtn} onClick={goToPricing}>
                  I've verified my email — Continue
                  <ArrowIcon />
                </button>
                <button className={styles.resendBtn} onClick={resendEmail}>
                  Resend verification email
                </button>
              </div>
              <div className={styles.verifyNoteRow}>
                <LockIcon />
                Your story is saved and waiting for you
              </div>
            </div>
          )}

          {!showVerify && (
            <>
              <div className={styles.signinNote}>
                Already have an account?{" "}
                <Link href="/auth/signin">Sign in here</Link>
              </div>

              <div className={styles.securityRow}>
                <div className={styles.secItem}>
                  <LockIcon /> Encrypted
                </div>
                <div className={styles.secItem}>
                  <CheckIcon /> No spam
                </div>
                <div className={styles.secItem}>
                  <CheckIcon /> Cancel anytime
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const CreateAccount: React.FC = () => (
  <Suspense fallback={<div />}>
    <CreateAccountForm />
  </Suspense>
);

export default CreateAccount;
