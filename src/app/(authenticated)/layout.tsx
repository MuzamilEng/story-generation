"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import UserHeader from "../components/UserHeader";
import Sidebar from "../components/Sidebar";

export default function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  // Redirect Admin users to the Admin Dashboard
  if (session?.user?.role === "ADMIN" && !pathname.startsWith("/admin")) {
    window.location.href = "/admin";
    return null;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {/* Desktop top header — always visible now */}
      <UserHeader />
      {/* Mobile-only sidebar hamburger + slide-in drawer */}
      <Sidebar />

      <main
        style={{
          flex: 1,
          position: "relative",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
        }}
        className="authenticated-main"
      >
        {children}
      </main>

      {/* Give content room to breathe below the fixed hamburger on mobile */}
      <style>{`
                @media (max-width: 768px) {
                    .authenticated-main {
                        /* Header is part of flex flow, so no padding-top needed */
                    }
                }
            `}</style>
    </div>
  );
}
