"use client";
import { signOut } from "next-auth/react";
import styles from "../styles/AdminLayout.module.css";

export default function AdminLogoutButton() {
    return (
        <button
            className={styles.signOutBtn}
            onClick={() => signOut({ callbackUrl: "/" })}
        >
            Sign Out
        </button>
    );
}
