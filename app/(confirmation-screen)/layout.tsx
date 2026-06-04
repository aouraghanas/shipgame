import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationBar } from "@/components/shared/NotificationBar";

/** TV layout for the Libya call-center leaderboard screen. */
export default async function ConfirmationScreenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "CONFIRMATION_SCREEN" && session.user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <NotificationBar />
      {children}
    </div>
  );
}
