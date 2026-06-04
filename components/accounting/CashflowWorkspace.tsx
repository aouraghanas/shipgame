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
  ArrowLeftRight,
  Banknote,
  Building2,
  DollarSign,
  Handshake,
  Package,
  Pencil,
  Receipt,
  ShoppingCart,
  Trash2,
  Users,
  Wallet,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useT } from "@/components/shared/I18nProvider";
import { Pagination } from "@/components/shared/Pagination";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const OPERATIONS_PAGE_SIZE_OPTIONS = [10, 30, 50, 100] as const;
const DEFAULT_OPERATIONS_PAGE_SIZE = 50;

type Currency = "MAD" | "USD" | "LYD";
type Direction = "REVENUE" | "EXPENSE" | "NEUTRAL";
type OpType =
  | "ADD_BALANCE"
  | "FROM_DEX"
  | "BUY_COD_PRODUCT"
  | "BUY_SELLER_STOCK"
  | "SELLER_PAY_STOCK"
  | "CURRENCY_SWAP"
  | "SALARY"
  | "OFFICE_EXPENSE"
  | "WITHDRAW"
  | "OTHER";

type FilterId =
  | "all"
  | "revenue"
  | "expense"
  | "neutral"
  | "SALARY"
  | "OFFICE_EXPENSE"
  | "WITHDRAW";

type Operation = {
  id: string;
  type: OpType;
  direction: Direction;
  occurredAt: string;
  amount: string;
  currency: Currency;
  destAmount: string | null;
  destCurrency: Currency | null;
  description: string;
  note: string | null;
  createdBy: { id: string; name: string };
};

type OwedTotal = {
  amount: string;
  currency: Currency;
};

type Balances = {
  balances: Record<Currency, string>;
  owedTotals: Record<Currency, string>;
};

const OP_BUTTONS: { id: OpType; icon: LucideIcon; key: string }[] = [
  { id: "ADD_BALANCE", icon: DollarSign, key: "cash.op.ADD_BALANCE" },
  { id: "FROM_DEX", icon: Package, key: "cash.op.FROM_DEX" },
  { id: "BUY_COD_PRODUCT", icon: ShoppingCart, key: "cash.op.BUY_COD_PRODUCT" },
  { id: "BUY_SELLER_STOCK", icon: Handshake, key: "cash.op.BUY_SELLER_STOCK" },
  { id: "SELLER_PAY_STOCK", icon: Receipt, key: "cash.op.SELLER_PAY_STOCK" },
  { id: "CURRENCY_SWAP", icon: ArrowLeftRight, key: "cash.op.CURRENCY_SWAP" },
  { id: "SALARY", icon: Users, key: "cash.op.SALARY" },
  { id: "OFFICE_EXPENSE", icon: Building2, key: "cash.op.OFFICE_EXPENSE" },
  { id: "WITHDRAW", icon: Banknote, key: "cash.op.WITHDRAW" },
  { id: "OTHER", icon: Zap, key: "cash.op.OTHER" },
];

const OP_DIRECTIONS: Record<OpType, Direction> = {
  ADD_BALANCE: "REVENUE",
  FROM_DEX: "REVENUE",
  BUY_COD_PRODUCT: "EXPENSE",
  BUY_SELLER_STOCK: "EXPENSE",
  SELLER_PAY_STOCK: "NEUTRAL",
  CURRENCY_SWAP: "NEUTRAL",
  SALARY: "EXPENSE",
  OFFICE_EXPENSE: "EXPENSE",
  WITHDRAW: "EXPENSE",
  OTHER: "EXPENSE",
};

const FILTER_BUTTONS: { id: FilterId; key: string }[] = [
  { id: "all", key: "cash.filter.all" },
  { id: "revenue", key: "cash.filter.revenue" },
  { id: "expense", key: "cash.filter.expense" },
  { id: "neutral", key: "cash.filter.neutral" },
  { id: "SALARY", key: "cash.filter.salary" },
  { id: "OFFICE_EXPENSE", key: "cash.filter.office" },
  { id: "WITHDRAW", key: "cash.filter.withdraw" },
];

const CURRENCY_TONE: Record<Currency, string> = {
  MAD: "from-amber-500 to-orange-600",
  USD: "from-emerald-500 to-emerald-700",
  LYD: "from-sky-500 to-indigo-600",
};

const DIR_TONE: Record<Direction, string> = {
  REVENUE: "text-emerald-400",
  EXPENSE: "text-red-400",
  NEUTRAL: "text-zinc-300",
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fmtAmount(s: string | number): string {
  const n = typeof s === "string" ? Number(s) : s;
  if (!Number.isFinite(n)) return "0.000";
  return n.toLocaleString(undefined, { maximumFractionDigits: 3, minimumFractionDigits: 3 });
}

function fmtSignedAmount(direction: Direction, amount: string): string {
  const a = fmtAmount(amount);
  if (direction === "REVENUE") return `+${a}`;
  if (direction === "EXPENSE") return `−${a}`;
  return a;
}

export function CashflowWorkspace() {
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "ADMIN";
  const isLibyaOnly = role === "LIBYAN_ACCOUNTANT";
  const t = useT();

  const allowedCurrencies: Currency[] = useMemo(
    () => (isLibyaOnly ? ["LYD"] : ["MAD", "USD", "LYD"]),
    [isLibyaOnly]
  );

  const [balances, setBalances] = useState<Balances | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [owedTotal, setOwedTotal] = useState<OwedTotal | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [selectedOp, setSelectedOp] = useState<OpType | null>(null);
  const [filter, setFilter] = useState<FilterId>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_OPERATIONS_PAGE_SIZE);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOps, setTotalOps] = useState(0);

  // Build the query string for the operations list based on the active filter.
  // The filter pills map to direction (revenue/expense/neutral) or specific
  // type (SALARY/OFFICE_EXPENSE/WITHDRAW); everything else means "no filter".
  const opsQuery = useMemo(() => {
    const params = new URLSearchParams({
      paginated: "1",
      page: String(page),
      pageSize: String(pageSize),
    });
    if (filter === "revenue") params.set("direction", "REVENUE");
    else if (filter === "expense") params.set("direction", "EXPENSE");
    else if (filter === "neutral") params.set("direction", "NEUTRAL");
    else if (filter === "SALARY" || filter === "OFFICE_EXPENSE" || filter === "WITHDRAW") {
      params.set("type", filter);
    }
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    return params.toString();
  }, [filter, page, pageSize, dateFrom, dateTo]);

  // Reset to page 1 whenever the filter, page size, or date range changes so we
  // don't land on a page that no longer exists for the narrower/wider query.
  useEffect(() => {
    setPage(1);
  }, [filter, pageSize, dateFrom, dateTo]);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, oRes, tRes] = await Promise.all([
        fetch("/api/cash/balances"),
        fetch(`/api/cash/operations?${opsQuery}`),
        fetch("/api/cash/owed-total"),
      ]);
      if (bRes.ok) setBalances(await bRes.json());
      if (oRes.ok) {
        const data = await oRes.json();
        setOperations(data.items ?? []);
        setTotalPages(data.totalPages ?? 1);
        setTotalOps(data.total ?? 0);
      }
      if (tRes.ok) setOwedTotal(await tRes.json());
    } finally {
      setLoading(false);
    }
  }, [opsQuery]);

  useEffect(() => {
    void reload();
  }, [reload]);

  async function submitOperation(payload: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const r = await fetch("/api/cash/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        setMsg(t("cash.toast.saved"));
        // Jump back to page 1 so the brand-new transaction is visible at the top.
        if (page !== 1) setPage(1);
        else await reload();
      } else {
        const j = await r.json().catch(() => ({}));
        // API returns either { error: "string" } or { error: { fieldErrors, formErrors } }
        // from zod; surface whichever is most useful instead of the generic toast.
        const err = j?.error;
        let detail = "";
        if (typeof err === "string") detail = err;
        else if (err && typeof err === "object") {
          try {
            detail = JSON.stringify(err);
          } catch {
            detail = "";
          }
        }
        setMsg(detail || t("cash.toast.failed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function deleteOperation(id: string) {
    if (!confirm(t("cash.confirm.deleteOp"))) return;
    const r = await fetch(`/api/cash/operations/${id}`, { method: "DELETE" });
    setMsg(r.ok ? t("cash.toast.deleted") : t("cash.toast.failed"));
    void reload();
  }

  // The server already applies the filter (direction or type), so we render
  // the rows directly. Kept as a memo so downstream JSX stays stable.
  const filteredOps = useMemo(() => operations, [operations]);

  const canEditOwed = isAdmin || role === "ACCOUNTANT" || isLibyaOnly;

  return (
    <div className="space-y-6">
      {/* Balance cards */}
      <div className={`grid gap-4 ${allowedCurrencies.length === 1 ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}>
        {allowedCurrencies.map((cur) => (
          <BalanceCard
            key={cur}
            tone={CURRENCY_TONE[cur]}
            label={t(`cash.balance.${cur}`)}
            amount={balances?.balances[cur] ?? "0"}
            subtitle={t("cash.balance.subtitle")}
          />
        ))}
        <OwedToSellersCard
          value={owedTotal}
          allowedCurrencies={allowedCurrencies}
          canEdit={canEditOwed}
          onSaved={() => void reload()}
          setMsg={setMsg}
        />
      </div>

      {msg && (
        <div className="rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200">
          {msg}
        </div>
      )}

      {/* Main two-column area */}
      <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        {/* Left: operation panel */}
        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Wallet className="h-5 w-5 text-brand" />
                {t("cash.newOperation")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {OP_BUTTONS.map((op) => {
                  const Icon = op.icon;
                  const active = selectedOp === op.id;
                  return (
                    <button
                      key={op.id}
                      type="button"
                      onClick={() => setSelectedOp(op.id)}
                      className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-left text-xs transition-colors ${
                        active
                          ? "brand-keep border-brand bg-brand/15 text-zinc-100 shadow-sm"
                          : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${active ? "text-brand" : "text-zinc-400"}`} />
                      <span className="font-medium leading-tight">{t(op.key)}</span>
                    </button>
                  );
                })}
              </div>

              {selectedOp ? (
                <div className="pt-2 border-t border-zinc-800">
                  <OperationForm
                    type={selectedOp}
                    onSubmit={submitOperation}
                    submitting={submitting}
                    isLibyaOnly={isLibyaOnly}
                  />
                </div>
              ) : (
                <p className="text-xs text-zinc-500 pt-2 border-t border-zinc-800">
                  {t("cash.selectOpHint")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: transactions + owed sellers */}
        <div className="space-y-6 min-w-0">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {t("cash.transactions")}{" "}
                  <span className="ml-1 text-xs text-zinc-500">({totalOps})</span>
                </CardTitle>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void reload()}
                  disabled={loading}
                >
                  {loading ? t("common.refreshing") : t("common.refresh")}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {FILTER_BUTTONS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                      filter === f.id
                        ? "brand-keep bg-brand text-white"
                        : "border border-zinc-700 text-zinc-400 hover:bg-zinc-800"
                    }`}
                  >
                    {t(f.key)}
                  </button>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-2">
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-zinc-500">
                    {t("cash.filter.from")}
                  </Label>
                  <Input
                    type="date"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-8 w-[150px] text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] uppercase tracking-wide text-zinc-500">
                    {t("cash.filter.to")}
                  </Label>
                  <Input
                    type="date"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-8 w-[150px] text-xs"
                  />
                </div>
                {(dateFrom || dateTo) && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                    }}
                  >
                    {t("cash.filter.clear")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[560px] overflow-y-auto">
              {totalPages > 1 && (
                <p className="text-[11px] text-zinc-500 px-1">
                  Showing {(page - 1) * pageSize + 1}–
                  {(page - 1) * pageSize + filteredOps.length} of {totalOps}
                </p>
              )}
              {filteredOps.length === 0 && (
                <p className="px-2 py-10 text-center text-sm text-zinc-500">
                  {t("cash.empty")}
                </p>
              )}
              {filteredOps.map((op) => (
                <div
                  key={op.id}
                  className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-900/60 px-3 py-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-zinc-200 font-medium">{op.description}</p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      {new Date(op.occurredAt).toLocaleDateString()} ·{" "}
                      {t(`cash.op.${op.type}`)} · {op.createdBy.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono uppercase text-zinc-300">
                      {op.currency}
                      {op.destCurrency ? `→${op.destCurrency}` : ""}
                    </span>
                    <span className={`font-mono text-sm ${DIR_TONE[op.direction]}`}>
                      {op.direction === "NEUTRAL" && op.destAmount
                        ? `${fmtAmount(op.amount)} → ${fmtAmount(op.destAmount)}`
                        : fmtSignedAmount(op.direction, op.amount)}
                    </span>
                    {isAdmin && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void deleteOperation(op.id)}
                        aria-label={t("common.delete")}
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500">{t("pagination.perPage")}</span>
                  <Select
                    value={String(pageSize)}
                    onValueChange={(v) => setPageSize(Number(v))}
                  >
                    <SelectTrigger className="h-8 w-[72px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OPERATIONS_PAGE_SIZE_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Pagination
                  page={page}
                  totalPages={totalPages}
                  onChange={(p) => setPage(p)}
                  className="border-0 pt-0 flex-1 min-w-[200px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function BalanceCard({
  tone,
  label,
  amount,
  subtitle,
  accentText,
}: {
  tone: string;
  label: string;
  amount: string;
  subtitle: string;
  accentText?: string;
}) {
  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${tone}`} />
      <CardContent className="pt-5 pb-4">
        <p className="text-xs uppercase tracking-wider text-zinc-500">{label}</p>
        <p className={`mt-1.5 text-2xl font-semibold font-mono ${accentText ?? "text-white"}`}>
          {fmtAmount(amount)}
        </p>
        <p className="text-[11px] text-zinc-500 mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Operation forms                                                     */
/* ------------------------------------------------------------------ */

function OperationForm({
  type,
  onSubmit,
  submitting,
  isLibyaOnly,
}: {
  type: OpType;
  onSubmit: (payload: Record<string, unknown>) => Promise<void>;
  submitting: boolean;
  isLibyaOnly: boolean;
}) {
  const t = useT();
  const direction = OP_DIRECTIONS[type];

  const submitVariant: "default" | "secondary" =
    direction === "REVENUE" ? "default" : direction === "EXPENSE" ? "default" : "secondary";

  const baseButton = (
    <Button
      type="submit"
      className="w-full mt-2"
      variant={submitVariant}
      disabled={submitting}
    >
      {submitting ? t("common.saving") : t("cash.submit")}
    </Button>
  );

  if (type === "ADD_BALANCE") {
    return (
      <SimpleForm
        onSubmit={(fd) =>
          onSubmit({
            type,
            amount: fd.amount,
            currency: fd.currency,
            occurredAt: fd.occurredAt,
          })
        }
      >
        <FieldNumber name="amount" label={t("cash.field.amount")} />
        <FieldCurrency isLibyaOnly={isLibyaOnly} />
        <FieldDate />
        {baseButton}
      </SimpleForm>
    );
  }

  if (type === "FROM_DEX") {
    return (
      <SimpleForm
        onSubmit={(fd) =>
          onSubmit({
            type,
            totalRevenue: fd.totalRevenue,
            numberOfOrders: Number(fd.numberOfOrders),
            fulfillmentFees: fd.fulfillmentFees,
            confirmationFees: fd.confirmationFees,
            occurredAt: fd.occurredAt,
          })
        }
      >
        <FieldNumber name="totalRevenue" label={t("cash.field.totalRevenue")} />
        <FieldNumber name="numberOfOrders" label={t("cash.field.numberOfOrders")} step="1" />
        <FieldNumber name="fulfillmentFees" label={t("cash.field.fulfillmentFees")} />
        <FieldNumber name="confirmationFees" label={t("cash.field.confirmationFees")} />
        <FieldDate />
        {baseButton}
      </SimpleForm>
    );
  }

  if (type === "BUY_COD_PRODUCT" || type === "BUY_SELLER_STOCK" || type === "SELLER_PAY_STOCK") {
    return (
      <SimpleForm
        onSubmit={(fd) =>
          onSubmit({
            type,
            sku: fd.sku,
            quantity: Number(fd.quantity),
            pricePerUnit: fd.pricePerUnit,
            currency: fd.currency,
            occurredAt: fd.occurredAt,
          })
        }
      >
        <FieldText name="sku" label={t("cash.field.sku")} />
        <FieldNumber name="quantity" label={t("cash.field.quantity")} step="1" />
        <FieldNumber name="pricePerUnit" label={t("cash.field.pricePerUnit")} />
        <FieldCurrency isLibyaOnly={isLibyaOnly} />
        <FieldDate />
        {baseButton}
      </SimpleForm>
    );
  }

  if (type === "CURRENCY_SWAP") {
    return (
      <SimpleForm
        onSubmit={(fd) =>
          onSubmit({
            type,
            originCurrency: fd.originCurrency,
            originAmount: fd.originAmount,
            destCurrency: fd.destCurrency,
            destAmount: fd.destAmount,
            occurredAt: fd.occurredAt,
          })
        }
      >
        <FieldCurrency name="originCurrency" label={t("cash.field.originCurrency")} isLibyaOnly={isLibyaOnly} />
        <FieldNumber name="originAmount" label={t("cash.field.originAmount")} />
        <FieldCurrency name="destCurrency" label={t("cash.field.destCurrency")} isLibyaOnly={isLibyaOnly} />
        <FieldNumber name="destAmount" label={t("cash.field.destAmount")} />
        <FieldDate />
        {baseButton}
      </SimpleForm>
    );
  }

  if (type === "SALARY") {
    return (
      <SimpleForm
        onSubmit={(fd) =>
          onSubmit({
            type,
            region: fd.region,
            employeeName: fd.employeeName,
            amount: fd.amount,
            currency: fd.currency,
            occurredAt: fd.occurredAt,
            note: fd.note || undefined,
          })
        }
      >
        <FieldRegion />
        <FieldText name="employeeName" label={t("cash.field.employeeName")} />
        <FieldNumber name="amount" label={t("cash.field.amount")} />
        <FieldCurrency isLibyaOnly={isLibyaOnly} />
        <FieldDate />
        <FieldTextarea name="note" label={t("cash.field.note")} />
        {baseButton}
      </SimpleForm>
    );
  }

  if (type === "OFFICE_EXPENSE") {
    return (
      <SimpleForm
        onSubmit={(fd) =>
          onSubmit({
            type,
            region: fd.region,
            motif: fd.motif,
            amount: fd.amount,
            currency: fd.currency,
            occurredAt: fd.occurredAt,
            note: fd.note || undefined,
          })
        }
      >
        <FieldRegion />
        <div className="space-y-1">
          <Label className="text-xs">{t("cash.field.motif")}</Label>
          <Select name="motif" defaultValue="Rent">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Rent", "Hosting", "Amazon", "Cloudflare", "Ménage", "Others"].map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FieldNumber name="amount" label={t("cash.field.amount")} />
        <FieldCurrency isLibyaOnly={isLibyaOnly} />
        <FieldDate />
        <FieldTextarea name="note" label={t("cash.field.note")} />
        {baseButton}
      </SimpleForm>
    );
  }

  if (type === "WITHDRAW") {
    return (
      <SimpleForm
        onSubmit={(fd) =>
          onSubmit({
            type,
            sellerName: fd.sellerName,
            amount: fd.amount,
            currency: fd.currency,
            method: fd.method,
            fees: fd.fees,
            occurredAt: fd.occurredAt,
          })
        }
      >
        <FieldText name="sellerName" label={t("cash.field.sellerName")} />
        <FieldNumber name="amount" label={t("cash.field.amount")} />
        <FieldCurrency isLibyaOnly={isLibyaOnly} />
        <div className="space-y-1">
          <Label className="text-xs">{t("cash.field.method")}</Label>
          <Select name="method" defaultValue="Wise">
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["Moroccan Bank", "Wise", "Payoneer", "Binance", "RedotPay"].map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <FieldNumber name="fees" label={t("cash.field.fees")} />
        <FieldDate />
        {baseButton}
      </SimpleForm>
    );
  }

  // OTHER
  return (
    <SimpleForm
      onSubmit={(fd) =>
        onSubmit({
          type,
          sign: fd.sign,
          amount: fd.amount,
          currency: fd.currency,
          occurredAt: fd.occurredAt,
          note: fd.note || undefined,
        })
      }
    >
      <div className="space-y-1">
        <Label className="text-xs">{t("cash.field.sign")}</Label>
        <Select name="sign" defaultValue="MINUS">
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="PLUS">+ {t("cash.field.signPlus")}</SelectItem>
            <SelectItem value="MINUS">− {t("cash.field.signMinus")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <FieldNumber name="amount" label={t("cash.field.amount")} />
      <FieldCurrency isLibyaOnly={isLibyaOnly} />
      <FieldDate />
      <FieldTextarea name="note" label={t("cash.field.note")} />
      {baseButton}
    </SimpleForm>
  );
}

/* Helpers: form + fields */

function SimpleForm({
  children,
  onSubmit,
}: {
  children: React.ReactNode;
  onSubmit: (fd: Record<string, string>) => void;
}) {
  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        const obj: Record<string, string> = {};
        fd.forEach((v, k) => {
          obj[k] = String(v);
        });
        onSubmit(obj);
      }}
    >
      {children}
    </form>
  );
}

function FieldText({ name, label }: { name: string; label: string }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input name={name} required />
    </div>
  );
}

function FieldNumber({
  name,
  label,
  step,
}: {
  name: string;
  label: string;
  step?: string;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input name={name} type="number" step={step ?? "0.001"} required />
    </div>
  );
}

function FieldTextarea({ name, label }: { name: string; label: string }) {
  const t = useT();
  return (
    <div className="space-y-1">
      <Label className="text-xs">
        {label} <span className="text-zinc-500">{t("common.optional")}</span>
      </Label>
      <textarea
        name={name}
        rows={2}
        className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2.5 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-brand"
      />
    </div>
  );
}

function FieldDate() {
  const t = useT();
  return (
    <div className="space-y-1">
      <Label className="text-xs">{t("cash.field.date")}</Label>
      <Input name="occurredAt" type="date" defaultValue={today()} required />
    </div>
  );
}

function FieldCurrency({
  isLibyaOnly,
  name = "currency",
  label,
}: {
  isLibyaOnly: boolean;
  name?: string;
  label?: string;
}) {
  const t = useT();
  if (isLibyaOnly) {
    // The Libyan-accountant role is locked to LYD. We render a visible read-only
    // display PLUS a hidden input that actually carries the value into FormData.
    // Using `disabled` on the visible input would silently exclude it from the
    // form submission, so the server would receive no `currency` field and
    // reject the operation with a "currency required" / "must be LYD" error.
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label ?? t("cash.field.currency")}</Label>
        <input type="hidden" name={name} value="LYD" />
        <div
          className="flex h-10 w-full items-center rounded-md border border-zinc-800 bg-zinc-900/60 px-3 text-sm text-zinc-300"
          aria-readonly="true"
        >
          LYD
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label ?? t("cash.field.currency")}</Label>
      <Select name={name} defaultValue="USD">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {(["MAD", "USD", "LYD"] as const).map((c) => (
            <SelectItem key={c} value={c}>
              {c}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FieldRegion() {
  const t = useT();
  return (
    <div className="space-y-1">
      <Label className="text-xs">{t("cash.field.region")}</Label>
      <Select name="region" defaultValue="Morocco">
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="Morocco">{t("cash.region.morocco")}</SelectItem>
          <SelectItem value="Libya">{t("cash.region.libya")}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Owed to sellers — single editable total                              */
/* ------------------------------------------------------------------ */

function OwedToSellersCard({
  value,
  allowedCurrencies,
  canEdit,
  onSaved,
  setMsg,
}: {
  value: OwedTotal | null;
  allowedCurrencies: Currency[];
  canEdit: boolean;
  onSaved: () => void;
  setMsg: (s: string) => void;
}) {
  const t = useT();
  const defaultCurrency: Currency = allowedCurrencies[0] ?? "USD";
  const displayAmount = value?.amount ?? "0";
  const displayCurrency: Currency = value?.currency ?? defaultCurrency;

  const [open, setOpen] = useState(false);
  const [editAmount, setEditAmount] = useState(displayAmount);
  const [editCurrency, setEditCurrency] = useState<Currency>(displayCurrency);
  const [saving, setSaving] = useState(false);

  // Whenever the card opens, sync the dialog inputs with the current value
  // so the user is editing the live figure rather than a stale draft.
  function openDialog() {
    setEditAmount(displayAmount);
    setEditCurrency(displayCurrency);
    setOpen(true);
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    try {
      const r = await fetch("/api/cash/owed-total", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: editAmount || "0",
          currency: editCurrency,
        }),
      });
      if (r.ok) {
        setMsg(t("cash.toast.saved"));
        setOpen(false);
        onSaved();
      } else {
        const j = await r.json().catch(() => ({}));
        setMsg(extractError(j) || t("cash.toast.failed"));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Card className="relative overflow-hidden group">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 to-rose-700" />
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs uppercase tracking-wider text-zinc-500">
              {t("cash.balance.owed")}
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={openDialog}
                className="text-zinc-500 hover:text-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
                aria-label={t("cash.owed.edit")}
                title={t("cash.owed.edit")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <p className="text-2xl font-semibold font-mono text-red-300">
              {fmtAmount(displayAmount)}
            </p>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-mono uppercase text-zinc-300">
              {displayCurrency}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 mt-1">
            {t("cash.balance.owedSubtitle")}
          </p>
          {canEdit && (
            <button
              type="button"
              onClick={openDialog}
              className="mt-2 text-[11px] text-brand hover:underline"
            >
              {t("cash.owed.edit")}
            </button>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("cash.owed.editTitle")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <p className="text-xs text-zinc-500">{t("cash.owed.editHint")}</p>
            <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
              <div className="space-y-1">
                <Label className="text-xs">{t("cash.field.amount")}</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={editAmount}
                  onChange={(e) => setEditAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{t("cash.field.currency")}</Label>
                <Select
                  value={editCurrency}
                  onValueChange={(v) => setEditCurrency(v as Currency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedCurrencies.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setOpen(false)}
                disabled={saving}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? t("common.saving") : t("common.save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function extractError(j: unknown): string {
  if (j && typeof j === "object") {
    const err = (j as { error?: unknown }).error;
    if (typeof err === "string") return err;
    if (err && typeof err === "object") {
      try {
        return JSON.stringify(err);
      } catch {
        return "";
      }
    }
  }
  return "";
}
