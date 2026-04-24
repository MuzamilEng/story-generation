"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import styles from "../../styles/AdminLogs.module.css";

interface LogRow {
  id: string;
  level: string;
  source: string;
  message: string;
  meta: unknown;
  userId: string | null;
  createdAt: string;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [levelFilter, setLevelFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [live, setLive] = useState(true);
  const [connected, setConnected] = useState(false);
  const [expandedMeta, setExpandedMeta] = useState<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const limit = 50;

  // ── Fetch historical logs ──
  const fetchLogs = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(limit) });
      if (levelFilter) params.set("level", levelFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/logs?${params}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalPages(data.totalPages);
        setTotal(data.total);
      }
    } catch (err) {
      console.error("Failed to fetch logs:", err);
    } finally {
      setLoading(false);
    }
  }, [levelFilter, search]);

  useEffect(() => {
    fetchLogs(page);
  }, [page, fetchLogs]);

  // ── Live Socket.IO connection ──
  useEffect(() => {
    if (!live) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io("/admin-logs", {
      path: "/api/socketio",
      transports: ["websocket", "polling"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[socket.io] Connected to /admin-logs");
      setConnected(true);
    });

    socket.on("disconnect", () => {
      setConnected(false);
    });

    socket.on("new-log", (log: LogRow) => {
      // Only prepend if on page 1 and no filters active
      if (page === 1 && !levelFilter && !search) {
        setLogs((prev) => {
          const exists = prev.some((l) => l.id === log.id);
          if (exists) return prev;
          return [log, ...prev].slice(0, limit);
        });
        setTotal((t) => t + 1);
      }
      // Highlight new row
      setNewIds((prev) => new Set(prev).add(log.id));
      setTimeout(() => {
        setNewIds((prev) => {
          const next = new Set(prev);
          next.delete(log.id);
          return next;
        });
      }, 2500);
    });

    return () => {
      socket.disconnect();
    };
  }, [live, page, levelFilter, search]);

  // ── Delete handlers ──
  const handleDeleteOne = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/logs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setLogs((prev) => prev.filter((l) => l.id !== id));
        setTotal((t) => Math.max(0, t - 1));
        setSelectedIds((prev) => { const n = new Set(prev); n.delete(id); return n; });
      }
    } catch (err) {
      console.error("Delete log failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Delete ${selectedIds.size} selected log(s)?`)) return;
    setDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/admin/logs?id=${encodeURIComponent(id)}`, { method: "DELETE" })
        )
      );
      setSelectedIds(new Set());
      await fetchLogs(page);
    } catch (err) {
      console.error("Bulk delete failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const handleClearAll = async () => {
    const label = levelFilter ? `all "${levelFilter}" logs` : "ALL logs";
    if (!confirm(`Permanently delete ${label}? This cannot be undone.`)) return;
    setDeleting(true);
    try {
      const params = new URLSearchParams({ clearAll: "true" });
      if (levelFilter) params.set("level", levelFilter);
      const res = await fetch(`/api/admin/logs?${params}`, { method: "DELETE" });
      if (res.ok) {
        const data = await res.json();
        console.log(`Cleared ${data.deleted} logs`);
        setSelectedIds(new Set());
        setPage(1);
        await fetchLogs(1);
      }
    } catch (err) {
      console.error("Clear all failed:", err);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === logs.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(logs.map((l) => l.id)));
    }
  };

  // ── Helpers ──
  const badgeClass = (level: string) => {
    if (level === "error") return `${styles.badge} ${styles.badgeError}`;
    if (level === "warn") return `${styles.badge} ${styles.badgeWarn}`;
    return `${styles.badge} ${styles.badgeInfo}`;
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  };

  const toggleMeta = (id: string) => {
    setExpandedMeta((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  // ── Pagination helpers ──
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("...");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
        pages.push(i);
      }
      if (page < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className={styles.logsPage}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          App <em>Logs</em>
        </h1>
        <p className={styles.subtitle}>
          Real-time application logs — {total.toLocaleString()} total entries
        </p>
      </div>

      {/* ─── Toolbar ─── */}
      <div className={styles.toolbar}>
        <select
          className={styles.filterSelect}
          value={levelFilter}
          onChange={(e) => { setLevelFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
        </select>

        <input
          className={styles.searchInput}
          placeholder="Search messages…"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        />

        <button
          className={`${styles.liveToggle} ${live ? styles.liveToggleActive : ""}`}
          onClick={() => setLive((v) => !v)}
        >
          <span className={`${styles.liveDot} ${live && connected ? styles.liveDotActive : ""}`} />
          {live ? (connected ? "Live" : "Connecting…") : "Paused"}
        </button>

        <div className={styles.toolbarRight}>
          {selectedIds.size > 0 && (
            <button
              className={`${styles.deleteBtn} ${styles.deleteBtnSelected}`}
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              🗑 Delete {selectedIds.size} selected
            </button>
          )}
          <button
            className={styles.deleteBtn}
            onClick={handleClearAll}
            disabled={deleting || total === 0}
          >
            🗑 Clear {levelFilter ? levelFilter : "all"}
          </button>
        </div>
      </div>

      {/* ─── Log Table ─── */}
      {loading ? (
        <div className={styles.loadingWrap}>
          <div className={styles.spinner} />
        </div>
      ) : logs.length === 0 ? (
        <div className={styles.empty}>No logs found.</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkCol}>
                  <input
                    type="checkbox"
                    checked={logs.length > 0 && selectedIds.size === logs.length}
                    onChange={toggleSelectAll}
                    className={styles.checkbox}
                  />
                </th>
                <th>Level</th>
                <th>Time</th>
                <th>Source</th>
                <th>Message</th>
                <th>User</th>
                <th>Meta</th>
                <th className={styles.actionsCol}></th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className={`${newIds.has(log.id) ? styles.newRow : ""} ${selectedIds.has(log.id) ? styles.selectedRow : ""}`}>
                  <td className={styles.checkCol}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(log.id)}
                      onChange={() => toggleSelect(log.id)}
                      className={styles.checkbox}
                    />
                  </td>
                  <td>
                    <span className={badgeClass(log.level)}>{log.level}</span>
                  </td>
                  <td className={styles.timeCell}>{formatTime(log.createdAt)}</td>
                  <td className={styles.sourceCell}>{log.source}</td>
                  <td className={styles.messageCell}>
                    {log.message}
                  </td>
                  <td className={styles.userCell}>
                    {log.userId ? log.userId.slice(0, 8) + "…" : "—"}
                  </td>
                  <td>
                    {log.meta ? (
                      <>
                        <button className={styles.metaToggle} onClick={() => toggleMeta(log.id)}>
                          {expandedMeta.has(log.id) ? "Hide" : "View"}
                        </button>
                        {expandedMeta.has(log.id) && (
                          <div className={styles.metaBlock}>
                            {JSON.stringify(log.meta, null, 2)}
                          </div>
                        )}
                      </>
                    ) : (
                      <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>
                    )}
                  </td>
                  <td className={styles.actionsCol}>
                    <button
                      className={styles.rowDeleteBtn}
                      onClick={() => handleDeleteOne(log.id)}
                      disabled={deleting}
                      title="Delete this log"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.pageBtn}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Prev
          </button>
          <div className={styles.pageNumbers}>
            {getPageNumbers().map((p, i) =>
              p === "..." ? (
                <span key={`dots-${i}`} className={styles.pageDots}>…</span>
              ) : (
                <button
                  key={p}
                  className={`${styles.pageNumBtn} ${page === p ? styles.pageNumActive : ""}`}
                  onClick={() => setPage(p as number)}
                >
                  {p}
                </button>
              )
            )}
          </div>
          <button
            className={styles.pageBtn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
          <span className={styles.pageInfo}>
            {total.toLocaleString()} logs · Page {page} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
