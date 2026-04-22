"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar } from "@/components/shared/Avatar";
import { Search, Filter, Download, Paperclip, ClipboardList } from "lucide-react";
import type { UserWithStats } from "@/types";

type Seller = { id: string; name: string; email?: string | null };
type Activity = {
  id: string;
  description: string;
  category: string;
  attachments: string[];
  createdAt: string;
  manager: { id: string; name: string; avatarUrl?: string | null };
  seller: { id: string; name: string; email?: string | null };
};

const CATEGORY_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  ISSUE_FIX: "Issue Fix",
  FOLLOW_UP: "Follow-up",
  OTHER: "Other",
};

const CATEGORY_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  CALL: "default",
  EMAIL: "secondary",
  MEETING: "default",
  ISSUE_FIX: "destructive",
  FOLLOW_UP: "outline",
  OTHER: "outline",
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getMonthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ReportsPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [managers, setManagers] = useState<UserWithStats[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);

  const [fromDate, setFromDate] = useState(getMonthStart);
  const [toDate, setToDate] = useState(getToday);
  const [filterManager, setFilterManager] = useState("all");
  const [filterSeller, setFilterSeller] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((users: UserWithStats[]) => setManagers(users.filter((u) => u.role === "MANAGER")));
    fetch("/api/sellers").then((r) => r.json()).then(setSellers);
  }, []);

  useEffect(() => {
    fetchActivities();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromDate, toDate, filterManager, filterSeller, keyword]);

  async function fetchActivities() {
    setLoading(true);
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (filterManager !== "all") params.set("managerId", filterManager);
    if (filterSeller !== "all") params.set("sellerId", filterSeller);
    if (keyword) params.set("keyword", keyword);
    const res = await fetch(`/api/manager-activities?${params}`);
    if (res.ok) setActivities(await res.json());
    setLoading(false);
  }

  function buildExportUrl() {
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (filterManager !== "all") params.set("managerId", filterManager);
    if (filterSeller !== "all") params.set("sellerId", filterSeller);
    if (keyword) params.set("keyword", keyword);
    return `/api/manager-activities/export?${params}`;
  }

  function reset() {
    setFromDate(getMonthStart());
    setToDate(getToday());
    setFilterManager("all");
    setFilterSeller("all");
    setKeyword("");
    setKeywordInput("");
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ClipboardList className="h-8 w-8 text-indigo-400" />
            Activity Reports
          </h1>
          <p className="text-zinc-400 mt-1">Review all account manager interactions with sellers</p>
        </div>
        <a href={buildExportUrl()} download>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </a>
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
              <Label className="text-xs text-zinc-400">Manager</Label>
              <Select value={filterManager} onValueChange={setFilterManager}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All managers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All managers</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Seller</Label>
              <Select value={filterSeller} onValueChange={setFilterSeller}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All sellers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sellers</SelectItem>
                  {sellers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 flex-1 min-w-[220px]">
              <Label className="text-xs text-zinc-400">Keyword search</Label>
              <form
                onSubmit={(e) => { e.preventDefault(); setKeyword(keywordInput); }}
                className="flex gap-2"
              >
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    placeholder="Search description…"
                    className="pl-9"
                  />
                </div>
                <Button type="submit" variant="secondary" size="sm">Search</Button>
              </form>
            </div>
            <Button variant="ghost" size="sm" onClick={reset}>
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
      ) : activities.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-zinc-400">No activities found for the selected filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-zinc-500">
            {activities.length} record{activities.length !== 1 ? "s" : ""} found
          </p>
          {activities.map((a) => (
            <div
              key={a.id}
              className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
            >
              <div className="flex items-start gap-3">
                <Avatar name={a.manager.name} avatarUrl={a.manager.avatarUrl} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-zinc-100 text-sm">{a.manager.name}</span>
                    <span className="text-zinc-600 text-xs">→</span>
                    <span className="font-medium text-zinc-200 text-sm">{a.seller.name}</span>
                    {a.seller.email && (
                      <span className="text-zinc-500 text-xs">({a.seller.email})</span>
                    )}
                    <Badge variant={CATEGORY_VARIANTS[a.category] ?? "outline"}>
                      {CATEGORY_LABELS[a.category] ?? a.category}
                    </Badge>
                  </div>
                  <p className="text-sm text-zinc-400 leading-relaxed">{a.description}</p>
                  {a.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {a.attachments.map((url, i) => (
                        <a
                          key={i}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          <Paperclip className="h-3 w-3" />
                          Attachment {i + 1}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
                <span className="text-xs text-zinc-500 whitespace-nowrap font-mono flex-shrink-0">
                  {new Date(a.createdAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
