"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SellerCombobox, type Seller } from "@/components/activity/SellerCombobox";
import { TICKET_PRIORITIES, TICKET_RECIPIENTS, TICKET_STATUSES, TICKET_SUBJECTS } from "@/lib/ticket-constants";
import { ticketRowClasses, ticketStatusBadgeClasses } from "@/lib/ticket-row-styles";
import { cn } from "@/lib/utils";
import { Ticket, Plus, Filter, Inbox } from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";

type TicketRow = {
  id: string;
  title: string;
  subject: string;
  priority: string;
  status: string;
  recipient: string;
  createdAt: string;
  deadlineAt: string | null;
  createdBy: { id: string; name: string };
  assignee: { name: string } | null;
  seller: { name: string } | null;
  sellerNameText: string | null;
  _count: { attachments: number; comments: number };
};

type Assignable = { id: string; name: string; email: string; role: string };

type Summary = {
  byStatus: Record<string, number>;
  total: number;
  openPipeline: number;
};

/** API returns either a string or Zod `flatten()` shape on validation failure. */
function formatCreateTicketError(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "Could not create ticket";
  const err = (payload as { error?: unknown }).error;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "formErrors" in err) {
    const f = err as { formErrors: string[]; fieldErrors: Record<string, string[] | undefined> };
    const lines: string[] = [...(f.formErrors ?? [])];
    for (const [key, vals] of Object.entries(f.fieldErrors ?? {})) {
      if (vals?.length) lines.push(...vals.map((v) => (key ? `${key}: ${v}` : v)));
    }
    return lines.filter(Boolean).join(" · ") || "Validation failed";
  }
  return "Could not create ticket";
}

function buildListQuery(params: {
  showArchived: boolean;
  status: string;
  priority: string;
  createdBy: string;
  dateFrom: string;
  dateTo: string;
}): string {
  const p = new URLSearchParams();
  p.set("take", "100");
  if (params.showArchived) p.set("archived", "1");
  if (params.status) p.set("status", params.status);
  if (params.priority) p.set("priority", params.priority);
  if (params.createdBy) p.set("createdBy", params.createdBy);
  if (params.dateFrom) p.set("dateFrom", params.dateFrom);
  if (params.dateTo) p.set("dateTo", params.dateTo);
  return p.toString();
}

function buildSummaryQuery(params: {
  showArchived: boolean;
  createdBy: string;
  dateFrom: string;
  dateTo: string;
}): string {
  const p = new URLSearchParams();
  if (params.showArchived) p.set("archived", "1");
  if (params.createdBy) p.set("createdBy", params.createdBy);
  if (params.dateFrom) p.set("dateFrom", params.dateFrom);
  if (params.dateTo) p.set("dateTo", params.dateTo);
  return p.toString();
}

export default function TicketsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const t = useT();
  const canCreate =
    role === "MANAGER" || role === "ADMIN" || role === "SOURCING_AGENT" || role === "ACCOUNTANT";
  const sellerOptional = role === "SOURCING_AGENT" || role === "ACCOUNTANT";
  const canFilterByCreator =
    role === "ADMIN" || role === "SOURCING_AGENT" || role === "ACCOUNTANT";

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [filterCreatedBy, setFilterCreatedBy] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [sellerFreeText, setSellerFreeText] = useState("");
  const [assignees, setAssignees] = useState<Assignable[]>([]);
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);

  const [form, setForm] = useState({
    subject: "SOURCING" as string,
    priority: "NORMAL",
    recipient: "ALL_ADMINS" as string,
    assigneeId: "",
    title: "",
    description: "",
    deadlineAt: "",
  });

  const listParams = useMemo(
    () => ({
      showArchived,
      status: filterStatus,
      priority: filterPriority,
      createdBy: filterCreatedBy,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
    }),
    [showArchived, filterStatus, filterPriority, filterCreatedBy, filterDateFrom, filterDateTo]
  );

  const summaryParams = useMemo(
    () => ({
      showArchived,
      createdBy: filterCreatedBy,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
    }),
    [showArchived, filterCreatedBy, filterDateFrom, filterDateTo]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const q = buildListQuery(listParams);
    try {
      const r = await fetch(`/api/tickets?${q}`);
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setTickets([]);
        setLoadError(
          typeof data.error === "string"
            ? data.error
            : `Could not load tickets (${r.status}). If this is a fresh deploy, run a database sync so SupportTicket tables exist.`
        );
        return;
      }
      setTickets(Array.isArray(data) ? data : []);
    } catch {
      setTickets([]);
      setLoadError("Network error loading tickets.");
    } finally {
      setLoading(false);
    }
  }, [listParams]);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    const q = buildSummaryQuery(summaryParams);
    try {
      const r = await fetch(`/api/tickets/summary?${q}`);
      const data = (await r.json().catch(() => ({}))) as Partial<Summary>;
      if (!r.ok) {
        setSummary(null);
        return;
      }
      setSummary({
        byStatus: data.byStatus ?? {},
        total: typeof data.total === "number" ? data.total : 0,
        openPipeline: typeof data.openPipeline === "number" ? data.openPipeline : 0,
      });
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [summaryParams]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void fetch("/api/sellers")
      .then((r) => r.json())
      .then(setSellers);
  }, []);

  useEffect(() => {
    if (!role || !["ADMIN", "MANAGER", "SOURCING_AGENT", "ACCOUNTANT"].includes(role)) return;
    void fetch("/api/tickets/assignable-users")
      .then((r) => (r.ok ? r.json() : []))
      .then(setAssignees);
  }, [role]);

  function clearFilters() {
    setFilterStatus("");
    setFilterPriority("");
    setFilterCreatedBy("");
    setFilterDateFrom("");
    setFilterDateTo("");
    setShowArchived(false);
  }

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgIsError(false);

    if (!sellerOptional && !seller && !sellerFreeText.trim()) {
      setMsgIsError(true);
      setMsg("Choose a seller or enter seller details.");
      return;
    }

    const body: Record<string, unknown> = {
      subject: form.subject,
      priority: form.priority,
      recipient: form.recipient,
      title: form.title.trim(),
      description: form.description.trim(),
    };
    if (seller) body.sellerId = seller.id;
    if (!seller && sellerFreeText.trim()) body.sellerNameText = sellerFreeText.trim();
    if (form.recipient === "SPECIFIC_USER") body.assigneeId = form.assigneeId || null;

    if (form.deadlineAt?.trim()) {
      const d = new Date(form.deadlineAt);
      if (Number.isNaN(d.getTime())) {
        setMsgIsError(true);
        setMsg("Invalid deadline — clear it or pick a valid date and time.");
        return;
      }
      body.deadlineAt = d.toISOString();
    }

    let r: Response;
    try {
      r = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      setMsgIsError(true);
      setMsg("Network error — try again.");
      return;
    }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsgIsError(true);
      setMsg(formatCreateTicketError(j));
      return;
    }
    setMsgIsError(false);
    setMsg("Ticket created.");
    setForm({
      subject: role === "ACCOUNTANT" ? "ACCOUNTING" : "SOURCING",
      priority: "NORMAL",
      recipient: "ALL_ADMINS",
      assigneeId: "",
      title: "",
      description: "",
      deadlineAt: "",
    });
    setSeller(null);
    setSellerFreeText("");
    void load();
    void loadSummary();
  }

  const bs = summary?.byStatus ?? {};

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Ticket className="h-8 w-8 text-indigo-400" />
          {t("tickets.title")}
        </h1>
        <p className="text-zinc-400 mt-1 max-w-3xl">{t("tickets.subtitle")}</p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Inbox className="h-5 w-5 text-indigo-400" />
          {t("tickets.queue")}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {[
            { label: t("tickets.stats.active"), value: summaryLoading ? "…" : String(summary?.openPipeline ?? 0), hint: t("tickets.stats.activeHint") },
            { label: t("tickets.stats.open"), value: summaryLoading ? "…" : String(bs.OPEN ?? 0), hint: "" },
            { label: t("tickets.stats.inProgress"), value: summaryLoading ? "…" : String(bs.IN_PROGRESS ?? 0), hint: "" },
            { label: t("tickets.stats.waiting"), value: summaryLoading ? "…" : String(bs.WAITING ?? 0), hint: "" },
            { label: t("tickets.stats.resolved"), value: summaryLoading ? "…" : String(bs.RESOLVED ?? 0), hint: "" },
            { label: t("tickets.stats.archived"), value: summaryLoading ? "…" : String(bs.ARCHIVED ?? 0), hint: "" },
            { label: t("tickets.stats.total"), value: summaryLoading ? "…" : String(summary?.total ?? 0), hint: t("tickets.stats.totalHint") },
          ].map((c) => (
            <div
              key={c.label}
              title={c.hint || undefined}
              className="rounded-lg border border-zinc-800/90 bg-zinc-900/40 px-3 py-2.5"
            >
              <p className="text-[10px] uppercase tracking-wide text-zinc-500 font-medium">{c.label}</p>
              <p className="text-lg font-semibold text-zinc-100 tabular-nums">{c.value}</p>
            </div>
          ))}
        </div>

        <Card className="border-zinc-800 bg-zinc-900/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-zinc-200 flex items-center gap-2">
              <Filter className="h-4 w-4 text-zinc-400" />
              {t("tickets.filters")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 pt-0">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">{t("tickets.filters.status")}</Label>
              <Select value={filterStatus || "__all__"} onValueChange={(v) => setFilterStatus(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("tickets.filters.allStatuses")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("tickets.filters.allStatuses")}</SelectItem>
                  {TICKET_STATUSES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {t(`status.${s.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">{t("tickets.filters.priority")}</Label>
              <Select value={filterPriority || "__all__"} onValueChange={(v) => setFilterPriority(v === "__all__" ? "" : v)}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("tickets.filters.allPriorities")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">{t("tickets.filters.allPriorities")}</SelectItem>
                  {TICKET_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {t(`priority.${p.value}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {canFilterByCreator ? (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">{t("tickets.filters.creator")}</Label>
                <Select value={filterCreatedBy || "__all__"} onValueChange={(v) => setFilterCreatedBy(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder={t("tickets.filters.anyone")} />
                  </SelectTrigger>
                  <SelectContent className="max-h-64">
                    <SelectItem value="__all__">{t("tickets.filters.anyone")}</SelectItem>
                    {assignees.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} ({u.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-400">{t("tickets.filters.creator")}</Label>
                <p className="text-sm text-zinc-500 pt-2">{t("tickets.filters.scopedHint")}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">{t("tickets.filters.dateFrom")}</Label>
              <Input className="h-9" type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-zinc-400">{t("tickets.filters.dateTo")}</Label>
              <Input className="h-9" type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
            </div>
            <div className="flex flex-col justify-end gap-2">
              <label className="flex items-center gap-2 text-sm text-zinc-400 cursor-pointer">
                <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                {t("tickets.filters.includeArchived")}
              </label>
              <Button type="button" variant="secondary" size="sm" className="w-full sm:w-auto" onClick={clearFilters}>
                {t("tickets.filters.clear")}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loadError && (
          <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {loadError}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((row) => (
              <Link key={row.id} href={`/tickets/${row.id}`} className="block group">
                <div
                  className={cn(
                    "rounded-lg px-4 py-3 transition-colors group-hover:border-zinc-600/80",
                    ticketRowClasses(row.priority)
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-zinc-100 truncate">{row.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        {TICKET_SUBJECTS.find((s) => s.value === row.subject)?.label ?? row.subject} ·{" "}
                        {t(`priority.${row.priority}`)} ·{" "}
                        {TICKET_RECIPIENTS.find((r) => r.value === row.recipient)?.label ?? row.recipient}
                      </p>
                    </div>
                    <span className={cn("shrink-0 text-xs font-medium rounded-full px-2 py-0.5", ticketStatusBadgeClasses(row.status))}>
                      {t(`status.${row.status}`)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 mt-2">
                    Seller: {row.seller?.name ?? row.sellerNameText ?? "—"} · By {row.createdBy.name}
                    {row.assignee ? ` · Assigned ${row.assignee.name}` : ""} · {row._count.comments} comments · {row._count.attachments}{" "}
                    files · {new Date(row.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </Link>
            ))}
            {tickets.length === 0 && !loadError && (
              <p className="text-zinc-500 text-sm">
                {t("tickets.empty")}{" "}
                {canCreate ? t("tickets.emptyCanCreate") : t("tickets.emptyReadOnly")}
              </p>
            )}
          </div>
        )}
      </section>

      {canCreate && (
        <Card className="border-zinc-800">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              {t("tickets.new")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTicket} className="space-y-4 max-w-2xl">
              <div className="space-y-2">
                <Label>Seller {sellerOptional && <span className="text-zinc-500 font-normal">(optional)</span>}</Label>
                <SellerCombobox
                  sellers={sellers}
                  value={seller}
                  onChange={setSeller}
                  onNewSeller={(s) => setSellers((p) => [...p, s].sort((a, b) => a.name.localeCompare(b.name)))}
                />
                <p className="text-xs text-zinc-500">
                  {sellerOptional
                    ? "Link a seller when the ticket is about a specific account; otherwise leave blank."
                    : "Or describe the seller if not in the list:"}
                </p>
                {!sellerOptional && (
                  <Input
                    value={sellerFreeText}
                    onChange={(e) => setSellerFreeText(e.target.value)}
                    placeholder="Seller name / phone / notes"
                    disabled={!!seller}
                  />
                )}
                {sellerOptional && (
                  <Input
                    value={sellerFreeText}
                    onChange={(e) => setSellerFreeText(e.target.value)}
                    placeholder="Optional: seller name / notes"
                    disabled={!!seller}
                  />
                )}
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={form.subject} onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="max-h-64">
                      {TICKET_SUBJECTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t("tickets.filters.priority")}</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {t(`priority.${p.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Route to</Label>
                  <Select value={form.recipient} onValueChange={(v) => setForm((f) => ({ ...f, recipient: v, assigneeId: "" }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TICKET_RECIPIENTS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>
                          {r.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.recipient === "SPECIFIC_USER" && (
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select value={form.assigneeId} onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select user" />
                      </SelectTrigger>
                      <SelectContent>
                        {assignees.map((u) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.name} ({u.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required maxLength={200} />
              </div>
              <div className="space-y-2">
                <Label>Details</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={6}
                  required
                  minLength={10}
                />
              </div>
              <div className="space-y-2 max-w-xs">
                <Label>Deadline (optional)</Label>
                <Input type="datetime-local" value={form.deadlineAt} onChange={(e) => setForm((f) => ({ ...f, deadlineAt: e.target.value }))} />
              </div>
              {msg && <p className={`text-sm ${msgIsError ? "text-red-400" : "text-emerald-400"}`}>{msg}</p>}
              <Button type="submit">{t("common.submit")}</Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
