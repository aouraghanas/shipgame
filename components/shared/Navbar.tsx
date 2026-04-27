"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Trophy, Activity, User, Users, Gift,
  BarChart2, Bell, TrendingUp, LogOut, Ship, MessageSquareMore,
} from "lucide-react";

const ADMIN_LINKS = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/rewards", icon: Gift, label: "Rewards" },
  { href: "/admin/activity", icon: Activity, label: "Activity" },
  { href: "/admin/reports", icon: BarChart2, label: "Reports" },
  { href: "/admin/performance", icon: TrendingUp, label: "Performance" },
  { href: "/admin/feedback", icon: MessageSquareMore, label: "Recommendations" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/admin/notifications", icon: Bell, label: "Notifications" },
];

const MANAGER_LINKS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/activity", icon: Activity, label: "Activity" },
  { href: "/feedback", icon: MessageSquareMore, label: "Recommendations" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const links = role === "ADMIN" ? ADMIN_LINKS : MANAGER_LINKS;

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-6 h-14">
        <Link href={role === "ADMIN" ? "/admin" : "/dashboard"} className="flex items-center gap-2 mr-2">
          <Ship className="h-5 w-5 text-indigo-400" />
          <span className="font-bold text-white text-sm">Shipeh</span>
        </Link>

        <div className="flex items-center gap-1 flex-1 overflow-x-auto">
          {links.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== "/admin" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "bg-indigo-600/20 text-indigo-400"
                    : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {session?.user?.name && (
            <span className="text-xs text-zinc-500 hidden sm:block">{session.user.name}</span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
