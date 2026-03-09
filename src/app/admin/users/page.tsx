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
        setUsers(users.map(user =>
          user.id === userId ? { ...user, role: newRole } : user
        ));
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
        setUsers(users.map(user =>
          user.id === userId ? { ...user, isActive: !currentStatus } : user
        ));
      }
    } catch (error) {
      console.error("Failed to update user status:", error);
    }
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "32px" }}>Loading users...</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div>
        <h2 style={{ fontSize: "30px", fontWeight: 700 }}>User Management</h2>
        <p style={{ fontSize: "14px", color: "#737373" }}>
          Manage user accounts, roles, and permissions.
        </p>
      </div>

      <div style={{
        backgroundColor: "white",
        border: "1px solid #e5e5e5",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
      }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #e5e5e5" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600 }}>All Users</h3>
          <p style={{ fontSize: "12px", color: "#737373" }}>A list of all registered users and their current status.</p>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e5e5", textAlign: "left" }}>
                <th style={{ padding: "12px 16px", fontWeight: 500, color: "#737373" }}>Name</th>
                <th style={{ padding: "12px 16px", fontWeight: 500, color: "#737373" }}>Email</th>
                <th style={{ padding: "12px 16px", fontWeight: 500, color: "#737373" }}>Role</th>
                <th style={{ padding: "12px 16px", fontWeight: 500, color: "#737373" }}>Status</th>
                <th style={{ padding: "12px 16px", fontWeight: 500, color: "#737373" }}>Created</th>
                <th style={{ padding: "12px 16px", fontWeight: 500, color: "#737373" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} style={{ borderBottom: "1px solid #f4f4f4" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{user.name || "N/A"}</td>
                  <td style={{ padding: "12px 16px" }}>{user.email}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <select
                      value={user.role}
                      onChange={(e) => updateUserRole(user.id, e.target.value as UserRole)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e5e5e5",
                        backgroundColor: "white",
                        fontSize: "14px"
                      }}
                    >
                      <option value={UserRole.USER}>User</option>
                      <option value={UserRole.MODERATOR}>Moderator</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                    </select>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "12px",
                      fontSize: "12px",
                      fontWeight: 500,
                      backgroundColor: user.isActive ? "#dcfce7" : "#f1f5f9",
                      color: user.isActive ? "#166534" : "#475569"
                    }}>
                      {user.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    {format(new Date(user.createdAt), "MMM dd, yyyy")}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <button
                      onClick={() => toggleUserStatus(user.id, user.isActive)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #e5e5e5",
                        backgroundColor: "white",
                        cursor: "pointer",
                        fontSize: "12px"
                      }}
                    >
                      {user.isActive ? "Deactivate" : "Activate"}
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
