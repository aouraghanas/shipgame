"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart2, ArrowLeft } from "lucide-react";

type Report = {
  id: string;
  period: string;
  scope: string;
  fromDate: string;
  toDate: string;
  generatedAt: string;
  totalActivities: number;
  summary: string;
  trigger: string;
};

export default function OpsActivityIntelPage() {
  const [rows, setRows] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/activity-reports?take=50")
      .then(async (r) => {
        if (!r.ok) {
          setErr("Could not load activity reports.");
          return;
        }
        setRows(await r.json());
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <Link href="/tickets">
        <Button variant="ghost" size="sm" className="mb-4 gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to tickets
        </Button>
      </Link>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <BarChart2 className="h-8 w-8 text-indigo-400" />
          Activity intelligence
        </h1>
        <p className="text-zinc-400 mt-1 max-w-2xl">
          Read-only list of AI activity reports. Admins can generate new reports from Admin → Reports.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        </div>
      ) : err ? (
        <p className="text-red-400">{err}</p>
      ) : rows.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-zinc-500">No reports yet.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id}>
              <CardHeader className="pb-2">
                <div className="flex flex-wrap items-center gap-2 justify-between">
                  <CardTitle className="text-base text-zinc-100">
                    {r.period} · {r.scope} · {new Date(r.fromDate).toLocaleDateString()} →{" "}
                    {new Date(r.toDate).toLocaleDateString()}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Badge variant="outline">{r.trigger}</Badge>
                    <Badge variant="secondary">{r.totalActivities} activities</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-zinc-400 line-clamp-3">{r.summary}</p>
                <p className="text-xs text-zinc-600 mt-2">
                  Generated {new Date(r.generatedAt).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
