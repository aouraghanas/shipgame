import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { NotificationBar } from "@/components/shared/NotificationBar";

export default async function AccountantLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role !== "ACCOUNTANT" && role !== "ADMIN" && role !== "LIBYAN_ACCOUNTANT") redirect("/");

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <NotificationBar />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
