"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import styles from "./global-ui.module.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ToastState {
  message: string;
  visible: boolean;
  type: "success" | "error" | "info";
}

interface ConfirmState {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  danger: boolean;
  onConfirm: () => void;
}

interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttonText: string;
}

interface GlobalUIContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
  showAlert: (opts: {
    title: string;
    message: string;
    buttonText?: string;
  }) => void;
  showConfirm: (opts: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    danger?: boolean;
    onConfirm: () => void;
  }) => void;
}

// ── Context ───────────────────────────────────────────────────────────────────

const GlobalUIContext = createContext<GlobalUIContextType | null>(null);

export function useGlobalUI() {
  const ctx = useContext(GlobalUIContext);
  if (!ctx) throw new Error("useGlobalUI must be used within GlobalUIProvider");
  return ctx;
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function GlobalUIProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>({
    message: "",
    visible: false,
    type: "info",
  });
  const [toastTimer, setToastTimer] = useState<NodeJS.Timeout | null>(null);

  const [confirm, setConfirm] = useState<ConfirmState>({
    visible: false,
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    danger: false,
    onConfirm: () => {},
  });
  const [alert, setAlert] = useState<AlertState>({
    visible: false,
    title: "",
    message: "",
    buttonText: "Close",
  });

  const showToast = useCallback(
    (message: string, type: "success" | "error" | "info" = "info") => {
      if (toastTimer) clearTimeout(toastTimer);
      setToast({ message, visible: true, type });
      const timer = setTimeout(
        () => setToast((t) => ({ ...t, visible: false })),
        3500,
      );
      setToastTimer(timer);
    },
    [toastTimer],
  );

  const showConfirm = useCallback(
    (opts: {
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      danger?: boolean;
      onConfirm: () => void;
    }) => {
      setConfirm({
        visible: true,
        title: opts.title,
        message: opts.message,
        confirmText: opts.confirmText || "Confirm",
        cancelText: opts.cancelText || "Cancel",
        danger: opts.danger ?? false,
        onConfirm: opts.onConfirm,
      });
    },
    [],
  );

  const showAlert = useCallback(
    (opts: { title: string; message: string; buttonText?: string }) => {
      setAlert({
        visible: true,
        title: opts.title,
        message: opts.message,
        buttonText: opts.buttonText || "Close",
      });
    },
    [],
  );

  const closeConfirm = useCallback(() => {
    setConfirm((c) => ({ ...c, visible: false }));
  }, []);

  const closeAlert = useCallback(() => {
    setAlert((a) => ({ ...a, visible: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    confirm.onConfirm();
    closeConfirm();
  }, [confirm, closeConfirm]);

  return (
    <GlobalUIContext.Provider value={{ showToast, showAlert, showConfirm }}>
      {children}

      {/* ── Toast ── */}
      <div
        className={`${styles.toast} ${toast.visible ? styles.toastShow : ""} ${styles[`toast_${toast.type}`]}`}
      >
        {toast.message}
      </div>

      {/* ── Confirm Modal ── */}
      {confirm.visible && (
        <div className={styles.overlay} onClick={closeConfirm}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalTitle}>{confirm.title}</div>
            <div className={styles.modalMessage}>{confirm.message}</div>
            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeConfirm}>
                {confirm.cancelText}
              </button>
              <button
                className={`${styles.confirmBtn} ${confirm.danger ? styles.danger : ""}`}
                onClick={handleConfirm}
              >
                {confirm.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Alert Modal ── */}
      {alert.visible && (
        <div className={styles.overlay} onClick={closeAlert}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <button
              className={styles.alertCloseBtn}
              onClick={closeAlert}
              aria-label="Close alert"
            >
              ×
            </button>
            <div className={styles.modalTitle}>{alert.title}</div>
            <div className={styles.modalMessage}>{alert.message}</div>
            <div className={styles.modalActions}>
              <button className={styles.confirmBtn} onClick={closeAlert}>
                {alert.buttonText}
              </button>
            </div>
          </div>
        </div>
      )}
    </GlobalUIContext.Provider>
  );
}
