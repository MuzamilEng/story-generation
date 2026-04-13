"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import s from "../styles/SplashV6.module.css";

/**
 * Shared public navigation bar used on unauthenticated content pages
 * (science, quantum, mystical). Mirrors the home page nav style with
 * the "Why it works" dropdown.
 */
const PublicNav: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();

  const isWhyActive = ["/why-it-works", "/science", "/quantum", "/mystical"].includes(pathname);

  return (
    <>
      <nav className={s.nav}>
        <Link href="/" className={s.navLogo}>Manifest My Story</Link>
        <ul className={s.navTabs}>
          <li>
            <Link href="/#how" className={s.navTabLink}>How it works</Link>
          </li>
          <li className={s.navDropdown}>
            <Link
              href="/why-it-works"
              className={`${s.navDropdownTrigger} ${isWhyActive ? s.navDropdownTriggerActive : ""}`}
            >
              Why it works ▾
            </Link>
            <div className={s.navDropdownMenu}>
              <Link href="/why-it-works" className={s.navDropdownItem}>Overview</Link>
              <Link href="/science" className={s.navDropdownItem}>The Science</Link>
              <Link href="/quantum" className={s.navDropdownItem}>The Quantum Field</Link>
              <Link href="/mystical" className={s.navDropdownItem}>Ancient Wisdom</Link>
            </div>
          </li>
          <li>
            <Link href="/our-story" className={`${s.navTabLink} ${pathname === "/our-story" ? s.navTabLinkActive : ""}`}>Our story</Link>
          </li>
        </ul>
        <div className={s.navRight}>
          <Link href="/auth/signin" className={s.navSignIn}>Sign In</Link>
          <Link href="/#invite" className={s.navInvite}>Request invitation</Link>
        </div>

        {/* Hamburger */}
        <button
          className={s.navMobileBtn}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 12h18M3 6h18M3 18h18" /></svg>
          )}
        </button>
      </nav>

      {/* MOBILE SIDEBAR */}
      <div
        className={`${s.mobileMenuOverlay} ${isMenuOpen ? s.mobileMenuOverlayOpen : ""}`}
        onClick={() => setIsMenuOpen(false)}
      />
      <div className={`${s.mobileMenu} ${isMenuOpen ? s.mobileMenuOpen : ""}`}>
        <ul className={s.mobileNavTabs}>
          <li>
            <Link href="/#how" className={s.mobileNavTabLink} onClick={() => setIsMenuOpen(false)}>How it works</Link>
          </li>
          <li>
            <Link
              href="/why-it-works"
              className={`${s.mobileNavTabLink} ${isWhyActive ? s.mobileNavTabLinkActive : ""}`}
              onClick={() => setIsMenuOpen(false)}
            >
              Why it works
            </Link>
            <ul className={s.mobileNavDropdownItems}>
              <li><Link href="/science" className={s.mobileNavDropdownItem} onClick={() => setIsMenuOpen(false)}>The Science</Link></li>
              <li><Link href="/quantum" className={s.mobileNavDropdownItem} onClick={() => setIsMenuOpen(false)}>The Quantum Field</Link></li>
              <li><Link href="/mystical" className={s.mobileNavDropdownItem} onClick={() => setIsMenuOpen(false)}>Ancient Wisdom</Link></li>
            </ul>
          </li>
          <li>
            <Link href="/our-story" className={s.mobileNavTabLink} onClick={() => setIsMenuOpen(false)}>Our story</Link>
          </li>
        </ul>
        <div className={s.mobileNavRight}>
          <Link href="/auth/signin" className={s.mobileNavSignIn} onClick={() => setIsMenuOpen(false)}>Sign In</Link>
          <Link href="/#invite" className={s.mobileNavInvite} onClick={() => setIsMenuOpen(false)}>Request invitation</Link>
        </div>
      </div>
    </>
  );
};

export default PublicNav;
