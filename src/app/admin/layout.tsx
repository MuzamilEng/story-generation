import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import Link from "next/link";
import styles from "../styles/AdminLayout.module.css";
import AdminLogoutButton from "./AdminLogoutButton"; // We'll create this

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/auth/signin");
  }

  const userName = session.user.name || "Admin";
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.logoArea}>
          <Link href="/" className={styles.logo}>
            Manifest<span>MyStory</span>
          </Link>
          <div className={styles.adminBadge}>Admin Hub</div>
        </div>

        <nav className={styles.nav}>
          <Link href="/admin" className={styles.navItem}>
            <span>📊</span> Dashboard
          </Link>
          <Link href="/admin/users" className={styles.navItem}>
            <span>👥</span> User Management
          </Link>
          <Link href="/admin/beta-codes" className={styles.navItem}>
            <span>🎟️</span> Beta Access
          </Link>
          <Link href="/admin/system-audio" className={styles.navItem}>
            <span>🔊</span> System Audio
          </Link>
        </nav>

        <div className={styles.footer}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userName}>{userName}</div>
          </div>
          <AdminLogoutButton />
        </div>
      </aside>

      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

