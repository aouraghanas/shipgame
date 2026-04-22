"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/shared/Avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Filter } from "lucide-react";
import type { UserWithStats } from "@/types";

type AuditEntry = {
  id: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  createdAt: string;
};

const ACTION_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "gold" }> = {
  "stock.create": { label: "Stock Added", variant: "default" },
  "stock.delete": { label: "Stock Deleted", variant: "destructive" },
  "profile.update": { label: "Profile Updated", variant: "secondary" },
  "avatar.upload": { label: "Avatar Changed", variant: "secondary" },
  "user.create": { label: "User Created", variant: "gold" },
  "user.update": { label: "User Updated", variant: "secondary" },
  "user.delete": { label: "User Deleted", variant: "destructive" },
  "performance.update": { label: "Performance Updated", variant: "default" },
  "note.upsert": { label: "Note Set", variant: "outline" },
  "note.update": { label: "Note Updated", variant: "outline" },
  "note.delete": { label: "Note Deleted", variant: "destructive" },
  "rewards.update": { label: "Rewards Updated", variant: "gold" },
};

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getWeekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export default function ActivityPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState(getWeekAgo);
  const [toDate, setToDate] = useState(getToday);
  const [filterUser, setFilterUser] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setUsers);
  }, []);

  useEffect(() => {
    fetchLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, filterUser]);

  async function fetchLogs() {
    setLoading(true);
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (filterUser && filterUser !== "all") params.set("userId", filterUser);

    const res = await fetch(`/api/audit-log?${params}`);
    if (res.ok) {
      setLogs(await res.json());
    }
    setLoading(false);
  }

  const filtered = searchQuery
    ? logs.filter(
        (l) =>
          l.details.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          l.action.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : logs;

  // Group logs by date
  const grouped = filtered.reduce<Record<string, AuditEntry[]>>((acc, log) => {
    const dateKey = formatDate(log.createdAt);
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(log);
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Activity Log</h1>
        <p className="text-zinc-400 mt-1">
          Track all changes made by account managers
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">From</Label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">To</Label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">User</Label>
              <Select value={filterUser} onValueChange={setFilterUser}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All users</SelectItem>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[200px]">
              <Label className="text-xs text-zinc-400">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search events..."
                  className="pl-9"
                />
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFromDate(getWeekAgo());
                setToDate(getToday());
                setFilterUser("all");
                setSearchQuery("");
              }}
            >
              <Filter className="h-4 w-4 mr-1.5" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-zinc-400">No activity found for the selected period.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <p className="text-sm text-zinc-500">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""} found
          </p>
          {Object.entries(grouped).map(([dateKey, entries]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-zinc-400 mb-3 sticky top-16 bg-zinc-950 py-2 z-10">
                {dateKey}
              </h3>
              <div className="space-y-1">
                {entries.map((log) => {
                  const actionMeta = ACTION_LABELS[log.action] ?? {
                    label: log.action,
                    variant: "outline" as const,
                  };
                  const userObj = users.find((u) => u.id === log.userId);
                  return (
                    <div
                      key={log.id}
                      className="flex items-start gap-3 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
                    >
                      <Avatar
                        name={log.userName}
                        avatarUrl={userObj?.avatarUrl}
                        size="sm"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-zinc-100 text-sm">
                            {log.userName}
                          </span>
                          <Badge variant={actionMeta.variant}>
                            {actionMeta.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-zinc-400 mt-0.5">
                          {log.details}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-500 whitespace-nowrap flex-shrink-0 font-mono">
                        {formatTime(log.createdAt)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
