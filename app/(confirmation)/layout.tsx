import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";
import { NotificationBar } from "@/components/shared/NotificationBar";

/**
 * Layout for the call-center confirmation-agent app
 * (/confirmation, /confirmation-leaderboard, /confirmation-activity,
 * /confirmation-feedback). Admins may also browse these pages.
 */
export default async function ConfirmationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  if (role !== "CONFIRMATION_AGENT" && role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <NotificationBar />
      <main className="max-w-7xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
