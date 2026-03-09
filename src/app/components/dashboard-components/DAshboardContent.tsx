import React from "react";
import {
  FileText,
  Users,
  Zap,
  Clock,
  CheckCircle,
  TrendingUp,
  ChevronRight,
  Sparkles,
  Star
} from "lucide-react";

const DashboardContent = () => {
  const actionCards = [
    {
      id: 1,
      title: "Create Workflow",
      description: "Set up automation",
      iconColor: "purple",
      icon: <Zap size={24} />,
    },
    {
      id: 2,
      title: "Manage Team Members",
      description: "View all Team Members",
      iconColor: "blue",
      icon: <Users size={24} />,
    },
    {
      id: 3,
      title: "White-Label Settings",
      description: "Customize branding",
      iconColor: "yellow",
      icon: <Sparkles size={24} />,
    },
  ];

  const platformStats = [
    { name: "LinkedIn", value: 160 },
    { name: "Instagram", value: 62 },
    { name: "Reels", value: 25 },
  ];

  const activities = [
    {
      id: 1,
      title: "Acme Corp · Q1 Social Campaign",
      time: "2 hours ago",
      status: "completed",
    },
    {
      id: 2,
      title: "Acme Corp · Q1 Social Campaign",
      time: "2 hours ago",
      status: "completed",
    },
    {
      id: 3,
      title: "TechStart Inc · Product Launch",
      time: "5 hours ago",
      status: "pending",
    },
  ];

  return (
    <div style={{ backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <div style={{ maxWidth: "1200px" }}>
        {/* Stats Grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "24px"
        }}>
          {/* Active Team Members Card */}
          <div style={{
            borderRadius: "16px",
            padding: "24px",
            boxShadow: "0 4px 20px rgba(124,58,237,0.15)",
            border: "1px solid rgba(124,58,237,0.2)",
            background: "linear-gradient(135deg, rgba(124,58,237,0.05), rgba(167,139,250,0.1))"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
                color: "white",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(124,58,237,0.3)"
              }}>
                <Zap size={24} />
              </div>
              <div style={{
                padding: "4px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                backgroundColor: "rgba(255,255,255,0.8)",
                color: "#7c3aed",
                border: "1px solid rgba(124,58,237,0.3)"
              }}>
                Active
              </div>
            </div>

            <div style={{ marginBottom: "8px" }}>
              <div style={{ fontSize: "14px", color: "#666", marginBottom: "8px" }}>Active Team Members</div>
              <div style={{ fontSize: "40px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>9</div>
              <div style={{ fontSize: "14px", color: "#777", marginBottom: "16px" }}>9 of 10 seats used</div>
            </div>

            <div style={{ height: "8px", backgroundColor: "rgba(255,255,255,0.5)", borderRadius: "4px", overflow: "hidden", marginBottom: "16px" }}>
              <div style={{ height: "100%", width: "90%", background: "linear-gradient(to right, #7c3aed, #a78bfa)", boxShadow: "0 1px 4px rgba(124,58,237,0.4)" }} />
            </div>

            <button style={{ color: "#7c3aed", fontSize: "14px", fontWeight: 600, border: "none", background: "none", cursor: "pointer", padding: 0 }}>
              Add More Team Members →
            </button>
          </div>

          {/* Posts Generated Card */}
          <div style={{ borderRadius: "16px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0", backgroundColor: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#d1fae5", color: "#10b981", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <FileText size={24} style={{ margin: "auto" }} />
              </div>
              <div style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, backgroundColor: "#d1fae5", color: "#059669", display: "flex", alignItems: "center", gap: "4px" }}>
                <TrendingUp size={12} /> +23%
              </div>
            </div>
            <div style={{ fontSize: "14px", color: "#737373", marginBottom: "8px" }}>Posts Generated</div>
            <div style={{ fontSize: "40px", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px" }}>247</div>
            <div style={{ fontSize: "14px", color: "#a3a3a3", marginBottom: "16px" }}>89 posts this week</div>
            <div style={{ display: "flex", gap: "12px" }}>
              {platformStats.map((platform, index) => (
                <div key={index} style={{ flex: 1, backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px", textAlign: "center" }}>
                  <div style={{ fontSize: "12px", color: "#737373", marginBottom: "4px" }}>{platform.name}</div>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#1a1a1a" }}>{platform.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Approvals Card */}
          <div style={{ borderRadius: "16px", padding: "24px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0", backgroundColor: "white" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
              <div style={{ width: "48px", height: "48px", borderRadius: "12px", backgroundColor: "#fef3c7", color: "#f59e0b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={24} />
              </div>
            </div>
            <div style={{ fontSize: "14px", color: "#737373", marginBottom: "8px" }}>Pending Approvals</div>
            <div style={{ fontSize: "40px", fontWeight: 700, color: "#1a1a1a", marginBottom: "12px" }}>18</div>
            <div style={{ fontSize: "14px", color: "#a3a3a3", marginBottom: "24px" }}>Keep up the great work!</div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "12px", color: "#737373", marginBottom: "4px" }}>Avg. per day</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>8.2 posts</div>
              </div>
              <div>
                <div style={{ fontSize: "12px", color: "#737373", marginBottom: "4px" }}>Most active</div>
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a" }}>Weekdays</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginBottom: "32px"
        }}>
          {actionCards.map((card) => (
            <div
              key={card.id}
              style={{
                borderRadius: "16px",
                padding: "24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                border: "1px solid #f0f0f0",
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                cursor: "pointer",
                transition: "transform 0.2s"
              }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              <div style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: card.iconColor === "purple" ? "#ede9fe" : card.iconColor === "blue" ? "#dbeafe" : "#fef3c7",
                color: card.iconColor === "purple" ? "#7c3aed" : card.iconColor === "blue" ? "#3b82f6" : "#f59e0b",
                flexShrink: 0
              }}>
                {card.icon}
              </div>
              <div>
                <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>{card.title}</h3>
                <p style={{ fontSize: "14px", color: "#737373" }}>{card.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Activity & Upgrade */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px"
        }}>
          <div style={{ borderRadius: "16px", padding: "32px", boxShadow: "0 2px 8px rgba(0,0,0,0.04)", border: "1px solid #f0f0f0", backgroundColor: "white", gridColumn: "span 2" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
              <div>
                <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1a1a", marginBottom: "4px" }}>Recent Activity</h2>
                <p style={{ fontSize: "14px", color: "#737373" }}>Your latest content generations</p>
              </div>
              <button style={{ background: "none", border: "none", color: "#1a1a1a", fontSize: "14px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                View All <ChevronRight size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {activities.map((activity) => (
                <div key={activity.id} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "16px",
                  backgroundColor: "#fafafa",
                  borderRadius: "12px",
                  transition: "background-color 0.2s"
                }}
                  onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f5f5f5")}
                  onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#fafafa")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <div style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "2px solid",
                      backgroundColor: activity.status === "completed" ? "#ede9fe" : "#fef3c7",
                      borderColor: activity.status === "completed" ? "#7c3aed" : "#f59e0b",
                      color: activity.status === "completed" ? "#7c3aed" : "#f59e0b"
                    }}>
                      {activity.status === "completed" ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#1a1a1a", marginBottom: "4px" }}>{activity.title}</h3>
                      <p style={{ fontSize: "12px", color: "#a3a3a3" }}>{activity.time}</p>
                    </div>
                  </div>
                  <div style={{
                    padding: "6px 16px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: 600,
                    backgroundColor: activity.status === "completed" ? "#d1fae5" : "#fed7aa",
                    color: activity.status === "completed" ? "#059669" : "#ea580c"
                  }}>
                    {activity.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            borderRadius: "16px",
            padding: "32px",
            color: "white",
            boxShadow: "0 8px 24px rgba(124, 58, 237, 0.3)",
            display: "flex",
            flexDirection: "column"
          }}>
            <div style={{ width: "48px", height: "48px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "20px" }}>
              <Star size={28} />
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "12px" }}>Upgrade to Pro</h2>
            <p style={{ fontSize: "14px", opacity: 0.95, marginBottom: "24px", lineHeight: 1.5 }}>
              Get unlimited credits and advanced features to supercharge your content creation
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
              {["Unlimited generations", "Advanced analytics", "Priority support"].map((feature, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "14px" }}>
                  <div style={{ width: "20px", height: "20px", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <CheckCircle size={12} />
                  </div>
                  <span>{feature}</span>
                </div>
              ))}
            </div>
            <button style={{
              width: "100%",
              padding: "14px",
              backgroundColor: "white",
              color: "#7c3aed",
              border: "none",
              borderRadius: "12px",
              fontWeight: 700,
              fontSize: "14px",
              cursor: "pointer",
              transition: "transform 0.2s"
            }}
              onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
            >
              View Plans
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardContent;
