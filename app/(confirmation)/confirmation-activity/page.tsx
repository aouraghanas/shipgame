"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Paperclip, X, Plus, Package, Clock, Search } from "lucide-react";
import { Pagination } from "@/components/shared/Pagination";

type UploadedFile = { url: string; name: string; type: string };
type Activity = {
  id: string;
  orderRef: string;
  description: string;
  category: string;
  attachments: string[];
  createdAt: string;
};

const CATEGORY_LABELS: Record<string, string> = {
  CALL: "Call",
  CONFIRMATION: "Confirmation",
  FOLLOW_UP: "Follow-up",
  NO_ANSWER: "No answer",
  RESCHEDULE: "Reschedule",
  CANCELLED: "Cancelled",
  OTHER: "Other",
};

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  CALL: "border-blue-500/40 text-blue-400",
  CONFIRMATION: "border-emerald-500/40 text-emerald-400",
  FOLLOW_UP: "border-amber-500/40 text-amber-400",
  NO_ANSWER: "border-zinc-500/40 text-zinc-400",
  RESCHEDULE: "border-purple-500/40 text-purple-400",
  CANCELLED: "border-red-500/40 text-red-400",
  OTHER: "border-zinc-600 text-zinc-400",
};

const ACTIVITY_PAGE_SIZE = 50;

export default function ConfirmationActivityPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [orderRef, setOrderRef] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("CALL");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [fileUploadError, setFileUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [orderRefInput, setOrderRefInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [searchOrderRef, setSearchOrderRef] = useState("");

  async function loadActivities(targetPage: number) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(targetPage),
      pageSize: String(ACTIVITY_PAGE_SIZE),
    });
    if (searchKeyword.trim()) params.set("keyword", searchKeyword.trim());
    if (searchOrderRef.trim()) params.set("orderRef", searchOrderRef.trim());
    const r = await fetch(`/api/confirmation-activities?${params}`);
    if (r.ok) {
      const data = await r.json();
      setActivities(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadActivities(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchKeyword, searchOrderRef]);

  useEffect(() => {
    setPage(1);
  }, [searchKeyword, searchOrderRef]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setFileUploadError("");
    setUploading(true);
    const results: UploadedFile[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-activity", { method: "POST", body: fd });
      if (res.ok) {
        results.push(await res.json());
      } else {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setFileUploadError(j.error ?? "Upload failed. Try a smaller file or a different format.");
        break;
      }
    }
    if (results.length) setUploadedFiles((prev) => [...prev, ...results]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!orderRef.trim() || !description.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/confirmation-activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderRef: orderRef.trim(),
        description,
        category,
        attachments: uploadedFiles.map((f) => f.url),
      }),
    });
    if (res.ok) {
      setOrderRef("");
      setDescription("");
      setCategory("CALL");
      setUploadedFiles([]);
      setSuccessMsg("Activity logged successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      if (page !== 1) setPage(1);
      else void loadActivities(1);
    }
    setSubmitting(false);
  }

  return (
    <div>
      {successMsg && (
        <div className="mb-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-4 py-2 text-emerald-400 text-sm">
          {successMsg}
        </div>
      )}

      <div className="grid lg:grid-cols-[420px_1fr] gap-6 items-start">
        {/* Log new action */}
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              Log Order Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Order ID / reference *</Label>
                <Input
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  placeholder="e.g. #LY-10245"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Description *</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the call — e.g. 'Client confirmed order, delivery agreed for Thursday'"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Attachments (optional)</Label>
                {uploadedFiles.length > 0 && (
                  <div className="space-y-1.5 mb-2">
                    {uploadedFiles.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-md bg-zinc-800 px-3 py-2 text-sm">
                        <Paperclip className="h-3.5 w-3.5 text-zinc-400 flex-shrink-0" />
                        <span className="flex-1 truncate text-zinc-300">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => setUploadedFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="text-zinc-500 hover:text-zinc-300"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div
                  className={cn(
                    "group relative min-h-10 w-full",
                    uploading && "pointer-events-none cursor-not-allowed opacity-50"
                  )}
                >
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    accept="image/*,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    onChange={handleFileChange}
                    disabled={uploading}
                    className="absolute inset-0 z-10 h-full min-h-10 w-full cursor-pointer border-0 p-0 opacity-0 file:h-full file:w-full"
                    aria-label="Attach files to this activity"
                  />
                  <div
                    className="pointer-events-none flex min-h-10 w-full select-none items-center justify-center gap-2 rounded-md border border-zinc-700 bg-transparent px-3 text-xs font-medium text-zinc-100 transition-colors group-focus-within:border-zinc-600 group-focus-within:bg-zinc-800 group-focus-within:ring-2 group-focus-within:ring-indigo-500 group-focus-within:ring-offset-2 group-focus-within:ring-offset-zinc-950"
                    aria-hidden
                  >
                    <Paperclip className="h-4 w-4 shrink-0" />
                    <span>{uploading ? "Uploading…" : "Attach Files"}</span>
                  </div>
                </div>
                {fileUploadError && (
                  <p className="text-xs text-red-400" role="alert">
                    {fileUploadError}
                  </p>
                )}
                <p className="text-xs text-zinc-500">Max 10 MB · PDF, images, Word, Excel</p>
              </div>

              <Button
                type="submit"
                disabled={submitting || !orderRef.trim() || !description.trim()}
                className="w-full"
              >
                {submitting ? "Submitting…" : "Log Activity"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Activity history */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-zinc-400" />
            My Activity History
            {!loading && (
              <span className="text-sm font-normal text-zinc-500 ml-1">({total})</span>
            )}
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchKeyword(searchInput);
              setSearchOrderRef(orderRefInput);
            }}
            className="flex flex-col sm:flex-row gap-2 mb-4"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                className="h-9 pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search description…"
              />
            </div>
            <Input
              className="h-9 sm:w-44"
              value={orderRefInput}
              onChange={(e) => setOrderRefInput(e.target.value)}
              placeholder="Order ID / ref"
            />
            <Button type="submit" variant="secondary" size="sm" className="h-9">
              Search
            </Button>
          </form>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-zinc-500 text-sm">
                No activities logged yet. Use the form to log your first call.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {totalPages > 1 && (
                <p className="text-xs text-zinc-500">
                  Showing {(page - 1) * ACTIVITY_PAGE_SIZE + 1}–
                  {(page - 1) * ACTIVITY_PAGE_SIZE + activities.length} of {total}
                </p>
              )}
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Package className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="font-medium text-zinc-100 text-sm font-mono">{a.orderRef}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${CATEGORY_BADGE_CLASSES[a.category] ?? CATEGORY_BADGE_CLASSES.OTHER}`}
                        >
                          {CATEGORY_LABELS[a.category] ?? a.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-zinc-300 leading-relaxed">{a.description}</p>
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

              <Pagination
                page={page}
                totalPages={totalPages}
                onChange={(p) => {
                  setPage(p);
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
