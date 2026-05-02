"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ACCOUNTING_CATEGORIES,
  ACCOUNTING_CATEGORY_LABELS,
} from "@/lib/accounting-constants";
import { dec, shippingMarginLydTotal, percentOfAmount, leadFeeTotalUsd } from "@/lib/accounting-calcs";
import { Calculator, Landmark, Sparkles, Trash2 } from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";

type CityRow = {
  id: string;
  name: string;
  slug: string;
  dexpressCostLyd: string;
  sellToSellerLyd: string;
  active: boolean;
  sortOrder: number;
};

type LedgerRow = {
  id: string;
  direction: string;
  category: string;
  amount: string;
  currency: string;
  occurredAt: string;
  description: string;
  createdBy: { id: string; name: string };
};

type DateRange = { from: string; to: string };
type DatePreset = "all" | "month" | "30d" | "year" | "custom";

const ALL_TIME_FROM = "2000-01-01";

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function presetRange(preset: DatePreset, current: DateRange): DateRange {
  const today = todayStr();
  const d = new Date();
  switch (preset) {
    case "all":
      return { from: ALL_TIME_FROM, to: today };
    case "month":
      return { from: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`, to: today };
    case "30d": {
      const from = new Date(d);
      from.setDate(from.getDate() - 29);
      return { from: from.toISOString().split("T")[0], to: today };
    }
    case "year":
      return { from: `${d.getFullYear()}-01-01`, to: today };
    case "custom":
    default:
      return current;
  }
}

const PRESET_BUTTONS: { id: DatePreset; key: string }[] = [
  { id: "all", key: "accounting.preset.all" },
  { id: "month", key: "accounting.preset.month" },
  { id: "30d", key: "accounting.preset.30d" },
  { id: "year", key: "accounting.preset.year" },
  { id: "custom", key: "accounting.preset.custom" },
];

export function AccountingWorkspace() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const isLibyaOnly = role === "LIBYAN_ACCOUNTANT";
  const t = useT();

  const [tab, setTab] = useState<"overview" | "ledger" | "tools" | "ai" | "admin">("overview");

  // Default the whole platform to "All time" on load.
  const initial = useMemo(() => presetRange("all", { from: "", to: "" }), []);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [preset, setPreset] = useState<DatePreset>("all");
  const [summary, setSummary] = useState<{
    rows: { category: string; direction: string; currency: string; total: string }[];
    byCurrency: Record<string, { revenue: string; expense: string; net: string }>;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [settings, setSettings] = useState<{
    codFeePercent: string;
    leadFeeUsd: string;
    transferFeePercentMin: string;
    transferFeePercentMax: string;
  } | null>(null);

  const [cities, setCities] = useState<CityRow[]>([]);
  const [fxRows, setFxRows] = useState<{ id: string; dateKey: string; lydPerUsd: string; notes: string | null }[]>(
    []
  );
  const [ledger, setLedger] = useState<LedgerRow[]>([]);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const baseRequests: Promise<Response>[] = [
        fetch(`/api/accounting/summary?from=${from}&to=${to}`),
        fetch(`/api/accounting/ledger?from=${from}&to=${to}&take=300`),
      ];
      // Tools / FX / settings are off-limits for libyan-only accountants.
      if (!isLibyaOnly) {
        baseRequests.push(
          fetch("/api/accounting/exchange-rates?take=40"),
          fetch("/api/accounting/settings")
        );
      }
      const responses = await Promise.all(baseRequests);
      const [sRes, lRes, fxRes, setRes] = responses;
      if (sRes?.ok) setSummary(await sRes.json());
      if (lRes?.ok) setLedger(await lRes.json());
      if (fxRes?.ok) setFxRows(await fxRes.json());
      if (setRes?.ok) setSettings(await setRes.json());
    } finally {
      setLoading(false);
    }
  }, [from, to, isLibyaOnly]);

  const loadCities = useCallback(async () => {
    if (isLibyaOnly) return;
    const r = await fetch("/api/accounting/cities");
    if (r.ok) setCities(await r.json());
  }, [isLibyaOnly]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    void loadCities();
  }, [loadCities]);

  function applyPreset(p: DatePreset) {
    setPreset(p);
    if (p === "custom") return;
    const r = presetRange(p, { from, to });
    setFrom(r.from);
    setTo(r.to);
  }

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!settings) return;
    const fd = new FormData(e.currentTarget);
    const body = {
      codFeePercent: Number(fd.get("codFeePercent")),
      leadFeeUsd: Number(fd.get("leadFeeUsd")),
      transferFeePercentMin: Number(fd.get("transferFeePercentMin")),
      transferFeePercentMax: Number(fd.get("transferFeePercentMax")),
    };
    const r = await fetch("/api/accounting/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setMsg(r.ok ? "Settings saved." : "Could not save settings.");
    if (r.ok) setSettings(await r.json());
  }

  async function addCity(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name")),
      dexpressCostLyd: String(fd.get("dexpressCostLyd")),
      sellToSellerLyd: String(fd.get("sellToSellerLyd")),
    };
    const r = await fetch("/api/accounting/cities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setMsg(r.ok ? "City rate added." : "Could not add city.");
    e.currentTarget.reset();
    void loadCities();
  }

  async function addFx(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body = {
      dateKey: String(fd.get("dateKey")),
      lydPerUsd: String(fd.get("lydPerUsd")),
      notes: String(fd.get("notes") || "") || undefined,
    };
    const r = await fetch("/api/accounting/exchange-rates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setMsg(r.ok ? "Exchange rate saved." : "Could not save FX.");
    void loadSummary();
  }

  async function deleteCity(id: string) {
    if (!confirm("Delete this city rate?")) return;
    const r = await fetch(`/api/accounting/cities/${id}`, { method: "DELETE" });
    setMsg(r.ok ? "City deleted." : "Delete failed.");
    void loadCities();
  }

  async function deleteLedger(id: string) {
    if (!confirm("Delete this ledger line? (admin only)")) return;
    const r = await fetch(`/api/accounting/ledger/${id}`, { method: "DELETE" });
    setMsg(r.ok ? "Ledger line deleted." : "Delete failed.");
    void loadSummary();
  }

  const [ledgerForm, setLedgerForm] = useState({
    direction: "EXPENSE",
    category: "OFFICE_RENT",
    amount: "",
    currency: "LYD",
    occurredAt: new Date().toISOString().slice(0, 10),
    description: "",
  });

  // Libyan accountant is locked to LYD entries.
  useEffect(() => {
    if (isLibyaOnly && ledgerForm.currency !== "LYD") {
      setLedgerForm((f) => ({ ...f, currency: "LYD" }));
    }
  }, [isLibyaOnly, ledgerForm.currency]);

  async function saveLedger(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/accounting/ledger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...ledgerForm,
        occurredAt: new Date(ledgerForm.occurredAt + "T12:00:00").toISOString(),
      }),
    });
    setMsg(r.ok ? "Ledger entry saved." : "Could not save entry.");
    if (r.ok) {
      setLedgerForm((f) => ({ ...f, amount: "", description: "" }));
      void loadSummary();
    }
  }

  const [aiOut, setAiOut] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  async function runAi() {
    setAiBusy(true);
    setAiOut("");
    const r = await fetch("/api/accounting/ai-report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, to }),
    });
    const j = await r.json();
    setAiBusy(false);
    if (!r.ok) {
      setAiOut(JSON.stringify(j, null, 2));
      return;
    }
    setAiOut(`${j.summary}\n\n--- Recommendations ---\n${j.recommendations}`);
  }

  const tools = useMemo(() => {
    if (!settings) return null;
    return (
      <ToolsPanel
        settings={settings}
        cities={cities}
        onRefresh={() => {
          void loadCities();
          void loadSummary();
        }}
      />
    );
  }, [settings, cities, loadCities, loadSummary]);

  const visibleCurrencies = (isLibyaOnly ? ["LYD"] : ["LYD", "USD", "MAD"]) as Array<"LYD" | "USD" | "MAD">;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_BUTTONS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                preset === p.id
                  ? "brand-keep bg-brand text-white shadow-sm"
                  : "border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {t(p.key)}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">{t("common.from")}</Label>
            <Input
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPreset("custom");
              }}
              className="w-40"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-zinc-400">{t("common.to")}</Label>
            <Input
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPreset("custom");
              }}
              className="w-40"
            />
          </div>
          <Button type="button" variant="secondary" onClick={() => void loadSummary()} disabled={loading}>
            {loading ? t("common.refreshing") : t("common.refresh")}
          </Button>
        </div>
      </div>
      {msg && <p className="text-sm text-emerald-400">{msg}</p>}

      <div className="flex flex-wrap gap-1 rounded-lg bg-zinc-900 p-1">
        {(
          [
            ["overview", "accounting.tabs.overview"],
            ["ledger", "accounting.tabs.ledger"],
            ...(isLibyaOnly
              ? ([] as const)
              : ([
                  ["tools", "accounting.tabs.tools"],
                  ["ai", "accounting.tabs.ai"],
                ] as const)),
            ...(isAdmin ? ([["admin", "accounting.tabs.admin"]] as const) : []),
          ] as const
        ).map(([id, labelKey]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id as "overview" | "ledger" | "tools" | "ai" | "admin")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              tab === id
                ? "brand-keep bg-brand text-white"
                : "text-zinc-400 hover:text-zinc-100"
            }`}
          >
            {t(labelKey)}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="space-y-4">
          {summary && (
            <>
              <div className={`grid gap-4 ${visibleCurrencies.length === 1 ? "sm:grid-cols-1" : "sm:grid-cols-3"}`}>
                {visibleCurrencies.map((cur) => (
                  <Card key={cur}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-zinc-300">{t("accounting.netPeriod", { cur })}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-2xl font-semibold text-white">{summary.byCurrency[cur]?.net ?? "0"}</p>
                      <p className="text-xs text-zinc-500 mt-1">
                        Rev {summary.byCurrency[cur]?.revenue} · Exp {summary.byCurrency[cur]?.expense}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{t("accounting.byCategory")}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-zinc-500 border-b border-zinc-800">
                        <th className="py-2 pr-4">{t("accounting.tableCategory")}</th>
                        <th className="py-2 pr-4">{t("accounting.tableDir")}</th>
                        <th className="py-2 pr-4">{t("accounting.tableCcy")}</th>
                        <th className="py-2">{t("accounting.tableTotal")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.rows.map((r) => (
                        <tr key={`${r.category}-${r.direction}-${r.currency}`} className="border-b border-zinc-800/80">
                          <td className="py-2 pr-4 text-zinc-200">
                            {ACCOUNTING_CATEGORY_LABELS[r.category as keyof typeof ACCOUNTING_CATEGORY_LABELS] ??
                              r.category}
                          </td>
                          <td className="py-2 pr-4">{r.direction}</td>
                          <td className="py-2 pr-4">{r.currency}</td>
                          <td className="py-2 font-mono">{r.total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {tab === "ledger" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Landmark className="h-5 w-5 text-indigo-400" />
                {t("accounting.newLine")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveLedger} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-1">
                  <Label className="text-xs">{t("accounting.direction")}</Label>
                  <Select
                    value={ledgerForm.direction}
                    onValueChange={(v) => setLedgerForm((f) => ({ ...f, direction: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="EXPENSE">{t("accounting.direction.expense")}</SelectItem>
                      <SelectItem value="REVENUE">{t("accounting.direction.revenue")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">{t("accounting.category")}</Label>
                  <Select
                    value={ledgerForm.category}
                    onValueChange={(v) => setLedgerForm((f) => ({ ...f, category: v }))}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent className="max-h-72">
                      {ACCOUNTING_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {ACCOUNTING_CATEGORY_LABELS[c]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("accounting.amount")}</Label>
                  <Input
                    value={ledgerForm.amount}
                    onChange={(e) => setLedgerForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="0.000"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("accounting.currency")}</Label>
                  {isLibyaOnly ? (
                    <Input value="LYD" readOnly disabled />
                  ) : (
                    <Select
                      value={ledgerForm.currency}
                      onValueChange={(v) => setLedgerForm((f) => ({ ...f, currency: v }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LYD">LYD</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="MAD">MAD</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{t("accounting.date")}</Label>
                  <Input
                    type="date"
                    value={ledgerForm.occurredAt}
                    onChange={(e) => setLedgerForm((f) => ({ ...f, occurredAt: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1 sm:col-span-2 lg:col-span-3">
                  <Label className="text-xs">{t("accounting.description")}</Label>
                  <Input
                    value={ledgerForm.description}
                    onChange={(e) => setLedgerForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder={t("accounting.descriptionPlaceholder")}
                    required
                  />
                </div>
                <Button type="submit" className="sm:col-span-2 lg:col-span-3 w-full sm:w-auto">
                  {t("accounting.saveLine")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("accounting.recentLines")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {ledger.map((row) => (
                <div
                  key={row.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="text-zinc-200 font-medium">{row.description}</p>
                    <p className="text-xs text-zinc-500">
                      {row.direction} · {ACCOUNTING_CATEGORY_LABELS[row.category as keyof typeof ACCOUNTING_CATEGORY_LABELS] ?? row.category} ·{" "}
                      {row.amount} {row.currency} · {new Date(row.occurredAt).toLocaleDateString()} ·{" "}
                      {row.createdBy.name}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => void deleteLedger(row.id)}>
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  )}
                </div>
              ))}
              {ledger.length === 0 && <p className="text-sm text-zinc-500">{t("accounting.noLines")}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {!isLibyaOnly && tab === "tools" && <div>{tools}</div>}

      {!isLibyaOnly && tab === "ai" && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                AI period review
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-zinc-400">
                Uses the same date range as Overview. Requires <span className="font-mono">OPENAI_API_KEY</span> on the server.
              </p>
              <Button type="button" onClick={() => void runAi()} disabled={aiBusy}>
                {aiBusy ? "Generating…" : "Generate AI report"}
              </Button>
              {aiOut && (
                <pre className="whitespace-pre-wrap rounded-md border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-200 max-h-[480px] overflow-auto">
                  {aiOut}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {isAdmin && tab === "admin" && (
        <div className="space-y-6">
            {settings && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Global fee defaults</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={saveSettings} className="grid gap-3 sm:grid-cols-2 max-w-xl">
                    <div className="space-y-1">
                      <Label className="text-xs">COD fee % (on cash collected)</Label>
                      <Input name="codFeePercent" type="number" step="0.001" defaultValue={settings.codFeePercent} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Lead fee (USD per lead)</Label>
                      <Input name="leadFeeUsd" type="number" step="0.01" defaultValue={settings.leadFeeUsd} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Transfer fee % (min)</Label>
                      <Input name="transferFeePercentMin" type="number" step="0.001" defaultValue={settings.transferFeePercentMin} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Transfer fee % (max)</Label>
                      <Input name="transferFeePercentMax" type="number" step="0.001" defaultValue={settings.transferFeePercentMax} />
                    </div>
                    <Button type="submit" className="sm:col-span-2 w-fit">
                      Save defaults
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Per-city delivery (LYD)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={addCity} className="grid gap-2 sm:grid-cols-4 items-end">
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">City name</Label>
                    <Input name="name" placeholder="Tripoli" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Dexpress cost LYD</Label>
                    <Input name="dexpressCostLyd" type="number" step="0.001" required />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sell to seller LYD</Label>
                    <Input name="sellToSellerLyd" type="number" step="0.001" required />
                  </div>
                  <Button type="submit" className="sm:col-span-4 w-fit">
                    Add / update city (add only — edit in DB or future UI)
                  </Button>
                </form>
                <div className="space-y-2">
                  {cities.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-800 px-3 py-2 text-sm"
                    >
                      <span className="text-zinc-200 font-medium">{c.name}</span>
                      <span className="text-zinc-400 font-mono text-xs">
                        Dexpress {c.dexpressCostLyd} → Seller {c.sellToSellerLyd} LYD
                      </span>
                      <Button type="button" variant="ghost" size="icon" onClick={() => void deleteCity(c.id)}>
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">LYD per 1 USD (daily rate)</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={addFx} className="grid gap-2 sm:grid-cols-4 items-end max-w-2xl">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input name="dateKey" type="date" required defaultValue={to} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">LYD / USD</Label>
                    <Input name="lydPerUsd" type="number" step="0.000001" required placeholder="e.g. 6.85" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label className="text-xs">Notes</Label>
                    <Input name="notes" placeholder="Source / street rate" />
                  </div>
                  <Button type="submit" className="w-fit">
                    Save rate
                  </Button>
                </form>
                <div className="mt-4 text-xs text-zinc-500 space-y-1">
                  {fxRows.slice(0, 8).map((r) => (
                    <div key={r.id} className="flex justify-between gap-4 font-mono">
                      <span>{r.dateKey}</span>
                      <span>{r.lydPerUsd}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
        </div>
      )}
    </div>
  );
}

function ToolsPanel({
  settings,
  cities,
  onRefresh,
}: {
  settings: { codFeePercent: string; leadFeeUsd: string; transferFeePercentMin: string; transferFeePercentMax: string };
  cities: CityRow[];
  onRefresh: () => void;
}) {
  const [cityId, setCityId] = useState(cities[0]?.id ?? "");
  const [units, setUnits] = useState("1");
  const [collected, setCollected] = useState("");
  const [leads, setLeads] = useState("");
  const [transferAmt, setTransferAmt] = useState("");
  const [transferPct, setTransferPct] = useState("1");

  useEffect(() => {
    if (!cityId && cities[0]) setCityId(cities[0].id);
  }, [cities, cityId]);

  const city = cities.find((c) => c.id === cityId);
  const margin =
    city && units
      ? shippingMarginLydTotal(dec(city.sellToSellerLyd), dec(city.dexpressCostLyd), Number(units) || 0).toFixed(3)
      : "—";

  const codFee =
    collected && settings
      ? percentOfAmount(dec(collected), dec(settings.codFeePercent)).toFixed(3)
      : "—";

  const leadTotal =
    leads && settings ? leadFeeTotalUsd(Number(leads) || 0, dec(settings.leadFeeUsd)).toFixed(2) : "—";

  const transferFee =
    transferAmt && transferPct
      ? percentOfAmount(dec(transferAmt), dec(transferPct)).toFixed(4)
      : "—";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-indigo-400" />
            Shipping margin (LYD)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-w-md">
          <div className="space-y-1">
            <Label className="text-xs">City</Label>
            <Select value={cityId} onValueChange={setCityId}>
              <SelectTrigger><SelectValue placeholder="Choose city" /></SelectTrigger>
              <SelectContent>
                {cities.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Shipments (units)</Label>
            <Input value={units} onChange={(e) => setUnits(e.target.value)} />
          </div>
          <p className="text-sm text-zinc-300">
            Margin to book (LYD): <span className="font-mono text-white">{margin}</span>
          </p>
          <p className="text-xs text-zinc-500">
            After you confirm, add a REVENUE / SHIPPING_MARGIN line in the Ledger tab with this amount.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">COD service fee (LYD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-w-md">
          <p className="text-xs text-zinc-500">Uses global COD % ({settings.codFeePercent}%).</p>
          <Input value={collected} onChange={(e) => setCollected(e.target.value)} placeholder="Cash collected (LYD)" />
          <p className="text-sm text-zinc-300">
            Fee (LYD): <span className="font-mono text-white">{codFee}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead fees (USD)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-w-md">
          <p className="text-xs text-zinc-500">
            Uses {settings.leadFeeUsd} USD per lead.
          </p>
          <Input value={leads} onChange={(e) => setLeads(e.target.value)} placeholder="Number of leads" />
          <p className="text-sm text-zinc-300">
            Total (USD): <span className="font-mono text-white">{leadTotal}</span>
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Libya → USD transfer fee</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 max-w-md">
          <p className="text-xs text-zinc-500">
            Allowed band in settings: {settings.transferFeePercentMin}% – {settings.transferFeePercentMax}%. Enter the
            percent you actually paid for this transfer.
          </p>
          <Input value={transferAmt} onChange={(e) => setTransferAmt(e.target.value)} placeholder="Amount transferred" />
          <Input value={transferPct} onChange={(e) => setTransferPct(e.target.value)} placeholder="Fee %" />
          <p className="text-sm text-zinc-300">
            Fee amount: <span className="font-mono text-white">{transferFee}</span>
          </p>
        </CardContent>
      </Card>

      <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
        Reload data from server
      </Button>
    </div>
  );
}
