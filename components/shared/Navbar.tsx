"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  Trophy,
  Activity,
  User,
  Users,
  Gift,
  BarChart2,
  Bell,
  TrendingUp,
  LogOut,
  Ship,
  MessageSquareMore,
  Landmark,
  Ticket,
} from "lucide-react";
import { ThemeSwitch } from "./ThemeSwitch";

const ADMIN_LINKS = [
  { href: "/admin", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tickets", icon: Ticket, label: "Tickets" },
  { href: "/admin/users", icon: Users, label: "Users" },
  { href: "/admin/rewards", icon: Gift, label: "Rewards" },
  { href: "/admin/activity", icon: Activity, label: "Activity" },
  { href: "/admin/reports", icon: BarChart2, label: "Reports" },
  { href: "/accounting", icon: Landmark, label: "Accounting" },
  { href: "/admin/performance", icon: TrendingUp, label: "Performance" },
  { href: "/admin/feedback", icon: MessageSquareMore, label: "Recommendations" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/admin/notifications", icon: Bell, label: "Notifications" },
];

const ACCOUNTANT_LINKS = [
  { href: "/accounting", icon: Landmark, label: "Accounting" },
  { href: "/tickets", icon: Ticket, label: "Tickets" },
];

const SOURCING_LINKS = [
  { href: "/tickets", icon: Ticket, label: "Tickets" },
  { href: "/feedback", icon: MessageSquareMore, label: "Recommendations" },
  { href: "/ops-reports", icon: BarChart2, label: "Activity intel" },
  { href: "/profile", icon: User, label: "Profile" },
];

const MANAGER_LINKS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/tickets", icon: Ticket, label: "Tickets" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/activity", icon: Activity, label: "Activity" },
  { href: "/feedback", icon: MessageSquareMore, label: "Recommendations" },
  { href: "/profile", icon: User, label: "Profile" },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;

  const links =
    role === "ADMIN"
      ? ADMIN_LINKS
      : role === "ACCOUNTANT"
        ? ACCOUNTANT_LINKS
        : role === "SOURCING_AGENT"
          ? SOURCING_LINKS
          : MANAGER_LINKS;

  const homeHref =
    role === "ADMIN"
      ? "/admin"
      : role === "ACCOUNTANT"
        ? "/accounting"
        : role === "SOURCING_AGENT"
          ? "/tickets"
          : "/dashboard";

  return (
    <nav className="navbar-shipeh border-b border-zinc-800 bg-zinc-950 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 py-2 flex flex-wrap items-center gap-x-4 gap-y-2 min-h-[3.75rem]">
        <Link href={homeHref} className="flex items-center gap-2 shrink-0 mr-4">
          <span className="inline-flex items-center justify-center h-8 w-8 rounded-lg bg-brand text-white shadow-sm">
            <Ship className="h-4 w-4" />
          </span>
          <span className="font-bold text-zinc-100 text-base tracking-wide">
            SHIP<span className="text-brand">EH</span>
          </span>
        </Link>

        <div className="flex flex-wrap items-center gap-1 flex-1 min-w-[12rem]">
          {links.map(({ href, icon: Icon, label }) => {
            const active =
              pathname === href ||
              (href !== "/admin" && href !== "/dashboard" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors ${
                  active
                    ? "brand-keep bg-brand text-white shadow-sm"
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
          <ThemeSwitch variant="inline" />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-brand hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">Sign out</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
