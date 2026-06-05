"use client";

import { useEffect, useState } from "react";
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
import { MessageSquareMore, Plus, Clock, Search } from "lucide-react";
import { Pagination } from "@/components/shared/Pagination";

type Recommendation = {
  id: string;
  orderRef: string | null;
  topic: string;
  sentiment: string;
  title: string | null;
  details: string;
  suggestedAction: string | null;
  createdAt: string;
};

const TOPIC_LABELS: Record<string, string> = {
  PRODUCT_QUALITY: "Product quality",
  PRICING: "Pricing",
  CLIENT_BEHAVIOR: "Client behavior",
  DELIVERY_ISSUE: "Delivery issue",
  ORDER_DATA: "Order data",
  CANCELLATION_TREND: "Cancellation trend",
  OTHER: "Other",
};

const SENTIMENT_LABELS: Record<string, string> = {
  POSITIVE: "Positive",
  NEUTRAL: "Neutral",
  NEGATIVE: "Negative",
};

const SENTIMENT_CLASSES: Record<string, string> = {
  POSITIVE: "border-emerald-500/40 text-emerald-400",
  NEUTRAL: "border-zinc-600 text-zinc-400",
  NEGATIVE: "border-red-500/40 text-red-400",
};

const PAGE_SIZE = 50;

export default function ConfirmationFeedbackPage() {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [orderRef, setOrderRef] = useState("");
  const [topic, setTopic] = useState("OTHER");
  const [sentiment, setSentiment] = useState("NEUTRAL");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [suggestedAction, setSuggestedAction] = useState("");

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [searchKeyword, setSearchKeyword] = useState("");

  async function load(targetPage: number) {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(targetPage),
      pageSize: String(PAGE_SIZE),
    });
    if (searchKeyword.trim()) params.set("keyword", searchKeyword.trim());
    const r = await fetch(`/api/confirmation-feedback?${params}`);
    if (r.ok) {
      const data = await r.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(data.total ?? 0);
    }
    setLoading(false);
  }

  useEffect(() => {
    void load(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchKeyword]);

  useEffect(() => {
    setPage(1);
  }, [searchKeyword]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!details.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/confirmation-feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderRef: orderRef.trim() || null,
        topic,
        sentiment,
        title: title.trim() || null,
        details,
        suggestedAction: suggestedAction.trim() || null,
      }),
    });
    if (res.ok) {
      setOrderRef("");
      setTopic("OTHER");
      setSentiment("NEUTRAL");
      setTitle("");
      setDetails("");
      setSuggestedAction("");
      setSuccessMsg("Recommendation submitted!");
      setTimeout(() => setSuccessMsg(""), 3000);
      if (page !== 1) setPage(1);
      else void load(1);
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
        {/* New recommendation */}
        <Card className="lg:sticky lg:top-24">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-indigo-400" />
              New Recommendation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-400 mb-4">
              Share insights about orders, products, prices, clients, or delivery — anything that can improve confirmation rates.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Order ID / reference (optional)</Label>
                <Input
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  placeholder="e.g. #LY-10245"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Topic</Label>
                  <Select value={topic} onValueChange={setTopic}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(TOPIC_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Sentiment</Label>
                  <Select value={sentiment} onValueChange={setSentiment}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(SENTIMENT_LABELS).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Title (optional)</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Short summary"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Details *</Label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="e.g. 'This product has a high cancellation rate — clients complain the price shown is higher than expected.'"
                  rows={4}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Suggested action (optional)</Label>
                <Textarea
                  value={suggestedAction}
                  onChange={(e) => setSuggestedAction(e.target.value)}
                  placeholder="What should we do about it?"
                  rows={2}
                />
              </div>

              <Button
                type="submit"
                disabled={submitting || !details.trim()}
                className="w-full"
              >
                {submitting ? "Submitting…" : "Submit Recommendation"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* History */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <MessageSquareMore className="h-5 w-5 text-zinc-400" />
            My Recommendations
            {!loading && <span className="text-sm font-normal text-zinc-500 ml-1">({total})</span>}
          </h2>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSearchKeyword(searchInput);
            }}
            className="flex gap-2 mb-4"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                className="h-9 pl-9"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search title, details, order ref…"
              />
            </div>
            <Button type="submit" variant="secondary" size="sm" className="h-9">
              Search
            </Button>
          </form>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-zinc-500 text-sm">
                No recommendations yet. Use the form to share your first insight.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {items.map((r) => (
                <div
                  key={r.id}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="text-xs border-indigo-500/40 text-indigo-300">
                          {TOPIC_LABELS[r.topic] ?? r.topic}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${SENTIMENT_CLASSES[r.sentiment] ?? SENTIMENT_CLASSES.NEUTRAL}`}
                        >
                          {SENTIMENT_LABELS[r.sentiment] ?? r.sentiment}
                        </Badge>
                        {r.orderRef && (
                          <span className="text-xs text-zinc-500 font-mono">{r.orderRef}</span>
                        )}
                      </div>
                      {r.title && <p className="font-medium text-zinc-100 text-sm">{r.title}</p>}
                      <p className="text-sm text-zinc-300 leading-relaxed">{r.details}</p>
                      {r.suggestedAction && (
                        <p className="mt-1 text-xs text-zinc-400">
                          <span className="text-zinc-500">Suggested:</span> {r.suggestedAction}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-zinc-500 whitespace-nowrap font-mono flex-shrink-0">
                      {new Date(r.createdAt).toLocaleString("en-US", {
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
