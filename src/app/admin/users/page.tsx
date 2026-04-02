"use client";

import { useState, useEffect } from "react";
import { UserRole } from "@/lib/roles";
import { format } from "date-fns";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  lastLogin: string | null;
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, role: newRole } : user,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to update user role:", error);
    }
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ isActive: !currentStatus }),
      });

      if (response.ok) {
        setUsers(
          users.map((user) =>
            user.id === userId ? { ...user, isActive: !currentStatus } : user,
          ),
        );
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "64px", color: "rgba(255, 255, 255, 0.4)" }}>
        Loading users...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "32px", color: "#fff" }}>
      <div>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "2.5rem", fontWeight: 700, marginBottom: "8px" }}>
          User <em>Management</em>
        </h2>
        <p style={{ fontSize: "0.95rem", color: "rgba(255, 255, 255, 0.55)" }}>
          Manage user accounts, roles, and platform permissions.
        </p>
      </div>

      <div
        style={{
          backgroundColor: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          borderRadius: "20px",
          overflow: "hidden",
          boxShadow: "0 12px 40px rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ padding: "24px", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <h3 style={{ fontSize: "1.2rem", fontWeight: 600, fontFamily: "'Fraunces', serif" }}>Member Directory</h3>
          <p style={{ fontSize: "0.85rem", color: "rgba(255, 255, 255, 0.45)" }}>
            Review all registered users and their session status.
          </p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr
                style={{ 
                  borderBottom: "1px solid rgba(255, 255, 255, 0.08)", 
                  textAlign: "left",
                  backgroundColor: "rgba(255, 255, 255, 0.02)"
                }}
              >
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Name</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Email</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Role</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Status</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Joined</th>
                <th style={{ padding: "16px 20px", fontWeight: 500, color: "rgba(255, 255, 255, 0.35)", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)", transition: "background-color 0.15s" }}>
                  <td style={{ padding: "16px 20px", fontWeight: 500, color: "#fff" }}>
                    {user.name || "N/A"}
                  </td>
                  <td style={{ padding: "16px 20px", color: "rgba(255, 255, 255, 0.6)" }}>{user.email}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateUserRole(user.id, e.target.value as UserRole)
                      }
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        color: "#fff",
                        fontSize: "0.85rem",
                        outline: "none"
                      }}
                    >
                      <option value={UserRole.USER}>User</option>
                      <option value={UserRole.MODERATOR}>Moderator</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <span
                      style={{
                        padding: "4px 10px",
                        borderRadius: "99px",
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        backgroundColor: user.isActive ? "rgba(82, 183, 136, 0.1)" : "rgba(255, 255, 255, 0.05)",
                        color: user.isActive ? "#52b788" : "rgba(255, 255, 255, 0.4)",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em"
                      }}
                    >
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "16px 20px", color: "rgba(255, 255, 255, 0.4)" }}>
                    {format(new Date(user.createdAt), "MMM dd, yyyy")}
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <button
                      onClick={() => toggleUserStatus(user.id, user.isActive)}
                      style={{
                        padding: "8px 16px",
                        borderRadius: "8px",
                        border: "1px solid",
                        borderColor: user.isActive ? "rgba(255, 255, 255, 0.1)" : "#52b788",
                        backgroundColor: "transparent",
                        color: user.isActive ? "rgba(255, 107, 107, 0.8)" : "#52b788",
                        cursor: "pointer",
                        fontSize: "0.75rem",
                        fontWeight: 500,
                        transition: "all 0.2s"
                      }}
                    >
                      {user.isActive ? "Deactivate" : "Enable Account"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
