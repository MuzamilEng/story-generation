import { prisma } from "@/lib/prisma";
import styles from "../../styles/AdminDashboard.module.css";

async function getBetaStats() {
  const [total, activated, survey1, survey2, signups] = await Promise.all([
    prisma.betaSignup.count(),
    prisma.betaSignup.count({ where: { activated_at: { not: null } } }),
    prisma.betaSignup.count({ where: { survey1_completed_at: { not: null } } }),
    prisma.betaSignup.count({ where: { survey2_completed_at: { not: null } } }),
    prisma.betaSignup.findMany({
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true,
        first_name: true,
        email: true,
        access_code: true,
        referral: true,
        status: true,
        activated_at: true,
        survey1_completed_at: true,
        survey2_completed_at: true,
        email_day1_sent_at: true,
        email_day2_sent_at: true,
        email_day7_sent_at: true,
        created_at: true,
      },
    }),
  ]);

  return { total, activated, survey1, survey2, signups };
}

function fmt(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminBetaPage() {
  const stats = await getBetaStats();

  return (
    <div className={styles.dashboard}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          Beta <em>Signups</em>
        </h1>
        <p className={styles.subtitle}>
          {stats.total} signups &middot; {stats.activated} activated &middot; {stats.survey1} Day 2 surveys &middot; {stats.survey2} Day 7 surveys
        </p>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Total Signups</span>
          </div>
          <div className={styles.cardValue}>{stats.total}</div>
          <p className={styles.cardSub}>of 500 spots</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Activated</span>
          </div>
          <div className={styles.cardValue}>{stats.activated}</div>
          <p className={styles.cardSub}>entered code &amp; signed up</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Day 2 Surveys</span>
          </div>
          <div className={styles.cardValue}>{stats.survey1}</div>
          <p className={styles.cardSub}>first impressions</p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Day 7 Surveys</span>
          </div>
          <div className={styles.cardValue}>{stats.survey2}</div>
          <p className={styles.cardSub}>pricing pulse</p>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: "700px", borderCollapse: "collapse", fontSize: "0.82rem", color: "rgba(255,255,255,0.75)" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", textAlign: "left" }}>
              <th style={{ padding: "10px 12px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Name</th>
              <th style={{ padding: "10px 12px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Email</th>
              <th style={{ padding: "10px 12px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Code</th>
              <th style={{ padding: "10px 12px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Source</th>
              <th style={{ padding: "10px 12px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Signed Up</th>
              <th style={{ padding: "10px 12px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Activated</th>
              <th style={{ padding: "10px 12px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>S1</th>
              <th style={{ padding: "10px 12px", fontWeight: 500, color: "rgba(255,255,255,0.45)", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>S2</th>
            </tr>
          </thead>
          <tbody>
            {stats.signups.map((s) => (
              <tr key={s.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: "10px 12px" }}>{s.first_name}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{s.email}</td>
                <td style={{ padding: "10px 12px", fontFamily: "monospace", fontSize: "0.75rem", color: "#8DBF7A" }}>{s.access_code}</td>
                <td style={{ padding: "10px 12px" }}>{s.referral || "—"}</td>
                <td style={{ padding: "10px 12px", color: "rgba(255,255,255,0.5)" }}>{fmt(s.created_at)}</td>
                <td style={{ padding: "10px 12px" }}>{s.activated_at ? <span style={{ color: "#8DBF7A" }}>✓</span> : "—"}</td>
                <td style={{ padding: "10px 12px" }}>{s.survey1_completed_at ? <span style={{ color: "#8DBF7A" }}>✓</span> : "—"}</td>
                <td style={{ padding: "10px 12px" }}>{s.survey2_completed_at ? <span style={{ color: "#C9A84C" }}>✓</span> : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
