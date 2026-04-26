"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import { Search, Filter, Download, Paperclip, ClipboardList, Sparkles, BarChart3 } from "lucide-react";
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

type ActivityAiReport = {
  id: string;
  period: string;
  scope: string;
  sellerId: string | null;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  totalActivities: number;
  categoryBreakdown: Record<string, number> | null;
  managerBreakdown: Record<string, { name: string; count: number }> | null;
  insights: Record<string, unknown> | null;
  summary: string;
  recommendations: string;
  trigger: string;
  model: string | null;
  creator: { id: string; name: string } | null;
  seller: { id: string; name: string } | null;
};

type AutomationRow = {
  id: string;
  autoEnabled: boolean;
  autoPeriod: string;
  lastAutoRunAt: string | null;
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

  const [aiReports, setAiReports] = useState<ActivityAiReport[]>([]);
  const [aiLoading, setAiLoading] = useState(true);
  const [automation, setAutomation] = useState<AutomationRow | null>(null);
  const [aiGenMsg, setAiGenMsg] = useState("");
  const [aiGenerating, setAiGenerating] = useState(false);

  const [aiPeriod, setAiPeriod] = useState<"DAILY" | "WEEKLY" | "MONTHLY">("WEEKLY");
  const [aiAnchor, setAiAnchor] = useState(getToday);
  const [aiScope, setAiScope] = useState<"GLOBAL" | "SELLER">("GLOBAL");
  const [aiSellerId, setAiSellerId] = useState("all");
  const [aiManagerId, setAiManagerId] = useState("all");
  const [aiTopSellers, setAiTopSellers] = useState("0");

  const [histPeriod, setHistPeriod] = useState("all");
  const [histScope, setHistScope] = useState("all");
  const [histTrigger, setHistTrigger] = useState("all");

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
    void loadAutomation();
  }, []);

  useEffect(() => {
    void loadAiReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histPeriod, histScope, histTrigger]);

  async function loadAutomation() {
    const res = await fetch("/api/activity-reports/automation");
    if (res.ok) setAutomation(await res.json());
  }

  async function loadAiReports() {
    setAiLoading(true);
    const params = new URLSearchParams();
    params.set("take", "80");
    if (histPeriod !== "all") params.set("period", histPeriod);
    if (histScope !== "all") params.set("scope", histScope);
    if (histTrigger !== "all") params.set("trigger", histTrigger);
    const res = await fetch(`/api/activity-reports?${params}`);
    if (res.ok) setAiReports(await res.json());
    setAiLoading(false);
  }

  async function patchAutomation(patch: Partial<{ autoEnabled: boolean; autoPeriod: string }>) {
    const res = await fetch("/api/activity-reports/automation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) setAutomation(await res.json());
  }

  async function generateAiReports() {
    setAiGenMsg("");
    setAiGenerating(true);
    const body: Record<string, unknown> = {
      period: aiPeriod,
      anchorDate: aiAnchor,
      scope: aiScope,
      includeTopSellers: aiScope === "GLOBAL" ? Number(aiTopSellers) || 0 : 0,
    };
    if (aiManagerId !== "all") body.managerId = aiManagerId;
    if (aiScope === "SELLER" && aiSellerId !== "all") body.sellerId = aiSellerId;

    const res = await fetch("/api/activity-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const j = (await res.json()) as { reports: ActivityAiReport[] };
      setAiGenMsg(`Saved ${j.reports.length} AI report(s).`);
      await loadAiReports();
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: string };
      setAiGenMsg(j.error || "Generation failed.");
    }
    setAiGenerating(false);
  }

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

      {/* AI activity intelligence */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              Automatic AI summaries
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-zinc-200">Enable scheduled generation</p>
                <p className="text-xs text-zinc-500">Requires an external cron hitting the secure endpoint below.</p>
              </div>
              <Switch
                checked={automation?.autoEnabled ?? false}
                onCheckedChange={(v) => void patchAutomation({ autoEnabled: v })}
                disabled={!automation}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Auto cadence</Label>
              <Select
                value={automation?.autoPeriod ?? "DAILY"}
                onValueChange={(v) => void patchAutomation({ autoPeriod: v })}
                disabled={!automation}
              >
                <SelectTrigger className="w-full max-w-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-xs leading-relaxed text-zinc-500">
              Cron URL (GET): <span className="font-mono text-zinc-400">/api/cron/activity-reports</span> with header{" "}
              <span className="font-mono text-zinc-400">Authorization: Bearer $CRON_SECRET</span>.
              Set <span className="font-mono">CRON_SECRET</span> and <span className="font-mono">OPENAI_API_KEY</span> in Netlify.
              Optional: <span className="font-mono">ACTIVITY_AI_AUTO_MAX_SELLERS</span> (default 15) caps per-seller reports per run.
            </p>
            {automation?.lastAutoRunAt && (
              <p className="text-xs text-zinc-500">Last auto run: {new Date(automation.lastAutoRunAt).toLocaleString()}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BarChart3 className="h-5 w-5 text-indigo-400" />
              Manual AI generation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Period</Label>
                <Select value={aiPeriod} onValueChange={(v) => setAiPeriod(v as typeof aiPeriod)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAILY">Daily</SelectItem>
                    <SelectItem value="WEEKLY">Weekly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Anchor date</Label>
                <Input type="date" value={aiAnchor} onChange={(e) => setAiAnchor(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Scope</Label>
                <Select value={aiScope} onValueChange={(v) => setAiScope(v as "GLOBAL" | "SELLER")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GLOBAL">Global (all sellers)</SelectItem>
                    <SelectItem value="SELLER">Single seller</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {aiScope === "SELLER" && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-zinc-400">Seller</Label>
                  <Select value={aiSellerId} onValueChange={setAiSellerId}>
                    <SelectTrigger><SelectValue placeholder="Choose seller" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Select seller…</SelectItem>
                      {sellers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            {aiScope === "GLOBAL" && (
              <div className="space-y-1.5">
                <Label className="text-xs text-zinc-400">Also generate top sellers (by activity count)</Label>
                <Select value={aiTopSellers} onValueChange={setAiTopSellers}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Global only</SelectItem>
                    <SelectItem value="5">Global + top 5 sellers</SelectItem>
                    <SelectItem value="10">Global + top 10 sellers</SelectItem>
                    <SelectItem value="15">Global + top 15 sellers</SelectItem>
                    <SelectItem value="25">Global + top 25 sellers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Optional: limit activities to one manager</Label>
              <Select value={aiManagerId} onValueChange={setAiManagerId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All managers</SelectItem>
                  {managers.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => void generateAiReports()} disabled={aiGenerating || (aiScope === "SELLER" && aiSellerId === "all")}>
              {aiGenerating ? "Generating…" : "Generate & save AI report(s)"}
            </Button>
            {aiGenMsg && <p className="text-sm text-zinc-300">{aiGenMsg}</p>}
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Saved AI reports</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Period</Label>
              <Select value={histPeriod} onValueChange={setHistPeriod}>
                <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="DAILY">Daily</SelectItem>
                  <SelectItem value="WEEKLY">Weekly</SelectItem>
                  <SelectItem value="MONTHLY">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Scope</Label>
              <Select value={histScope} onValueChange={setHistScope}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="GLOBAL">Global</SelectItem>
                  <SelectItem value="SELLER">Seller</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-zinc-400">Trigger</Label>
              <Select value={histTrigger} onValueChange={setHistTrigger}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="MANUAL">Manual</SelectItem>
                  <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {aiLoading ? (
            <p className="text-sm text-zinc-500">Loading reports…</p>
          ) : aiReports.length === 0 ? (
            <p className="text-sm text-zinc-500">No AI reports saved yet.</p>
          ) : (
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {aiReports.map((r) => (
                <div key={r.id} className="rounded-lg border border-zinc-800 bg-zinc-900/80 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                    <Badge variant="outline">{r.period}</Badge>
                    <Badge variant="outline">{r.scope}</Badge>
                    <Badge variant="outline">{r.trigger}</Badge>
                    {r.seller && <span className="text-zinc-300">Seller: {r.seller.name}</span>}
                    <span className="ml-auto font-mono">{new Date(r.generatedAt).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-zinc-500 mb-1">
                    Window {new Date(r.fromDate).toLocaleDateString()} → {new Date(r.toDate).toLocaleDateString()} · {r.totalActivities} activities
                    {r.model ? ` · ${r.model}` : ""}
                  </p>
                  {r.categoryBreakdown && (
                    <div className="mb-2 flex flex-wrap gap-1">
                      {Object.entries(r.categoryBreakdown).map(([k, v]) => (
                        <Badge key={k} variant="secondary" className="text-[10px]">{CATEGORY_LABELS[k] ?? k}: {v}</Badge>
                      ))}
                    </div>
                  )}
                  <p className="text-sm font-medium text-zinc-100 mb-1">Summary</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap mb-2">{r.summary}</p>
                  <p className="text-sm font-medium text-zinc-100 mb-1">Recommendations</p>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap mb-2">{r.recommendations}</p>
                  {r.insights && typeof r.insights === "object" && (
                    <div className="rounded-md border border-zinc-800 bg-zinc-950/50 p-3 text-xs text-zinc-400 space-y-1">
                      {Object.entries(r.insights).map(([k, v]) => (
                        <div key={k}>
                          <span className="font-semibold text-zinc-300">{k}: </span>
                          <span>{typeof v === "string" ? v : JSON.stringify(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
