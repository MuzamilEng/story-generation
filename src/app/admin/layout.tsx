import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserRole } from "@/lib/roles";
import { redirect } from "next/navigation";
import styles from "../styles/AdminLayout.module.css";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== UserRole.ADMIN) {
    redirect("/auth/signin");
  }

  const userName = session.user.name || "Admin";
  const initials = userName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <div className={styles.adminLayout}>
      <AdminSidebar userName={userName} initials={initials} />
      <main className={styles.main}>
        {children}
      </main>
    </div>
  );
}

