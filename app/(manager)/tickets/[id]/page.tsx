"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
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
import { TICKET_PRIORITIES, TICKET_RECIPIENTS, TICKET_STATUSES, TICKET_SUBJECTS } from "@/lib/ticket-constants";
import { ArrowLeft, Paperclip } from "lucide-react";

type TicketDetail = {
  id: string;
  title: string;
  description: string;
  subject: string;
  priority: string;
  status: string;
  recipient: string;
  deadlineAt: string | null;
  resolutionNote: string | null;
  sellerNameText: string | null;
  createdBy: { id: string; name: string; role: string };
  assignee: { id: string; name: string } | null;
  seller: { id: string; name: string } | null;
  attachments: { id: string; url: string; fileName: string; mimeType: string; size: number }[];
  comments: { id: string; body: string; createdAt: string; user: { id: string; name: string; role: string } }[];
};

type Assignable = { id: string; name: string; email: string; role: string };

export default function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const role = session?.user?.role;

  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [assignees, setAssignees] = useState<Assignable[]>([]);
  const [comment, setComment] = useState("");
  const [msg, setMsg] = useState("");
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch(`/api/tickets/${id}`);
    if (r.ok) setTicket(await r.json());
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (role === "MANAGER" || role === "ADMIN" || role === "SOURCING_AGENT") {
      fetch("/api/tickets/assignable-users")
        .then((r) => (r.ok ? r.json() : []))
        .then(setAssignees);
    }
  }, [role]);

  const canWorkflow =
    ticket != null &&
    (role === "ADMIN" ||
      (role === "SOURCING_AGENT" &&
        (ticket.recipient === "SOURCING_TEAM" || ticket.assignee?.id === session?.user?.id)));

  const canEditMetaUI =
    ticket != null &&
    (role === "ADMIN" ||
      (role === "MANAGER" &&
        ticket.createdBy.id === session?.user?.id &&
        ticket.status !== "ARCHIVED") ||
      canWorkflow);

  async function patch(patch: Record<string, unknown>) {
    setMsg("");
    const r = await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) {
      setMsg(j.error || "Update failed");
      return;
    }
    setTicket(j);
    setMsg("Saved.");
  }

  async function addComment(e: React.FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    const r = await fetch(`/api/tickets/${id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
    if (r.ok) {
      setComment("");
      void load();
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setMsg("");
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", file);
        const up = await fetch("/api/upload-ticket", { method: "POST", body: fd });
        const uj = await up.json();
        if (!up.ok) {
          setMsg(uj.error || "Upload failed");
          break;
        }
        await fetch(`/api/tickets/${id}/attachments`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: uj.url,
            fileName: uj.name,
            mimeType: uj.type,
            size: uj.size,
          }),
        });
      }
      void load();
    } finally {
      setUploading(false);
    }
  }

  if (!ticket) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/tickets">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> All tickets
        </Button>
      </Link>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl text-white">{ticket.title}</CardTitle>
          <p className="text-sm text-zinc-500">
            {TICKET_SUBJECTS.find((s) => s.value === ticket.subject)?.label} ·{" "}
            {TICKET_RECIPIENTS.find((r) => r.value === ticket.recipient)?.label} · Opened by {ticket.createdBy.name}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-zinc-300 whitespace-pre-wrap">{ticket.description}</div>
          <p className="text-xs text-zinc-500">
            Seller: {ticket.seller?.name ?? ticket.sellerNameText ?? "—"}
            {ticket.deadlineAt && ` · Deadline ${new Date(ticket.deadlineAt).toLocaleString()}`}
          </p>
          {ticket.resolutionNote && (
            <div className="rounded-md border border-emerald-900/50 bg-emerald-950/30 p-3 text-sm text-emerald-200">
              <span className="font-medium">Resolution: </span>
              {ticket.resolutionNote}
            </div>
          )}
        </CardContent>
      </Card>

      {canWorkflow && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs">Status</Label>
                <Select value={ticket.status} onValueChange={(v) => void patch({ status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TICKET_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Assignee</Label>
                <Select
                  value={ticket.assignee?.id ?? "__none__"}
                  onValueChange={(v) => void patch({ assigneeId: v === "__none__" ? null : v })}
                >
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Unassigned</SelectItem>
                    {assignees.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Resolution note</Label>
              <Textarea
                defaultValue={ticket.resolutionNote ?? ""}
                id="resNote"
                rows={3}
                placeholder="What was done to close this ticket"
              />
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  const el = document.getElementById("resNote") as HTMLTextAreaElement | null;
                  void patch({ resolutionNote: el?.value ?? "" });
                }}
              >
                Save resolution note
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canEditMetaUI && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Meta (priority & deadline)</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Priority</Label>
              <Select value={ticket.priority} onValueChange={(v) => void patch({ priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Deadline</Label>
              <Input
                type="datetime-local"
                defaultValue={
                  ticket.deadlineAt
                    ? new Date(ticket.deadlineAt).toISOString().slice(0, 16)
                    : ""
                }
                id="deadline"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  const el = document.getElementById("deadline") as HTMLInputElement | null;
                  const v = el?.value;
                  void patch({ deadlineAt: v ? new Date(v).toISOString() : null });
                }}
              >
                Save deadline
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Attachments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="inline-flex">
            <span className="sr-only">Upload files</span>
            <Input
              type="file"
              multiple
              className="max-w-xs text-sm"
              disabled={uploading}
              onChange={(e) => void onFiles(e.target.files)}
            />
          </label>
          <ul className="text-sm space-y-1">
            {ticket.attachments.map((a) => (
              <li key={a.id}>
                <a href={a.url} className="text-indigo-400 hover:underline" target="_blank" rel="noreferrer">
                  {a.fileName}
                </a>
                <span className="text-zinc-600 text-xs ml-2">{(a.size / 1024).toFixed(1)} KB</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Discussion</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {ticket.comments.map((c) => (
            <div key={c.id} className="rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2">
              <p className="text-xs text-zinc-500 mb-1">
                {c.user.name} · {new Date(c.createdAt).toLocaleString()}
              </p>
              <p className="text-sm text-zinc-200 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
          <form onSubmit={addComment} className="space-y-2">
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} rows={3} placeholder="Add an update…" />
            <Button type="submit" size="sm">Post comment</Button>
          </form>
        </CardContent>
      </Card>

      {msg && <p className="text-sm text-emerald-400">{msg}</p>}
    </div>
  );
}
