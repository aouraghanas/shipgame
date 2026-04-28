"use client";

import { useEffect, useState } from "react";
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
import { Ticket, Plus } from "lucide-react";

type TicketRow = {
  id: string;
  title: string;
  subject: string;
  priority: string;
  status: string;
  recipient: string;
  createdAt: string;
  deadlineAt: string | null;
  createdBy: { name: string };
  assignee: { name: string } | null;
  seller: { name: string } | null;
  sellerNameText: string | null;
  _count: { attachments: number; comments: number };
};

type Assignable = { id: string; name: string; email: string; role: string };

export default function TicketsPage() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const canCreate = role === "MANAGER" || role === "ADMIN";

  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [sellerFreeText, setSellerFreeText] = useState("");
  const [assignees, setAssignees] = useState<Assignable[]>([]);
  const [msg, setMsg] = useState("");

  const [form, setForm] = useState({
    subject: "SOURCING" as string,
    priority: "NORMAL",
    recipient: "ALL_ADMINS" as string,
    assigneeId: "",
    title: "",
    description: "",
    deadlineAt: "",
  });

  async function load() {
    setLoading(true);
    setLoadError(null);
    const q = showArchived ? "?archived=1&take=100" : "?take=100";
    try {
      const r = await fetch(`/api/tickets${q}`);
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
  }

  useEffect(() => {
    void load();
  }, [showArchived]);

  useEffect(() => {
    fetch("/api/sellers").then((r) => r.json()).then(setSellers);
    if (canCreate) {
      fetch("/api/tickets/assignable-users").then((r) => r.json()).then(setAssignees);
    }
  }, [canCreate]);

  async function createTicket(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    const body: Record<string, unknown> = {
      subject: form.subject,
      priority: form.priority,
      recipient: form.recipient,
      title: form.title.trim(),
      description: form.description.trim(),
    };
    if (seller) body.sellerId = seller.id;
    if (!seller && sellerFreeText.trim()) body.sellerNameText = sellerFreeText.trim();
    if (form.recipient === "SPECIFIC_USER") body.assigneeId = form.assigneeId;
    if (form.deadlineAt) body.deadlineAt = new Date(form.deadlineAt + "T12:00:00").toISOString();

    const r = await fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(typeof j.error === "string" ? j.error : "Could not create ticket");
      return;
    }
    setMsg("Ticket created.");
    setForm({
      subject: "SOURCING",
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
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Ticket className="h-8 w-8 text-indigo-400" />
          Support tickets
        </h1>
        <p className="text-zinc-400 mt-1">
          Track sourcing, logistics, payments, and platform issues across teams. Archive resolved tickets to keep the queue clean.
        </p>
      </div>

      {canCreate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              New ticket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createTicket} className="space-y-4 max-w-2xl">
              <div className="space-y-2">
                <Label>Seller</Label>
                <SellerCombobox sellers={sellers} value={seller} onChange={setSeller} onNewSeller={(s) => setSellers((p) => [...p, s].sort((a, b) => a.name.localeCompare(b.name)))} />
                <p className="text-xs text-zinc-500">Or describe the seller if not in the list:</p>
                <Input
                  value={sellerFreeText}
                  onChange={(e) => setSellerFreeText(e.target.value)}
                  placeholder="Seller name / phone / notes"
                  disabled={!!seller}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Select value={form.subject} onValueChange={(v) => setForm((f) => ({ ...f, subject: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-64">
                      {TICKET_SUBJECTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TICKET_PRIORITIES.map((p) => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Route to</Label>
                  <Select value={form.recipient} onValueChange={(v) => setForm((f) => ({ ...f, recipient: v, assigneeId: "" }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TICKET_RECIPIENTS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.recipient === "SPECIFIC_USER" && (
                  <div className="space-y-2">
                    <Label>Assignee</Label>
                    <Select value={form.assigneeId} onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select user" /></SelectTrigger>
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
                <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={6} required minLength={10} />
              </div>
              <div className="space-y-2 max-w-xs">
                <Label>Deadline (optional)</Label>
                <Input type="datetime-local" value={form.deadlineAt} onChange={(e) => setForm((f) => ({ ...f, deadlineAt: e.target.value }))} />
              </div>
              {msg && <p className="text-sm text-emerald-400">{msg}</p>}
              <Button type="submit">Submit ticket</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loadError && (
        <div className="rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          {loadError}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-lg font-semibold text-white">Queue</h2>
        <label className="flex items-center gap-2 text-sm text-zinc-400">
          <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
          Show archived
        </label>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((t) => (
            <Link key={t.id} href={`/tickets/${t.id}`}>
              <div className="rounded-lg border border-zinc-800 bg-zinc-900/80 px-4 py-3 hover:border-zinc-600 transition-colors">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-zinc-100">{t.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {TICKET_SUBJECTS.find((s) => s.value === t.subject)?.label ?? t.subject} · {t.priority} ·{" "}
                      {TICKET_RECIPIENTS.find((r) => r.value === t.recipient)?.label ?? t.recipient}
                    </p>
                  </div>
                  <span className="text-xs font-mono text-zinc-500">{t.status}</span>
                </div>
                <p className="text-xs text-zinc-500 mt-2">
                  Seller: {t.seller?.name ?? t.sellerNameText ?? "—"} · By {t.createdBy.name}
                  {t.assignee ? ` · Assigned ${t.assignee.name}` : ""} · {t._count.comments} comments ·{" "}
                  {t._count.attachments} files
                </p>
              </div>
            </Link>
          ))}
          {tickets.length === 0 && !loadError && (
            <p className="text-zinc-500 text-sm">
              No tickets in this view.{" "}
              {canCreate ? "Create one above, or turn on “Show archived” for older items." : "Nothing in the queue yet."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
