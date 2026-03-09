import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function Unauthorized() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f9fafb" }}>
      <div className="card w-full max-w-md p-6 text-center">
        <div className="mb-4">
          <div className="mx-auto flex items-center justify-center" style={{ width: "3rem", height: "3rem", backgroundColor: "#fee2e2", borderRadius: "50%", marginBottom: "1rem" }}>
            <AlertTriangle style={{ width: "1.5rem", height: "1.5rem", color: "#dc2626" }} />
          </div>
          <h1 className="font-medium" style={{ fontSize: "1.5rem" }}>Access Denied</h1>
          <p className="text-sm" style={{ color: "#6b7280" }}>
            You don't have permission to access this resource.
          </p>
        </div>

        <div className="space-y-4">
          <p className="text-sm" style={{ color: "#4b5563" }}>
            This page requires specific permissions. Please contact your administrator if you believe this is an error.
          </p>
          <div className="flex justify-center" style={{ gap: "0.5rem" }}>
            <Link href="/" className="button" style={{ backgroundColor: "transparent", border: "1px solid #e5e5e5", color: "#374151" }}>
              Go Home
            </Link>
            <Link href="/auth/signin" className="button">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
