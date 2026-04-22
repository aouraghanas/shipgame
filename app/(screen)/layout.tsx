import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { NotificationBar } from "@/components/shared/NotificationBar";

export default async function ScreenLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  if (session.user.role !== "SCREEN" && session.user.role !== "ADMIN") redirect("/");

  return (
    <div className="min-h-screen bg-zinc-950">
      <NotificationBar />
      {children}
    </div>
  );
}
