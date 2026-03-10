"use client";

import React, { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Folder,
  Send,
  CreditCard,
  BarChart3,
  Settings,
  Star,
  Plus,
  ChevronRight,
  ChevronLeft,
  LogOut,
  User as UserIcon,
  Shield,
  Search,
  Bell,
} from "lucide-react";
import { useRole } from "@/hooks/use-role";
import { UserRole } from "@/lib/roles";

// Sidebar Component
const ManifestMyStorySidebar = ({
  isCollapsed,
  toggleSidebar,
}: {
  isCollapsed: boolean;
  toggleSidebar: () => void;
}) => {
  const { userRole } = useRole();

  const menuItems = [
    {
      id: 1,
      name: "Dashboard",
      icon: <LayoutDashboard size={20} />,
      href: "/",
    },
    { id: 2, name: "Team Members", icon: <Users size={20} />, href: "/team" },
    { id: 3, name: "My Content", icon: <Folder size={20} />, href: "/content" },
    {
      id: 4,
      name: "Publishing",
      icon: <Send size={20} />,
      href: "/publishing",
    },
    {
      id: 5,
      name: "Billing",
      icon: <CreditCard size={20} />,
      href: "/billing",
    },
    { id: 6, name: "Reports", icon: <BarChart3 size={20} />, href: "/reports" },
    {
      id: 7,
      name: "Settings",
      icon: <Settings size={20} />,
      href: "/settings",
    },
  ];

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: "#faf9f8",
        borderRight: "1px solid #e5e5e5",
        display: "flex",
        flexDirection: "column",
        padding: "24px 0",
        position: "fixed",
        left: 0,
        top: 0,
        transition: "width 0.3s ease",
        width: isCollapsed ? "80px" : "260px",
        zIndex: 100,
        overflowX: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "0 24px",
          marginBottom: "32px",
          justifyContent: isCollapsed ? "center" : "flex-start",
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold",
            fontSize: "20px",
            flexShrink: 0,
          }}
        >
          P
        </div>
        {!isCollapsed && (
          <span
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#1a1a1a",
              marginLeft: "12px",
              whiteSpace: "nowrap",
            }}
          >
            ManifestMyStory
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: "0 12px" }}>
        {menuItems.map((item) => (
          <a
            key={item.id}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              padding: "12px",
              marginBottom: "4px",
              borderRadius: "8px",
              color: "#4a4a4a",
              textDecoration: "none",
              transition: "background-color 0.2s",
              justifyContent: isCollapsed ? "center" : "flex-start",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#f0f0f0")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <div
              style={{
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {item.icon}
            </div>
            {!isCollapsed && (
              <span
                style={{
                  fontSize: "14px",
                  fontWeight: 500,
                  marginLeft: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                {item.name}
              </span>
            )}
          </a>
        ))}
      </nav>

      {/* Upgrade Card */}
      {userRole !== UserRole.ADMIN && (
        <div style={{ padding: "0 12px", marginTop: "16px" }}>
          <div
            style={{
              padding: isCollapsed ? "12px" : "20px",
              background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
              borderRadius: "12px",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: isCollapsed ? "center" : "flex-start",
            }}
          >
            <Star
              size={isCollapsed ? 24 : 32}
              style={{ marginBottom: isCollapsed ? 0 : "12px" }}
            />
            {!isCollapsed && (
              <>
                <div
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    marginBottom: "8px",
                  }}
                >
                  {userRole === UserRole.MODERATOR
                    ? "Admin Access"
                    : "Upgrade Now"}
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    opacity: 0.9,
                    marginBottom: "16px",
                    lineHeight: 1.4,
                  }}
                >
                  {userRole === UserRole.MODERATOR
                    ? "Get full administrative access to manage users and settings."
                    : "Unlock premium features and unlimited storage today."}
                </div>
                <button
                  style={{
                    width: "100%",
                    padding: "8px",
                    backgroundColor: "white",
                    color: "#7c3aed",
                    border: "none",
                    borderRadius: "6px",
                    fontWeight: 600,
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  {userRole === UserRole.MODERATOR
                    ? "Request Admin"
                    : "View Plans"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Header Component
const Header = ({
  isSidebarCollapsed,
  toggleSidebar,
}: {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}) => {
  const { data: session } = useSession();
  const { roleDisplayName, userRole } = useRole();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        backgroundColor: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(229, 229, 229, 0.6)",
        padding: "16px 32px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          onClick={toggleSidebar}
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            border: "1px solid #e5e5e5",
            backgroundColor: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
          }}
        >
          {isSidebarCollapsed ? (
            <ChevronRight size={16} />
          ) : (
            <ChevronLeft size={16} />
          )}
        </button>
        <div>
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#1a1a1a",
              marginBottom: "4px",
            }}
          >
            Welcome back, {session?.user?.name || "User"} 👋
          </h1>
          <p style={{ fontSize: "14px", color: "#737373" }}>
            Here's what's happening with your content today
          </p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <button
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "10px 20px",
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            fontWeight: 600,
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
          }}
        >
          <Plus size={16} />
          Add New Client
        </button>

        {/* User Menu */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "50%",
              border: "none",
              padding: 0,
              cursor: "pointer",
              overflow: "hidden",
              backgroundColor: "#f4f4f4",
            }}
          >
            {session?.user?.image ? (
              <img
                src={session.user.image}
                alt={session.user.name || ""}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "#7c3aed",
                  color: "white",
                  fontWeight: 600,
                }}
              >
                {session?.user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>
            )}
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "48px",
                right: 0,
                width: "224px",
                backgroundColor: "white",
                border: "1px solid #e5e5e5",
                borderRadius: "12px",
                boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                padding: "8px",
                display: "flex",
                flexDirection: "column",
                zIndex: 1000,
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  borderBottom: "1px solid #f4f4f4",
                  marginBottom: "4px",
                }}
              >
                <div style={{ fontSize: "14px", fontWeight: 600 }}>
                  {session?.user?.name}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#737373",
                    wordBreak: "break-all",
                  }}
                >
                  {session?.user?.email}
                </div>
                <div
                  style={{
                    fontSize: "12px",
                    color: "#7c3aed",
                    fontWeight: 500,
                    marginTop: "4px",
                  }}
                >
                  {roleDisplayName}
                </div>
              </div>
              <button
                style={{
                  padding: "8px 12px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  fontSize: "14px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <UserIcon size={16} /> Profile
              </button>
              <a
                href="/settings"
                style={{
                  padding: "8px 12px",
                  textDecoration: "none",
                  color: "inherit",
                  fontSize: "14px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <Settings size={16} /> Settings
              </a>
              {userRole === UserRole.ADMIN && (
                <a
                  href="/admin"
                  style={{
                    padding: "8px 12px",
                    textDecoration: "none",
                    color: "inherit",
                    fontSize: "14px",
                    borderRadius: "6px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Shield size={16} /> Admin Panel
                </a>
              )}
              <div
                style={{
                  borderTop: "1px solid #f4f4f4",
                  marginTop: "4px",
                  paddingTop: "4px",
                }}
              >
                <button
                  onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    textAlign: "left",
                    background: "none",
                    border: "none",
                    fontSize: "14px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    color: "#ef4444",
                  }}
                >
                  <LogOut size={16} /> Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

// Layout Component
const Layout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fff" }}>
      <ManifestMyStorySidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      <div
        style={{
          minHeight: "100vh",
          transition: "margin-left 0.3s ease",
          marginLeft: isSidebarCollapsed ? "80px" : "260px",
        }}
      >
        <Header
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <main style={{ padding: "32px" }}>{children}</main>
      </div>
    </div>
  );
};

export default Layout;
