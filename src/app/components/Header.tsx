"use client";
import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import styles from "../styles/Header.module.css";
import { useStoryStore } from "@/store/useStoryStore";

/* ── Icons ─────────────────────────────────────────────────────────── */
const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
  </svg>
);

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 01-2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

const CreditCardIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </svg>
);

/* ── Progress Step Component ────────────────────────────────────────── */
const StepItem: React.FC<{
  number: number;
  label: string;
  status: "done" | "active" | "pending";
}> = ({ number, label, status }) => (
  <div className={`${styles.stepItem} ${styles[status]}`}>
    <div className={styles.stepNum}>
      {status === "done" ? (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          style={{ width: 10, height: 10 }}
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ) : (
        number
      )}
    </div>
    <span className={styles.stepLabel}>{label}</span>
  </div>
);

const Header: React.FC = () => {
  const { data: session } = useSession();
  const { clearStore } = useStoryStore();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [exploreOpen, setExploreOpen] = useState(false);
  const exploreTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastScrollY = useRef(0);
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleExploreEnter = () => {
    if (exploreTimeout.current) clearTimeout(exploreTimeout.current);
    setExploreOpen(true);
  };

  const handleExploreLeave = () => {
    exploreTimeout.current = setTimeout(() => {
      setExploreOpen(false);
    }, 150); // 150ms delay to make the hover more forgiving
  };

  const handleLinkClick = () => {
    if (exploreTimeout.current) clearTimeout(exploreTimeout.current);
    setExploreOpen(false);
  };

  const userName = session?.user?.name || "User";
  const userEmail = session?.user?.email || "";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);

  const isFlowPage = [
    "/user/goal-intake-ai",
    "/user/story",
    "/user/voice-recording",
    "/user/audio-download",
  ].some((r) => pathname.startsWith(r));

  const isPublicHeader = !pathname.startsWith("/user/");

  const getFlowSteps = (path: string) => {
    const isLoggedIn = !!session;
    const steps = [
      { id: "goals", label: "Goals", href: "/user/goal-intake-ai" },
      { id: "story", label: "Your Story", href: "/user/story" },
      ...(isLoggedIn
        ? []
        : [{ id: "account", label: "Account", href: "/auth/signup" }]),
      { id: "voice", label: "Voice Recording", href: "/user/voice-recording" },
      { id: "audio", label: "Your Audio", href: "/user/audio-download" },
    ];

    return steps.map((s, idx) => {
      let status: "done" | "active" | "pending" = "pending";
      const currentIdx = steps.findIndex((step) => path.startsWith(step.href));

      if (idx < currentIdx) status = "done";
      else if (idx === currentIdx) status = "active";

      return { ...s, status, number: idx + 1 };
    });
  };

  const steps = isFlowPage ? getFlowSteps(pathname) : [];

  useEffect(() => {
    const handleScroll = () => {
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);

      const currentScrollY = window.scrollY;
      setScrolled(currentScrollY > 10);
      setIsVisible(true); // Temporarily keep it always visible to confirm stickiness

      lastScrollY.current = currentScrollY;

      // Reveal when scrolling stops
      scrollTimeout.current = setTimeout(() => {
        setIsVisible(true);
      }, 500);
    };
    window.addEventListener("scroll", handleScroll);

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout.current) clearTimeout(scrollTimeout.current);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleDropdown = () => setDropdownOpen(!dropdownOpen);

  return (
    <header
      className={`${styles.topbar} ${isFlowPage ? styles.hasSteps : ""} ${scrolled ? styles.scrolled : ""} ${isPublicHeader ? styles.public : ""} ${!isVisible ? styles.hidden : ""}`}
    >
      {/* Top Row: Main Nav & Logo */}
      <div className={styles.topbarContent}>
        <Link href="/" className={styles.logo}>
          Manifest<span>MyStory</span>
        </Link>

        {isPublicHeader ? (
          <nav className={styles.topbarNav}>
            <Link href="/#how" className={styles.navLink}>
              How it works
            </Link>
            <div
              className={styles.dropdownWrapper}
              onMouseEnter={handleExploreEnter}
              onMouseLeave={handleExploreLeave}
            >
              <button
                className={`${styles.navLink} ${exploreOpen ? styles.active : ""}`}
              >
                Explore why it works <span className={styles.chevron}></span>
              </button>
              <div
                className={`${styles.dropdownMenu} ${exploreOpen ? styles.open : ""}`}
              >
                <Link
                  href="/science"
                  className={styles.dropdownItem}
                  onClick={handleLinkClick}
                >
                  <span className={styles.ddTitle}>The Science</span>
                  <span className={styles.ddSub}>
                    Neuroscience, the RAS & theta waves
                  </span>
                </Link>
                <div className={styles.ddDivider} />
                <Link
                  href="/quantum"
                  className={styles.dropdownItem}
                  onClick={handleLinkClick}
                >
                  <span className={styles.ddTitle}>The Quantum Field</span>
                  <span className={styles.ddSub}>
                    Observer effect & possibility
                  </span>
                </Link>
                <div className={styles.ddDivider} />
                <Link
                  href="/mystical"
                  className={styles.dropdownItem}
                  onClick={handleLinkClick}
                >
                  <span className={styles.ddTitle}>Ancient Wisdom</span>
                  <span className={styles.ddSub}>
                    What every tradition practiced
                  </span>
                </Link>
              </div>
            </div>
            <Link
              href="/pricing"
              className={`${styles.navLink} ${pathname === "/pricing" ? styles.active : ""}`}
            >
              Pricing
            </Link>
            {session && (
              <>
                <Link href="/user/dashboard" className={styles.navLink}>
                  Dashboard
                </Link>
                <Link href="/feedback" className={styles.navLink}>
                  Feedback
                </Link>
              </>
            )}
          </nav>
        ) : (
          <nav className={styles.topbarNav}>
            <Link
              href="/user/dashboard"
              className={`${styles.navLink} ${pathname === "/user/dashboard" ? styles.active : ""}`}
            >
              Dashboard
            </Link>
            <Link
              href="/user/stories"
              className={`${styles.navLink} ${pathname === "/user/stories" ? styles.active : ""}`}
            >
              My Stories
            </Link>
            <div
              className={styles.dropdownWrapper}
              onMouseEnter={handleExploreEnter}
              onMouseLeave={handleExploreLeave}
            >
              <button
                className={`${styles.navLink} ${exploreOpen ? styles.active : ""}`}
              >
                Explore <span className={styles.chevron}></span>
              </button>
              <div
                className={`${styles.dropdownMenu} ${exploreOpen ? styles.open : ""}`}
              >
                <Link
                  href="/science"
                  className={styles.dropdownItem}
                  onClick={handleLinkClick}
                >
                  <span className={styles.ddTitle}>The Science</span>
                  <span className={styles.ddSub}>
                    Neuroscience, the RAS & theta waves
                  </span>
                </Link>
                <div className={styles.ddDivider} />
                <Link
                  href="/quantum"
                  className={styles.dropdownItem}
                  onClick={handleLinkClick}
                >
                  <span className={styles.ddTitle}>Quantum Theory</span>
                  <span className={styles.ddSub}>
                    Observer effect & possibility
                  </span>
                </Link>
                <div className={styles.ddDivider} />
                <Link
                  href="/mystical"
                  className={styles.dropdownItem}
                  onClick={handleLinkClick}
                >
                  <span className={styles.ddTitle}>Ancient Wisdom</span>
                  <span className={styles.ddSub}>
                    What every tradition practiced
                  </span>
                </Link>
              </div>
            </div>
            <Link
              href="/pricing"
              className={`${styles.navLink} ${pathname === "/pricing" ? styles.active : ""}`}
            >
              Pricing
            </Link>
            <Link
              href="/user/account-setting"
              className={`${styles.navLink} ${pathname === "/user/account-setting" ? styles.active : ""}`}
            >
              Settings
            </Link>
            <Link
              href="/user/manage-subscription"
              className={`${styles.navLink} ${pathname.startsWith("/user/manage-subscription") ? styles.active : ""}`}
            >
              Manage Subscription
            </Link>
            <Link
              href="/feedback"
              className={`${styles.navLink} ${pathname === "/feedback" ? styles.active : ""}`}
            >
              Feedback
            </Link>
          </nav>
        )}

        <div className={styles.topbarRight}>
          {session ? (
            <>
              <div
                className={styles.newStoryBtn}
                onClick={() => {
                  clearStore();
                  window.location.href = "/user/goal-intake-ai";
                }}
                style={{ cursor: "pointer" }}
              >
                <PlusIcon />
                New story
              </div>

              <div className={styles.avatarWrapper} ref={dropdownRef}>
                <button
                  className={styles.avatarBtn}
                  onClick={toggleDropdown}
                  aria-label="Account menu"
                >
                  {userInitials}
                </button>

                <div
                  className={`${styles.avatarDropdown} ${dropdownOpen ? styles.open : ""}`}
                >
                  <div className={styles.ddUser}>
                    <div className={styles.ddName}>{userName}</div>
                    <div className={styles.ddEmail}>{userEmail}</div>
                  </div>
                  <Link
                    href="/user/account-setting"
                    className={styles.ddItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <SettingsIcon />
                    Account Settings
                  </Link>
                  <Link
                    href="/user/manage-subscription"
                    className={styles.ddItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    <CreditCardIcon />
                    Manage Subscription
                  </Link>
                  <div className={styles.ddSep} />
                  <button
                    className={`${styles.ddItem} ${styles.logout}`}
                    onClick={() => {
                      setDropdownOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                  >
                    <LogoutIcon />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Link href="/user/goal-intake-ai" className={styles.navCta}>
              Start free →
            </Link>
          )}
        </div>
      </div>

      {/* Bottom Row (Flow Pages only): Progress Steps */}
      {isFlowPage && (
        <div className={styles.stepsBar}>
          <div className={styles.stepsRow}>
            {steps.map((step, idx) => (
              <StepItem
                key={idx}
                number={step.number}
                label={step.label}
                status={step.status}
              />
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
