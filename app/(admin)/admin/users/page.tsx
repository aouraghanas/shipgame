"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/shared/Avatar";
import { Plus, Pencil } from "lucide-react";
import type { UserWithStats } from "@/types";

export default function UsersPage() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false));
  }, []);

  const roleVariant = (role: string) => {
    if (role === "ADMIN") return "gold" as const;
    if (role === "SCREEN") return "silver" as const;
    if (role === "ACCOUNTANT") return "outline" as const;
    return "secondary" as const;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Users</h1>
          <p className="text-zinc-400 mt-1">Manage all accounts</p>
        </div>
        <Link href="/admin/users/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" /> New User
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3"
            >
              <Avatar name={u.name} avatarUrl={u.avatarUrl} size="sm" />

              <div className="flex-1 min-w-0">
                <p className="font-semibold text-zinc-100">{u.name}</p>
                <p className="text-sm text-zinc-400 truncate">{u.email}</p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Badge variant={roleVariant(u.role)}>{u.role}</Badge>
                <Badge variant={u.status === "ACTIVE" ? "default" : "outline"}>
                  {u.status}
                </Badge>
                <Link href={`/admin/users/${u.id}`}>
                  <Button variant="ghost" size="icon">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
