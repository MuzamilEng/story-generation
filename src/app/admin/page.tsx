import { Users, UserCheck, Shield, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/roles";
import styles from "../styles/AdminDashboard.module.css";

async function getAdminStats() {
  const [totalUsers, activeUsers, adminUsers, recentSignups] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { role: UserRole.ADMIN } }),
    prisma.user.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
        },
      },
    }),
  ]);

  return {
    totalUsers,
    activeUsers,
    adminUsers,
    recentSignups,
  };
}

export default async function AdminDashboard() {
  const stats = await getAdminStats();

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          System <em>Overview</em>
        </h1>
        <p className={styles.subtitle}>
          Real-time metrics and health status of your application.
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Total Users</span>
            <Users size={18} style={{ color: "#52b788" }} />
          </div>
          <div>
            <div className={styles.cardValue}>{stats.totalUsers}</div>
            <p className={styles.cardSub}>Registered accounts</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Active Users</span>
            <UserCheck size={18} style={{ color: "#52b788" }} />
          </div>
          <div>
            <div className={styles.cardValue}>{stats.activeUsers}</div>
            <p className={styles.cardSub}>Currently active</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Administrators</span>
            <Shield size={18} style={{ color: "#ffb347" }} />
          </div>
          <div>
            <div className={styles.cardValue}>{stats.adminUsers}</div>
            <p className={styles.cardSub}>Privileged access</p>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>New Growth</span>
            <Activity size={18} style={{ color: "#52b788" }} />
          </div>
          <div>
            <div className={styles.cardValue}>{stats.recentSignups}</div>
            <p className={styles.cardSub}>Last 30 days</p>
          </div>
        </div>
      </div>

      <div className={styles.mainGrid}>
        <div className={styles.card}>
          <div>
            <h3 className={styles.sectionTitle}>Quick Access</h3>
            <p className={styles.sectionSub}>Frequent management tasks</p>
          </div>
          <div className={styles.actionList}>
            {[
              { label: "User Management", href: "/admin/users", icon: "👥" },
              { label: "Beta System", href: "/admin/beta-codes", icon: "🎟️" },
              { label: "Sound Assets", href: "/admin/soundscapes", icon: "🎵" },
            ].map(link => (
              <a
                key={link.href}
                href={link.href}
                className={styles.actionLink}
              >
                <span>{link.icon}</span> {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className={styles.card}>
          <div>
            <h3 className={styles.sectionTitle}>System Infrastructure</h3>
            <p className={styles.sectionSub}>Core service availability</p>
          </div>
          <div className={styles.serviceStatus}>
            {[
              { name: "Database Cluster", status: "Healthy", color: "#52b788" },
              { name: "Authentication API", status: "Active", color: "#52b788" },
              { name: "Storage Service (R2)", status: "Online", color: "#52b788" },
              { name: "ElevenLabs API", status: "Operational", color: "#52b788" },
            ].map(svc => (
              <div key={svc.name} className={styles.serviceRow}>
                <span className={styles.serviceName}>{svc.name}</span>
                <div className={styles.statusIndicator}>
                  <div className={styles.statusDot} style={{ backgroundColor: svc.color }} />
                  <span className={styles.statusText} style={{ color: svc.color }}>{svc.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
