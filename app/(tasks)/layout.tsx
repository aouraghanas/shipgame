import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/shared/Navbar";

export default async function TasksLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const role = session.user.role;
  const allowed =
    role === "ADMIN" ||
    role === "MANAGER" ||
    role === "SOURCING_AGENT" ||
    role === "ACCOUNTANT";
  if (!allowed) redirect("/login");

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />
      <main className="max-w-[1600px] mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
