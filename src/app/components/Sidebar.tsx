'use client'
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import styles from '../styles/Sidebar.module.css';

/* ── Icons ─────────────────────────────────────────────────────────── */
const HomeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
);

const BookOpenIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
        <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
);

const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

const MicIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M19 10a7 7 0 01-14 0" />
        <line x1="12" y1="19" x2="12" y2="23" />
        <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
);

const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
);

const CreditCardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
        <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
);

const FlaskIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 3h6l1 9H8L9 3z" />
        <path d="M6 21h12a2 2 0 001.8-2.9L17 12H7L4.2 18.1A2 2 0 006 21z" />
    </svg>
);

const LogoutIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
);

const MenuIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="3" y1="6" x2="21" y2="6" />
        <line x1="3" y1="12" x2="21" y2="12" />
        <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
);

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

/* ── Sidebar component ──────────────────────────────────────────────── */
interface SidebarProps {
    /** When true, shows public landing-page links instead of authenticated app links */
    isLandingPage?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ isLandingPage = false }) => {
    const { data: session } = useSession();
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const isFlowPage = [
        '/user/goal-intake-ai',
        '/user/story',
        '/user/voice-recording',
        '/user/audio-download',
    ].some(r => pathname.startsWith(r));

    const userName = session?.user?.name || 'User';
    const userEmail = session?.user?.email || '';
    const userInitials = userName.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);

    // Close sidebar when navigating (mobile)
    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [open]);

    const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

    const mainNav = isLandingPage ? [
        { href: '/', label: 'Home', icon: <HomeIcon /> },
        ...(session ? [{ href: '/user/dashboard', label: 'Dashboard', icon: <HomeIcon /> }] : []),
        { href: '#how', label: 'How It Works', icon: <BookOpenIcon /> },
        { href: '#pricing', label: 'Pricing', icon: <CreditCardIcon /> },
        { href: '/science', label: 'The Science', icon: <FlaskIcon /> },
    ] : [
        { href: '/user/dashboard', label: 'My Dashboard', icon: <HomeIcon /> },
        { href: '/user/stories', label: 'My Stories', icon: <BookOpenIcon /> },
        { href: '/user/voice-recording', label: 'Voice Recording', icon: <MicIcon /> },
        { href: '/user/audio-download', label: 'Audio Download', icon: <DownloadIcon /> },
    ];

    const exploreNav = isLandingPage ? [] : [
        { href: '/science', label: 'The Science', icon: <FlaskIcon /> },
    ];

    const accountNav = (isLandingPage && !session) ? [] : [
        { href: '/user/account-setting', label: 'Account Settings', icon: <SettingsIcon /> },
        { href: '/user/manage-subscription', label: 'Billing & Plan', icon: <CreditCardIcon /> },
    ];

    return (
        <>
            {/* Mobile hamburger */}
            {!open && (
                <button
                    className={`${styles.hamburger} ${isFlowPage ? styles.flowPage : ''}`}
                    onClick={() => setOpen(true)}
                    aria-label="Open menu"
                >
                    <MenuIcon />
                </button>
            )}

            {/* Backdrop */}
            <div
                className={`${styles.overlay} ${open ? styles.visible : ''}`}
                onClick={() => setOpen(false)}
                aria-hidden="true"
            />

            {/* Sidebar */}
            <aside className={`${styles.sidebar} ${open ? styles.open : ''}`}>

                {/* Logo */}
                <div className={styles.logoArea}>
                    <Link href="/" className={styles.logo} onClick={() => setOpen(false)}>
                        Manifest<span>MyStory</span>
                    </Link>
                    <button className={styles.closeBtn} onClick={() => setOpen(false)} aria-label="Close menu">
                        <CloseIcon />
                    </button>
                </div>

                {/* New Story CTA */}
                <div className={styles.newStoryWrap}>
                    <Link
                        href={isLandingPage && session ? "/user/dashboard" : "/user/goal-intake-ai"}
                        className={styles.newStoryBtn}
                    >
                        <PlusIcon />
                        {isLandingPage
                            ? (session ? 'My Dashboard' : 'Create My Story — Free')
                            : 'New Story'
                        }
                    </Link>
                </div>

                {/* Nav */}
                <nav className={styles.navSection}>
                    <div className={styles.navGroup}>
                        <div className={styles.navGroupLabel}>Main</div>
                        {mainNav.map(({ href, label, icon }) => (
                            <Link
                                key={href}
                                href={href}
                                className={`${styles.navItem} ${isActive(href) ? styles.active : ''}`}
                            >
                                {icon}
                                {label}
                            </Link>
                        ))}
                    </div>

                    {exploreNav.length > 0 && (
                        <>
                            <div className={styles.navDivider} />
                            <div className={styles.navGroup}>
                                <div className={styles.navGroupLabel}>Explore</div>
                                {exploreNav.map(({ href, label, icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`${styles.navItem} ${isActive(href) ? styles.active : ''}`}
                                    >
                                        {icon}
                                        {label}
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}

                    {(accountNav.length > 0 || isLandingPage) && (
                        <>
                            <div className={styles.navDivider} />
                            <div className={styles.navGroup}>
                                <div className={styles.navGroupLabel}>Account</div>
                                {accountNav.map(({ href, label, icon }) => (
                                    <Link
                                        key={href}
                                        href={href}
                                        className={`${styles.navItem} ${isActive(href) ? styles.active : ''}`}
                                    >
                                        {icon}
                                        {label}
                                    </Link>
                                ))}

                                {session ? (
                                    <button
                                        className={styles.navItem}
                                        onClick={() => signOut({ callbackUrl: '/' })}
                                    >
                                        <LogoutIcon />
                                        Sign Out
                                    </button>
                                ) : (
                                    <Link href="/auth/signin" className={styles.navItem}>
                                        <LogoutIcon />
                                        Sign In
                                    </Link>
                                )}
                            </div>
                        </>
                    )}
                </nav>

                {/* User footer */}
                <div className={styles.userFooter}>
                    <div className={styles.userRow}>
                        <div className={styles.userAvatar}>{userInitials}</div>
                        <div className={styles.userInfo}>
                            <div className={styles.userName}>{userName}</div>
                            <div className={styles.userEmail}>{userEmail}</div>
                        </div>
                        <button
                            className={styles.logoutBtn}
                            onClick={() => signOut({ callbackUrl: '/' })}
                            title="Sign out"
                            aria-label="Sign out"
                        >
                            <LogoutIcon />
                        </button>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
