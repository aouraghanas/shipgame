"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { SellerCombobox, type Seller } from "@/components/activity/SellerCombobox";
import { ClipboardList, Paperclip, X, Plus, User, Clock } from "lucide-react";

type UploadedFile = { url: string; name: string; type: string };
type Activity = {
  id: string;
  description: string;
  category: string;
  attachments: string[];
  createdAt: string;
  seller: Seller;
};

const CATEGORY_LABELS: Record<string, string> = {
  CALL: "Call",
  EMAIL: "Email",
  MEETING: "Meeting",
  ISSUE_FIX: "Issue Fix",
  FOLLOW_UP: "Follow-up",
  OTHER: "Other",
};

const CATEGORY_BADGE_CLASSES: Record<string, string> = {
  CALL: "border-blue-500/40 text-blue-400",
  EMAIL: "border-purple-500/40 text-purple-400",
  MEETING: "border-emerald-500/40 text-emerald-400",
  ISSUE_FIX: "border-red-500/40 text-red-400",
  FOLLOW_UP: "border-amber-500/40 text-amber-400",
  OTHER: "border-zinc-600 text-zinc-400",
};

export default function ActivityPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/sellers").then((r) => r.json()).then(setSellers);
    fetch("/api/manager-activities")
      .then((r) => r.json())
      .then(setActivities)
      .finally(() => setLoading(false));
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    const results: UploadedFile[] = [];
    for (const file of files) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload-activity", { method: "POST", body: fd });
      if (res.ok) results.push(await res.json());
    }
    setUploadedFiles((prev) => [...prev, ...results]);
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSeller) return;
    setSubmitting(true);
    const res = await fetch("/api/manager-activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerId: selectedSeller.id,
        description,
        category,
        attachments: uploadedFiles.map((f) => f.url),
      }),
    });
    if (res.ok) {
      const activity: Activity = await res.json();
      setActivities((prev) => [activity, ...prev]);
      setSelectedSeller(null);
      setDescription("");
      setCategory("OTHER");
      setUploadedFiles([]);
      setSuccessMsg("Activity logged successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <ClipboardList className="h-8 w-8 text-indigo-400" />
          Activity Log
        </h1>
        <p className="text-zinc-400 mt-1">Record your actions and interactions with sellers</p>
      </div>

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
              Log New Action
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Seller *</Label>
                <SellerCombobox
                  sellers={sellers}
                  value={selectedSeller}
                  onChange={setSelectedSeller}
                  onNewSeller={(s) => setSellers((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)))}
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
                  placeholder="Describe what you did — e.g. 'Called about simulator, agreed on demo next week'"
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
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  accept=".jpg,.jpeg,.png,.webp,.gif,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2 w-full"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                >
                  <Paperclip className="h-4 w-4" />
                  {uploading ? "Uploading…" : "Attach Files"}
                </Button>
                <p className="text-xs text-zinc-500">Max 10 MB · PDF, images, Word, Excel</p>
              </div>

              <Button
                type="submit"
                disabled={submitting || !selectedSeller || !description.trim()}
                className="w-full"
              >
                {submitting ? "Submitting…" : "Log Action"}
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
              <span className="text-sm font-normal text-zinc-500 ml-1">({activities.length})</span>
            )}
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : activities.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-zinc-500 text-sm">
                No activities logged yet. Use the form to log your first action.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activities.map((a) => (
                <div
                  key={a.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <User className="h-3.5 w-3.5 text-zinc-500 flex-shrink-0" />
                        <span className="font-medium text-zinc-100 text-sm">{a.seller.name}</span>
                        {a.seller.email && (
                          <span className="text-zinc-500 text-xs">{a.seller.email}</span>
                        )}
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
