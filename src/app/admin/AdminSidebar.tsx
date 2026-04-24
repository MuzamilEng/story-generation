"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "../styles/AdminLayout.module.css";
import AdminLogoutButton from "./AdminLogoutButton";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: "📊", exact: true },
  { href: "/admin/users", label: "User Management", icon: "👥" },
  { href: "/admin/logs", label: "App Logs", icon: "📜" },
  { href: "/admin/beta", label: "Beta Signups", icon: "📋", exact: true },
  { href: "/admin/beta/surveys", label: "Beta Surveys", icon: "📊" },
  { href: "/admin/system-audio", label: "System Audio", icon: "🔊" },
  { href: "/admin/soundscapes", label: "Background Sounds", icon: "🎵" },
];

export default function AdminSidebar({
  userName,
  initials,
}: {
  userName: string;
  initials: string;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <>
      {/* Mobile header */}
      <div className={styles.mobileHeader}>
        <button
          className={styles.hamburger}
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>
        <span className={styles.mobileTitle}>
          Manifest<span style={{ color: "var(--accent)" }}>MyStory</span> Admin
        </span>
      </div>

      {/* Overlay */}
      {mobileOpen && (
        <div
          className={styles.overlay}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`${styles.sidebar} ${mobileOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.logoArea}>
          <Link href="/" className={styles.logo}>
            Manifest<span>MyStory</span>
          </Link>
          <div className={styles.adminBadge}>Admin Hub</div>
          <button
            className={styles.closeSidebar}
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className={styles.nav}>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`${styles.navItem} ${isActive(item) ? styles.navItemActive : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>

        <div className={styles.footer}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userName}>{userName}</div>
          </div>
          <AdminLogoutButton />
        </div>
      </aside>
    </>
  );
}
