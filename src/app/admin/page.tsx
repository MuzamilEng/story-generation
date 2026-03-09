import { Users, UserCheck, Shield, Activity } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/lib/roles";

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

  const cardStyle = {
    backgroundColor: "white",
    border: "1px solid #e5e5e5",
    borderRadius: "12px",
    padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
  };

  const headerStyle = {
    display: "flex",
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px"
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "30px", fontWeight: 700, letterSpacing: "-0.025em" }}>Admin Dashboard</h2>
        <p style={{ fontSize: "14px", color: "#737373" }}>
          Overview of your application's users and system status.
        </p>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
        gap: "16px"
      }}>
        <div style={cardStyle}>
          <div style={headerStyle}>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Total Users</span>
            <Users size={16} style={{ color: "#737373" }} />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{stats.totalUsers}</div>
            <p style={{ fontSize: "12px", color: "#737373" }}>Registered users</p>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Active Users</span>
            <UserCheck size={16} style={{ color: "#737373" }} />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{stats.activeUsers}</div>
            <p style={{ fontSize: "12px", color: "#737373" }}>Currently active</p>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Administrators</span>
            <Shield size={16} style={{ color: "#737373" }} />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{stats.adminUsers}</div>
            <p style={{ fontSize: "12px", color: "#737373" }}>Admin users</p>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={headerStyle}>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>Recent Signups</span>
            <Activity size={16} style={{ color: "#737373" }} />
          </div>
          <div>
            <div style={{ fontSize: "24px", fontWeight: 700 }}>{stats.recentSignups}</div>
            <p style={{ fontSize: "12px", color: "#737373" }}>Last 30 days</p>
          </div>
        </div>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
        gap: "16px"
      }}>
        <div style={cardStyle}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>Quick Actions</h3>
            <p style={{ fontSize: "14px", color: "#737373" }}>Common administrative tasks</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <a
              href="/admin/users"
              style={{
                display: "block",
                padding: "8px 12px",
                fontSize: "14px",
                borderRadius: "6px",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "transparent",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              Manage Users
            </a>
            <a
              href="/admin/settings"
              style={{
                display: "block",
                padding: "8px 12px",
                fontSize: "14px",
                borderRadius: "6px",
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "transparent",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              System Settings
            </a>
            <button
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: "14px",
                borderRadius: "6px",
                border: "none",
                backgroundColor: "transparent",
                cursor: "pointer",
                transition: "background-color 0.2s"
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
            >
              View Audit Logs
            </button>
          </div>
        </div>

        <div style={cardStyle}>
          <div style={{ marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600 }}>System Status</h3>
            <p style={{ fontSize: "14px", color: "#737373" }}>Current system health</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px" }}>Database</span>
              <span style={{ fontSize: "14px", color: "#16a34a", fontWeight: 500 }}>Healthy</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px" }}>Authentication</span>
              <span style={{ fontSize: "14px", color: "#16a34a", fontWeight: 500 }}>Active</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "14px" }}>API Status</span>
              <span style={{ fontSize: "14px", color: "#16a34a", fontWeight: 500 }}>Online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
