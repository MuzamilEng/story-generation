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
                    <h1 className={styles.title}>Beta Codes</h1>
                    <p className={styles.subtitle}>Generate and manage Amplifier beta access invites</p>
                </div>
            </header>

            <div className={styles.card}>
                <h2 className={styles.cardTitle}>Generate New Code</h2>
                <form onSubmit={handleCreate} className={styles.formGrid}>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Code Name</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. VIP-BETA-2026"
                            value={newCode}
                            onChange={(e) => setNewCode(e.target.value)}
                            className={styles.input}
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label className={styles.label}>Max Uses</label>
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
                        {creating ? "Generating..." : "Generate Code"}
                    </button>
                </form>
            </div>

            <div className={styles.card} style={{ padding: 0, overflow: 'hidden' }}>
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Invite Code</th>
                                <th>Redemptions</th>
                                <th>Type</th>
                                <th>Status</th>
                                <th>Created Date</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyState}>
                                        Loading beta codes...
                                    </td>
                                </tr>
                            ) : codes.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className={styles.emptyState}>
                                        No beta codes found. Generate one above to get started.
                                    </td>
                                </tr>
                            ) : (
                                codes.map((code) => (
                                    <tr key={code.id}>
                                        <td><span className={styles.codeCell}>{code.code}</span></td>
                                        <td>
                                            <span style={{ fontWeight: 600, color: code.current_uses >= code.max_uses ? '#c0392b' : '#1c1a16' }}>
                                                {code.current_uses}
                                            </span>
                                            <span style={{ color: '#b8b3a8' }}> / {code.max_uses}</span>
                                        </td>
                                        <td>{code.type.replace(/_/g, ' ')}</td>
                                        <td>
                                            {code.isActive && code.current_uses < code.max_uses ? (
                                                <span className={`${styles.badge} ${styles.badgeActive}`}>
                                                    Active
                                                </span>
                                            ) : (
                                                <span className={`${styles.badge} ${styles.badgeInactive}`}>
                                                    {!code.isActive ? "Deactivated" : "Exhausted"}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ color: '#7a7468' }}>
                                            {format(new Date(code.createdAt), "MMM d, yyyy")}
                                        </td>
                                        <td>
                                            {code.isActive && (
                                                <button
                                                    onClick={() => deactivateCode(code.id)}
                                                    className={styles.deactivateBtn}
                                                >
                                                    Deactivate
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
