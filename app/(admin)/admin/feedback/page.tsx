"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/shared/Avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Search, CalendarRange, FileText, BarChart3 } from "lucide-react";

type User = { id: string; name: string; role: string; avatarUrl: string | null };
type Seller = { id: string; name: string; email?: string | null };

type FeedbackEntry = {
  id: string;
  topic: string;
  sentiment: string;
  title: string | null;
  details: string;
  suggestedAction: string | null;
  createdAt: string;
  manager: { id: string; name: string; avatarUrl: string | null };
  seller: Seller;
};

type FeedbackReport = {
  id: string;
  period: "DAILY" | "WEEKLY" | "MONTHLY";
  fromDate: string;
  toDate: string;
  generatedAt: string;
  totalNotes: number;
  repeatedItems: Array<{ keyword?: string; theme?: string; count?: number }> | null;
  summary: string;
  recommendations: string;
  model: string | null;
  creator: { id: string; name: string };
};

const TOPIC_LABELS: Record<string, string> = {
  FEATURE_REQUEST: "Feature Request",
  BUG_REPORT: "Bug Report",
  UX_IMPROVEMENT: "UX Improvement",
  PRICING: "Pricing",
  INTEGRATION: "Integration",
  SUPPORT: "Support",
  OTHER: "Other",
};

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function getWeekAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split("T")[0];
}

export default function AdminFeedbackPage() {
  const [notes, setNotes] = useState<FeedbackEntry[]>([]);
  const [reports, setReports] = useState<FeedbackReport[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<"DAILY" | "WEEKLY" | "MONTHLY" | null>(null);
  const [message, setMessage] = useState("");

  const [fromDate, setFromDate] = useState(getWeekAgo);
  const [toDate, setToDate] = useState(getToday);
  const [managerId, setManagerId] = useState("all");
  const [sellerId, setSellerId] = useState("all");
  const [topic, setTopic] = useState("all");
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then((arr: User[]) => setUsers(arr.filter((u) => u.role === "MANAGER")));
    fetch("/api/sellers").then((r) => r.json()).then(setSellers);
    void fetchNotes();
    void fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchNotes() {
    setLoading(true);
    const params = new URLSearchParams();
    if (fromDate) params.set("from", fromDate);
    if (toDate) params.set("to", toDate);
    if (managerId !== "all") params.set("managerId", managerId);
    if (sellerId !== "all") params.set("sellerId", sellerId);
    if (topic !== "all") params.set("topic", topic);
    if (keyword.trim()) params.set("keyword", keyword.trim());

    const res = await fetch(`/api/seller-feedback?${params}`);
    if (res.ok) setNotes(await res.json());
    setLoading(false);
  }

  async function fetchReports() {
    const res = await fetch("/api/seller-feedback/reports?take=60");
    if (res.ok) setReports(await res.json());
  }

  async function generate(period: "DAILY" | "WEEKLY" | "MONTHLY") {
    setGenerating(period);
    setMessage("");
    const res = await fetch("/api/seller-feedback/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period }),
    });
    if (res.ok) {
      setMessage(`${period} report generated successfully.`);
      await fetchReports();
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setMessage(j.error || "Failed to generate report.");
    }
    setGenerating(null);
  }

  const groupedByDate = useMemo(() => {
    return notes.reduce<Record<string, FeedbackEntry[]>>((acc, n) => {
      const key = new Date(n.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      if (!acc[key]) acc[key] = [];
      acc[key].push(n);
      return acc;
    }, {});
  }, [notes]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Seller Recommendations Intelligence</h1>
        <p className="mt-1 text-zinc-400">Review manager notes and generate AI daily, weekly, and monthly reports.</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            AI Reports
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => void generate("DAILY")} disabled={!!generating}>
              {generating === "DAILY" ? "Generating..." : "Generate Daily Report"}
            </Button>
            <Button onClick={() => void generate("WEEKLY")} disabled={!!generating} variant="secondary">
              {generating === "WEEKLY" ? "Generating..." : "Generate Weekly Report"}
            </Button>
            <Button onClick={() => void generate("MONTHLY")} disabled={!!generating} variant="outline">
              {generating === "MONTHLY" ? "Generating..." : "Generate Monthly Report"}
            </Button>
          </div>
          {message && <p className="mt-3 text-sm text-zinc-300">{message}</p>}
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">From</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">To</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Manager</Label>
              <Select value={managerId} onValueChange={setManagerId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All managers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All managers</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Seller</Label>
              <Select value={sellerId} onValueChange={setSellerId}>
                <SelectTrigger className="w-48"><SelectValue placeholder="All sellers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All sellers</SelectItem>
                  {sellers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Topic</Label>
              <Select value={topic} onValueChange={setTopic}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All topics" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All topics</SelectItem>
                  {Object.entries(TOPIC_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 min-w-[220px] flex-1">
              <Label className="text-xs text-zinc-400">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} className="pl-9" placeholder="Find text in notes..." />
              </div>
            </div>
            <Button onClick={() => void fetchNotes()} variant="outline">
              <CalendarRange className="mr-1.5 h-4 w-4" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <h2 className="mb-3 text-lg font-semibold text-white">Manual Notes</h2>
          {loading ? (
            <Card><CardContent className="py-16 text-center text-zinc-400">Loading notes...</CardContent></Card>
          ) : notes.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-zinc-500">No notes found for this filter range.</CardContent></Card>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedByDate).map(([dateKey, items]) => (
                <div key={dateKey}>
                  <h3 className="sticky top-16 z-10 mb-2 bg-zinc-950 py-2 text-sm text-zinc-400">{dateKey}</h3>
                  <div className="space-y-2">
                    {items.map((n) => (
                      <div key={n.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3">
                        <div className="mb-1 flex items-center gap-2 flex-wrap">
                          <Avatar name={n.manager.name} avatarUrl={n.manager.avatarUrl} size="sm" />
                          <span className="text-sm font-medium text-zinc-100">{n.manager.name}</span>
                          <span className="text-sm text-zinc-400">→ {n.seller.name}</span>
                          <Badge variant="outline" className="text-xs">{TOPIC_LABELS[n.topic] || n.topic}</Badge>
                          <Badge variant="outline" className="text-xs">{n.sentiment}</Badge>
                        </div>
                        {n.title && <p className="text-sm font-semibold text-zinc-200">{n.title}</p>}
                        <p className="mt-1 text-sm text-zinc-300">{n.details}</p>
                        {n.suggestedAction && <p className="mt-2 text-xs text-indigo-300">Action: <span className="text-zinc-300">{n.suggestedAction}</span></p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold text-white">Generated Reports</h2>
          {reports.length === 0 ? (
            <Card><CardContent className="py-16 text-center text-zinc-500">No AI reports yet. Generate one above.</CardContent></Card>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => (
                <Card key={r.id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-indigo-400" />
                        {r.period} report ({new Date(r.fromDate).toLocaleDateString()} - {new Date(r.toDate).toLocaleDateString()})
                      </span>
                      <Badge variant="outline">{r.totalNotes} notes</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <p className="mb-1 flex items-center gap-1 text-xs uppercase text-zinc-500"><FileText className="h-3 w-3" /> Summary</p>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.summary}</p>
                    </div>
                    <div>
                      <p className="mb-1 text-xs uppercase text-zinc-500">Recommendations</p>
                      <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.recommendations}</p>
                    </div>
                    {Array.isArray(r.repeatedItems) && r.repeatedItems.length > 0 && (
                      <div>
                        <p className="mb-1 text-xs uppercase text-zinc-500">Repeated Themes</p>
                        <div className="flex flex-wrap gap-1.5">
                          {r.repeatedItems.slice(0, 8).map((it, idx) => (
                            <Badge key={`${r.id}-${idx}`} variant="secondary">
                              {(it.theme || it.keyword || "theme")}: {it.count ?? 1}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-zinc-500">
                      Generated by {r.creator.name} at {new Date(r.generatedAt).toLocaleString()} {r.model ? `(${r.model})` : ""}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
