"use client";
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import styles from "../../styles/BetaCodesAdmin.module.css";

export default function BetaCodesAdmin() {
    const [codes, setCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newCode, setNewCode] = useState("");
    const [maxUses, setMaxUses] = useState(1);
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        fetchCodes();
    }, []);

    const fetchCodes = async () => {
        try {
            const res = await fetch("/api/admin/beta-codes");
            const data = await res.json();
            setCodes(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            const res = await fetch("/api/admin/beta-codes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: newCode.trim().toUpperCase(), maxUses: Number(maxUses) }),
            });
            if (res.ok) {
                setNewCode("");
                setMaxUses(1);
                fetchCodes();
            } else {
                alert("Failed to create code");
            }
        } catch (error) {
            console.error(error);
        } finally {
            setCreating(false);
        }
    };

    const deactivateCode = async (id: string) => {
        if (!confirm("Are you sure you want to deactivate this code?")) return;
        try {
            await fetch(`/api/admin/beta-codes/${id}`, { method: "DELETE" });
            fetchCodes();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className={styles.adminContainer}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Beta <em>Codes</em></h1>
                    <p className={styles.subtitle}>Generate and manage premium beta access invites for the platform.</p>
                </div>
            </header>

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Provision New Identity</h2>
                <form onSubmit={handleCreate} className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Identifier / Code</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. VIP-ACCESS-2026"
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            className={styles.input}
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Use Limit</label>
                        <input
                            type="number"
                            min="1"
                            required
                            value={maxUses}
                            onChange={(e) => setMaxUses(parseInt(e.target.value))}
                            className={styles.input}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={creating}
                        className={styles.button}
                    >
                        {creating ? "Processing..." : "Deploy Access"}
                    </button>
                </form>
            </div>

            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Access Key</th>
                                <th>Redemptions</th>
                                <th>Plan Type</th>
                                <th>Deployment</th>
                                <th>Issued On</th>
                                <th>Management</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyState}>
                                        Fetching secure codes...
                                    </td>
                                </tr>
                            ) : codes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyState}>
                                        No active access keys found in the registry.
                                    </td>
                                </tr>
                            ) : (
                                codes.map((code) => (
                                    <tr key={code.id}>
                                        <td><span className={styles.codeCell}>{code.code}</span></td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: code.current_uses >= code.max_uses ? '#ff6666' : '#fff' }}>
                                                {code.current_uses}
                                            </span>
                                            <span style={{ color: 'rgba(255,255,255,0.3)' }}> / {code.max_uses}</span>
                                        </td>
                                        <td style={{ color: 'rgba(255,255,255,0.6)', textTransform: 'capitalize' }}>
                                          {code.type.replace(/_/g, ' ')}
                                        </td>
                                        <td>
                                            {code.isActive && code.current_uses < code.max_uses ? (
                                                <span className={`${styles.badge} ${styles.badgeActive}`}>
                                                    Operational
                                                </span>
                                            ) : (
                                                <span className={`${styles.badge} ${styles.badgeInactive}`}>
                                                    {!code.isActive ? "Deactivated" : "Exhausted"}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ color: 'rgba(255,255,255,0.45)' }}>
                                            {format(new Date(code.createdAt), "MMM d, yyyy")}
                                        </td>
                                        <td>
                                            {code.isActive && (
                                                <button
                                                    onClick={() => deactivateCode(code.id)}
                                                    className={styles.deactivateBtn}
                                                >
                                                    Revoke
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
