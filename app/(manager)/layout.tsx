import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { NotificationBar } from "@/components/shared/NotificationBar";

export default async function ManagerLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  // Admins can also access manager pages (leaderboard view)
  if (session.user.role === "SCREEN") redirect("/screen");

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <NotificationBar />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
