import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/roles";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check admin role directly via session on the server side
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/unauthorized");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <nav className="flex space-x-6">
            <a
              href="/admin"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Dashboard
            </a>
            <a
              href="/admin/users"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Users
            </a>
            <a
              href="/admin/settings"
              className="text-gray-600 hover:text-gray-900 font-medium"
            >
              Settings
            </a>
          </nav>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}
