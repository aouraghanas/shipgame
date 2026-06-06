"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, BellRing, Users2, CheckCheck, Smartphone } from "lucide-react";

type Audience = "ALL" | "ROLES" | "USERS";

type UserLite = { id: string; name: string; email: string; role: string; status: string };

type Campaign = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  audience: Audience;
  targetRoles: string[];
  createdBy: { id: string; name: string } | null;
  createdAt: string;
  recipientCount: number;
  pushSentCount: number;
  readCount: number;
};

const ROLES = [
  "ADMIN",
  "MANAGER",
  "ACCOUNTANT",
  "SOURCING_AGENT",
  "LIBYAN_ACCOUNTANT",
  "TASK_AGENT",
  "CONFIRMATION_AGENT",
  "CONFIRMATION_SCREEN",
  "SCREEN",
] as const;

export default function AppNotificationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [link, setLink] = useState("");
  const [audience, setAudience] = useState<Audience>("ALL");
  const [roles, setRoles] = useState<string[]>([]);
  const [userIds, setUserIds] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgIsError, setMsgIsError] = useState(false);

  async function loadCampaigns() {
    setLoading(true);
    const r = await fetch("/api/admin/notification-campaigns");
    if (r.ok) setCampaigns(await r.json());
    setLoading(false);
  }

  useEffect(() => {
    void loadCampaigns();
    fetch("/api/users")
      .then((r) => (r.ok ? r.json() : []))
      .then((all: UserLite[]) => setUsers(all.filter((u) => u.status === "ACTIVE")));
  }, []);

  const estimatedRecipients = useMemo(() => {
    if (audience === "ALL") return users.length;
    if (audience === "ROLES")
      return users.filter((u) => roles.includes(u.role)).length;
    return userIds.length;
  }, [audience, users, roles, userIds]);

  function toggleRole(r: string) {
    setRoles((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  }
  function toggleUser(id: string) {
    setUserIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgIsError(false);
    if (!title.trim()) {
      setMsgIsError(true);
      setMsg("Title is required.");
      return;
    }
    setSending(true);
    try {
      const r = await fetch("/api/admin/notification-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          body: body.trim() || undefined,
          link: link.trim() || undefined,
          audience,
          targetRoles: audience === "ROLES" ? roles : undefined,
          userIds: audience === "USERS" ? userIds : undefined,
        }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        setMsgIsError(true);
        setMsg(typeof j.error === "string" ? j.error : "Failed to send.");
        return;
      }
      setMsg(`Sent to ${j.recipientCount} users · ${j.pushSentCount} push delivered.`);
      setTitle("");
      setBody("");
      setLink("");
      setRoles([]);
      setUserIds([]);
      setAudience("ALL");
      void loadCampaigns();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[400px_minmax(0,1fr)]">
        {/* Compose */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BellRing className="h-4 w-4 text-brand" />
                Send app notification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={send} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Title</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Message</Label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={2000} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Link (optional)</Label>
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="/tickets or /leaderboard"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Audience</Label>
                  <Select value={audience} onValueChange={(v) => setAudience(v as Audience)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Everyone</SelectItem>
                      <SelectItem value="ROLES">By role</SelectItem>
                      <SelectItem value="USERS">Specific people</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {audience === "ROLES" && (
                  <div className="flex flex-wrap gap-1.5">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => toggleRole(r)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                          roles.includes(r)
                            ? "brand-keep bg-brand text-white"
                            : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                )}

                {audience === "USERS" && (
                  <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-zinc-800 p-2">
                    {users.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 text-sm text-zinc-300">
                        <input
                          type="checkbox"
                          checked={userIds.includes(u.id)}
                          onChange={() => toggleUser(u.id)}
                        />
                        {u.name} <span className="text-xs text-zinc-500">({u.role})</span>
                      </label>
                    ))}
                  </div>
                )}

                <p className="flex items-center gap-1.5 text-xs text-zinc-500">
                  <Users2 className="h-3.5 w-3.5" />
                  ~{estimatedRecipients} recipient{estimatedRecipients === 1 ? "" : "s"}
                </p>

                {msg && (
                  <p className={`text-sm ${msgIsError ? "text-red-400" : "text-emerald-400"}`}>{msg}</p>
                )}

                <Button type="submit" className="w-full gap-2" disabled={sending}>
                  <Send className="h-4 w-4" />
                  {sending ? "Sending…" : "Send notification"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* History + analytics */}
        <div className="space-y-3 min-w-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Sent notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="flex justify-center py-10">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
                </div>
              ) : campaigns.length === 0 ? (
                <p className="py-10 text-center text-sm text-zinc-500">
                  No notifications sent yet.
                </p>
              ) : (
                campaigns.map((c) => {
                  const readPct =
                    c.recipientCount > 0
                      ? Math.round((c.readCount / c.recipientCount) * 100)
                      : 0;
                  return (
                    <div
                      key={c.id}
                      className="rounded-lg border border-zinc-800 bg-zinc-900/40 px-3 py-2.5"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-medium text-zinc-100">{c.title}</p>
                          {c.body && (
                            <p className="mt-0.5 line-clamp-2 text-xs text-zinc-400">{c.body}</p>
                          )}
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {c.audience === "ROLES" ? c.targetRoles.join(", ") || "ROLES" : c.audience}
                        </Badge>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-zinc-500">
                        <span className="flex items-center gap-1">
                          <Users2 className="h-3 w-3" /> {c.recipientCount} recipients
                        </span>
                        <span className="flex items-center gap-1">
                          <Smartphone className="h-3 w-3" /> {c.pushSentCount} push
                        </span>
                        <span className="flex items-center gap-1">
                          <CheckCheck className="h-3 w-3" /> {c.readCount} read ({readPct}%)
                        </span>
                        <span className="ml-auto">
                          {new Date(c.createdAt).toLocaleString()}
                          {c.createdBy ? ` · ${c.createdBy.name}` : ""}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${readPct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
