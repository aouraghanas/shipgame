"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SellerCombobox, type Seller } from "@/components/activity/SellerCombobox";
import { MessageSquarePlus, Lightbulb, User, Clock } from "lucide-react";

type FeedbackEntry = {
  id: string;
  topic: string;
  sentiment: string;
  title: string | null;
  details: string;
  suggestedAction: string | null;
  createdAt: string;
  seller: Seller;
};

const TOPICS = [
  { value: "FEATURE_REQUEST", label: "Feature Request" },
  { value: "BUG_REPORT", label: "Bug Report" },
  { value: "UX_IMPROVEMENT", label: "UX Improvement" },
  { value: "PRICING", label: "Pricing" },
  { value: "INTEGRATION", label: "Integration" },
  { value: "SUPPORT", label: "Support" },
  { value: "OTHER", label: "Other" },
] as const;

const SENTIMENTS = [
  { value: "POSITIVE", label: "Positive" },
  { value: "NEUTRAL", label: "Neutral" },
  { value: "NEGATIVE", label: "Negative" },
] as const;

const SENTIMENT_CLASS: Record<string, string> = {
  POSITIVE: "border-emerald-500/40 text-emerald-400",
  NEUTRAL: "border-zinc-500/40 text-zinc-300",
  NEGATIVE: "border-red-500/40 text-red-400",
};

export default function FeedbackPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const [seller, setSeller] = useState<Seller | null>(null);
  const [topic, setTopic] = useState("OTHER");
  const [sentiment, setSentiment] = useState("NEUTRAL");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [suggestedAction, setSuggestedAction] = useState("");

  useEffect(() => {
    fetch("/api/sellers").then((r) => r.json()).then(setSellers);
    fetch("/api/seller-feedback")
      .then((r) => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seller) return;
    setError("");
    setSuccess("");
    setSubmitting(true);

    const res = await fetch("/api/seller-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sellerId: seller.id,
        topic,
        sentiment,
        title: title.trim() || null,
        details,
        suggestedAction: suggestedAction.trim() || null,
      }),
    });

    if (res.ok) {
      const created = (await res.json()) as FeedbackEntry;
      setEntries((prev) => [created, ...prev]);
      setSeller(null);
      setTopic("OTHER");
      setSentiment("NEUTRAL");
      setTitle("");
      setDetails("");
      setSuggestedAction("");
      setSuccess("Feedback note saved.");
      setTimeout(() => setSuccess(""), 3000);
    } else {
      const j = (await res.json().catch(() => ({}))) as { error?: { formErrors?: string[] } | string };
      const msg =
        typeof j.error === "string"
          ? j.error
          : j.error?.formErrors?.[0] || "Failed to save feedback note.";
      setError(msg);
    }
    setSubmitting(false);
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <MessageSquarePlus className="h-8 w-8 text-indigo-400" />
          Seller Recommendations
        </h1>
        <p className="text-zinc-400 mt-1">
          Capture seller suggestions, requests, concerns, and product ideas.
        </p>
      </div>

      {success && <div className="mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-400">{success}</div>}
      {error && <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-400">{error}</div>}

      <div className="grid lg:grid-cols-[460px_1fr] gap-6 items-start">
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-indigo-400" />
              Add Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Seller *</Label>
                <SellerCombobox
                  sellers={sellers}
                  value={seller}
                  onChange={setSeller}
                  onNewSeller={(s) => setSellers((prev) => [...prev, s].sort((a, b) => a.name.localeCompare(b.name)))}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Reason</Label>
                  <Select value={topic} onValueChange={setTopic}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TOPICS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sentiment</Label>
                  <Select value={sentiment} onValueChange={setSentiment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SENTIMENTS.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Short title (optional)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. API integration request"
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Recommendation details *</Label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={5}
                  required
                  placeholder="Example: Seller suggests adding API integration with ... to automate ..."
                />
              </div>

              <div className="space-y-1.5">
                <Label>Suggested next action (optional)</Label>
                <Textarea
                  value={suggestedAction}
                  onChange={(e) => setSuggestedAction(e.target.value)}
                  rows={3}
                  placeholder="Example: Prioritize this in Q2 discovery and evaluate partner API docs."
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting || !seller || !details.trim()}>
                {submitting ? "Saving..." : "Save Recommendation"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Clock className="h-5 w-5 text-zinc-400" />
            My Recent Notes {!loading && <span className="ml-1 text-sm font-normal text-zinc-500">({entries.length})</span>}
          </h2>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-sm text-zinc-500">
                No recommendations yet. Add your first note using the form.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {entries.map((n) => (
                <div key={n.id} className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 transition-colors hover:border-zinc-700">
                  <div className="mb-1 flex items-center gap-2 flex-wrap">
                    <User className="h-3.5 w-3.5 text-zinc-500" />
                    <span className="text-sm font-medium text-zinc-100">{n.seller.name}</span>
                    {n.seller.email && <span className="text-xs text-zinc-500">{n.seller.email}</span>}
                    <Badge variant="outline" className="text-xs">{TOPICS.find((t) => t.value === n.topic)?.label || n.topic}</Badge>
                    <Badge variant="outline" className={`text-xs ${SENTIMENT_CLASS[n.sentiment] ?? SENTIMENT_CLASS.NEUTRAL}`}>
                      {SENTIMENTS.find((s) => s.value === n.sentiment)?.label || n.sentiment}
                    </Badge>
                  </div>
                  {n.title && <p className="text-sm font-semibold text-zinc-200">{n.title}</p>}
                  <p className="mt-1 text-sm leading-relaxed text-zinc-300">{n.details}</p>
                  {n.suggestedAction && (
                    <p className="mt-2 text-xs text-indigo-300">
                      Suggested action: <span className="text-zinc-300">{n.suggestedAction}</span>
                    </p>
                  )}
                  <p className="mt-2 text-xs font-mono text-zinc-500">
                    {new Date(n.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
