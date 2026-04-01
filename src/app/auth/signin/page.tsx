'use client'
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import styles from '../../styles/SignIn.module.css';
import {
  GoogleIcon,
  AppleIcon,
  CheckIcon,
  EyeIcon,
  EmailIcon,
  LockIcon,
  ShieldIcon,
  WarningIcon,
  ArrowLeftIcon
} from '../../components/icons/AuthIcons';
import { SignInFormData, SignInErrors, Testimonial } from '../../types/auth';

// Brand Feature Component
interface BrandFeatureProps {
  text: string;
}

const BrandFeature: React.FC<BrandFeatureProps> = ({ text }) => (
  <div className={styles.brandFeat}>
    <div className={styles.brandFeatDot}>
      <CheckIcon />
    </div>
    {text}
  </div>
);

// Testimonial Component
const TestimonialCard: React.FC<Testimonial> = ({ text, author }) => (
  <div className={styles.testimonial}>
    <div className={styles.testText}>{text}</div>
    <div className={styles.testAuthor}>{author}</div>
  </div>
);

// Social Button Component
interface SocialButtonProps {
  provider: 'Google' | 'Apple';
  onClick: (provider: string) => void;
}

const SocialButton: React.FC<SocialButtonProps> = ({ provider, onClick }) => (
  <button className={styles.socialBtn} onClick={() => onClick(provider)}>
    <span className={styles.socialIcon}>
      {provider === 'Google' ? <GoogleIcon /> : <AppleIcon />}
    </span>
    Continue with {provider}
  </button>
);

// Field Error Component
interface FieldErrorProps {
  show: boolean;
  message: string;
}

const FieldError: React.FC<FieldErrorProps> = ({ show, message }) => (
  <span className={`${styles.fieldErr} ${show ? styles.show : ''}`}>
    {message}
  </span>
);

const SignIn: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get('next') || '/user/dashboard';

  useEffect(() => {
    document.title = "ManifestMyStory — Sign In";
    const link = document.createElement('link');
    link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&family=Lora:ital,wght@0,400;1,400&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);

    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);

  const [showReset, setShowReset] = useState(false);
  const [showResetSent, setShowResetSent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  const [formData, setFormData] = useState<SignInFormData>({
    email: '',
    password: '',
    remember: true
  });

  const [resetEmail, setResetEmail] = useState('');
  const [errors, setErrors] = useState<SignInErrors>({
    email: false,
    password: false
  });

  // Email validation regex
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateForm = useCallback((): boolean => {
    const newErrors = {
      email: !formData.email || !isValidEmail(formData.email),
      password: !formData.password
    };
    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  }, [formData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : value
    }));

    // Clear field error when user starts typing
    if (id === 'email' || id === 'password') {
      setErrors(prev => ({ ...prev, [id]: false }));
    }
    setShowAlert(false);
  };

  const handleSocial = async (provider: string) => {
    await signIn(provider.toLowerCase(), { callbackUrl: '/user/dashboard' });
  };

  const handleSignIn = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    setShowAlert(false);

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setShowAlert(true);
        setIsLoading(false);
      } else {
        // Fetch session to determine role and redirect accordingly
        const res = await fetch('/api/auth/session');
        const session = await res.json();

        if (session?.user?.role === 'ADMIN') {
          router.push('/admin');
        } else {
          router.push(nextUrl);
        }
      }
    } catch (error) {
      setShowAlert(true);
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (!resetEmail || !isValidEmail(resetEmail)) {
      setErrors(prev => ({ ...prev, email: true }));
      return;
    }

    // Show sent state
    setShowResetSent(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showReset) {
      handleSignIn();
    }
  };

  // Mock testimonial
  const testimonial: Testimonial = {
    text: "I listen every morning before I get out of bed. After three weeks something started shifting. I can't explain it — I just started moving differently toward my goals.",
    author: "— Rachel M., member since 2024"
  };

  return (
    <div className={styles.container}>
      {/* TOP BAR */}
      <header className={styles.topbar}>
        <Link href="/" className={styles.logo}>
          Manifest<span>MyStory</span>
        </Link>
        <div className={styles.topbarRight}>
          New here? <Link href="/auth/signup">Create a free account</Link>
        </div>
      </header>

      <main className={styles.page}>
        {/* LEFT: BRAND PANEL */}
        <aside className={styles.leftPanel}>
          <div className={styles.brandCard}>
            <div className={styles.brandEyebrow}>Welcome back</div>
            <div className={styles.brandQuote}>
              Your story is waiting. The version of you who already lives it is listening.
            </div>
            <div className={styles.brandDivider} />
            <div className={styles.brandFeatures}>
              <BrandFeature text="Your personal story library" />
              <BrandFeature text="Download &amp; replay your audio anytime" />
              <BrandFeature text="Track your daily listening practice" />
            </div>
          </div>

          <TestimonialCard {...testimonial} />
        </aside>

        {/* RIGHT: FORM */}
        <div className={styles.formCol}>
          {/* MAIN LOGIN FORM */}
          {!showReset ? (
            <div id="loginForm">
              <div className={styles.formHeader}>
                <div className={styles.formEyebrow}>Sign in</div>
                <h1 className={styles.formTitle}>
                  Welcome back to<br />
                  <em>your story.</em>
                </h1>
                <p className={styles.formSub}>
                  Sign in to access your story library and audio files.
                </p>
              </div>

              {/* SOCIAL SIGN IN */}
              <div className={styles.socialBtns}>
                <SocialButton provider="Google" onClick={handleSocial} />
                <SocialButton provider="Apple" onClick={handleSocial} />
              </div>

              <div className={styles.orRow}>or sign in with email</div>

              {/* ALERT */}
              <div className={`${styles.alertErr} ${showAlert ? styles.show : ''}`}>
                <WarningIcon />
                <span>Incorrect email or password. Please try again.</span>
              </div>

              <div className={styles.formCard}>
                <div className={styles.field}>
                  <label htmlFor="email">Email address</label>
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="you@example.com"
                    autoComplete="email"
                    className={errors.email ? styles.err : ''}
                  />
                  <FieldError
                    show={errors.email}
                    message="Please enter a valid email address."
                  />
                </div>

                <div className={styles.field}>
                  <div className={styles.labelRow}>
                    <label htmlFor="password">Password</label>
                    <button
                      className={styles.forgotLink}
                      onClick={() => setShowReset(true)}
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className={styles.pwWrap}>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onKeyDown={handleKeyDown}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className={errors.password ? styles.err : ''}
                    />
                    <button
                      className={styles.pwToggle}
                      onClick={() => setShowPassword(!showPassword)}
                      type="button"
                      aria-label="Toggle password visibility"
                    >
                      <EyeIcon isVisible={showPassword} />
                    </button>
                  </div>
                  <FieldError
                    show={errors.password}
                    message="Please enter your password."
                  />
                </div>

                <div className={styles.rememberRow}>
                  <input
                    type="checkbox"
                    id="remember"
                    checked={formData.remember}
                    onChange={handleInputChange}
                  />
                  <label htmlFor="remember">Keep me signed in</label>
                </div>
              </div>

              <button
                className={`${styles.submitBtn} ${isLoading ? styles.loading : ''}`}
                onClick={handleSignIn}
                disabled={isLoading}
              >
                <span className={styles.btnLabel}>Sign in to my account</span>
                <div className={styles.btnSpinner} />
              </button>

              <p className={styles.signupNote}>
                Don't have an account? <Link href="/auth/signup">Create one free</Link>
              </p>

              <div className={styles.securityRow}>
                <div className={styles.secItem}>
                  <LockIcon /> Secure &amp; encrypted
                </div>
                <div className={styles.secItem}>
                  <ShieldIcon /> Private by design
                </div>
              </div>
            </div>
          ) : (
            /* FORGOT PASSWORD PANEL */
            <div className={`${styles.resetScreen} ${styles.show}`}>
              <button className={styles.backLink} onClick={() => setShowReset(false)}>
                <ArrowLeftIcon />
                Back to sign in
              </button>

              <div className={styles.resetIcon}>
                <EmailIcon />
              </div>

              <div className={styles.resetTitle}>Reset your password</div>
              <div className={styles.resetSub}>
                Enter the email address linked to your account and we'll send you a reset link.
              </div>

              {!showResetSent ? (
                <div id="resetFormInner">
                  <div className={styles.field}>
                    <label htmlFor="resetEmail">Email address</label>
                    <input
                      type="email"
                      id="resetEmail"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                    <FieldError
                      show={errors.email}
                      message="Please enter a valid email address."
                    />
                  </div>

                  <button
                    className={styles.submitBtn}
                    onClick={handleReset}
                    style={{ marginBottom: 0 }}
                  >
                    <span className={styles.btnLabel}>Send reset link</span>
                  </button>
                </div>
              ) : (
                <div className={`${styles.resetSent} ${styles.show}`}>
                  <div className={styles.resetSentIcon}>
                    <CheckIcon />
                  </div>
                  <div className={styles.resetSentTitle}>Check your inbox</div>
                  <div className={styles.resetSentText}>
                    We've sent a password reset link to <strong>{resetEmail}</strong>.
                    Check your spam folder if it doesn't arrive within a few minutes.
                  </div>
                  <button
                    className={styles.backLink}
                    onClick={() => setShowReset(false)}
                  >
                    <ArrowLeftIcon />
                    Back to sign in
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const SignInPage: React.FC = () => (
  <Suspense fallback={<div />}>
    <SignIn />
  </Suspense>
);

export default SignInPage;