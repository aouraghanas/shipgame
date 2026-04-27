"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Gift, Activity, BarChart2, Trophy, Bell, MessageSquareMore } from "lucide-react";

interface Stats {
  totalUsers: number;
  activeManagers: number;
  currentMonth: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((users: { role: string; status: string }[]) => {
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        setStats({
          totalUsers: users.length,
          activeManagers: users.filter((u) => u.role === "MANAGER" && u.status === "ACTIVE").length,
          currentMonth,
        });
      });
  }, []);

  const sections = [
    { href: "/admin/users", icon: Users, label: "Users", desc: "Manage accounts and roles" },
    { href: "/admin/rewards", icon: Gift, label: "Rewards", desc: "Set monthly reward & punishment" },
    { href: "/admin/activity", icon: Activity, label: "Activity", desc: "View manager activity logs" },
    { href: "/admin/reports", icon: BarChart2, label: "Reports", desc: "Delivered & stock reports" },
    { href: "/admin/feedback", icon: MessageSquareMore, label: "Recommendations", desc: "Seller recommendations + AI summaries" },
    { href: "/leaderboard", icon: Trophy, label: "Leaderboard", desc: "View the live leaderboard" },
    { href: "/admin/notifications", icon: Bell, label: "Notifications", desc: "Manage announcement bars" },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
        <p className="text-zinc-400 mt-1">
          {stats ? `${stats.currentMonth} · ${stats.activeManagers} active managers` : "Loading…"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(({ href, icon: Icon, label, desc }) => (
          <Link key={href} href={href}>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5 hover:border-zinc-600 hover:bg-zinc-800 transition-colors cursor-pointer h-full">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-indigo-600/20">
                  <Icon className="h-5 w-5 text-indigo-400" />
                </div>
                <h2 className="font-semibold text-zinc-100">{label}</h2>
              </div>
              <p className="text-sm text-zinc-400">{desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
