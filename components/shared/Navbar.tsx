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
  type LucideIcon,
} from "lucide-react";
import { ThemeSwitch } from "./ThemeSwitch";
import { LanguageSwitch } from "./LanguageSwitch";
import { useT } from "./I18nProvider";

type NavLink = { href: string; icon: LucideIcon; labelKey: string };

const ADMIN_LINKS: NavLink[] = [
  { href: "/admin", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { href: "/tickets", icon: Ticket, labelKey: "nav.tickets" },
  { href: "/admin/users", icon: Users, labelKey: "nav.users" },
  { href: "/admin/rewards", icon: Gift, labelKey: "nav.rewards" },
  { href: "/admin/activity", icon: Activity, labelKey: "nav.activity" },
  { href: "/admin/reports", icon: BarChart2, labelKey: "nav.reports" },
  { href: "/accounting", icon: Landmark, labelKey: "nav.accounting" },
  { href: "/admin/performance", icon: TrendingUp, labelKey: "nav.performance" },
  { href: "/admin/feedback", icon: MessageSquareMore, labelKey: "nav.recommendations" },
  { href: "/leaderboard", icon: Trophy, labelKey: "nav.leaderboard" },
  { href: "/admin/notifications", icon: Bell, labelKey: "nav.notifications" },
];

const ACCOUNTANT_LINKS: NavLink[] = [
  { href: "/accounting", icon: Landmark, labelKey: "nav.accounting" },
  { href: "/tickets", icon: Ticket, labelKey: "nav.tickets" },
];

const LIBYAN_ACCOUNTANT_LINKS: NavLink[] = [
  { href: "/accounting", icon: Landmark, labelKey: "nav.accounting.lyd" },
];

const SOURCING_LINKS: NavLink[] = [
  { href: "/tickets", icon: Ticket, labelKey: "nav.tickets" },
  { href: "/feedback", icon: MessageSquareMore, labelKey: "nav.recommendations" },
  { href: "/ops-reports", icon: BarChart2, labelKey: "nav.activityIntel" },
  { href: "/profile", icon: User, labelKey: "nav.profile" },
];

const MANAGER_LINKS: NavLink[] = [
  { href: "/dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { href: "/tickets", icon: Ticket, labelKey: "nav.tickets" },
  { href: "/leaderboard", icon: Trophy, labelKey: "nav.leaderboard" },
  { href: "/activity", icon: Activity, labelKey: "nav.activity" },
  { href: "/feedback", icon: MessageSquareMore, labelKey: "nav.recommendations" },
  { href: "/profile", icon: User, labelKey: "nav.profile" },
];

export function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = session?.user?.role;
  const t = useT();

  const links =
    role === "ADMIN"
      ? ADMIN_LINKS
      : role === "ACCOUNTANT"
        ? ACCOUNTANT_LINKS
        : role === "LIBYAN_ACCOUNTANT"
          ? LIBYAN_ACCOUNTANT_LINKS
          : role === "SOURCING_AGENT"
            ? SOURCING_LINKS
            : MANAGER_LINKS;

  const homeHref =
    role === "ADMIN"
      ? "/admin"
      : role === "ACCOUNTANT" || role === "LIBYAN_ACCOUNTANT"
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
          {links.map(({ href, icon: Icon, labelKey }) => {
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
                {t(labelKey)}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {session?.user?.name && (
            <span className="text-xs text-zinc-500 hidden sm:block">{session.user.name}</span>
          )}
          <LanguageSwitch variant="inline" />
          <ThemeSwitch variant="inline" />
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-brand hover:bg-zinc-800 transition-colors"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:block">{t("common.signOut")}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}
