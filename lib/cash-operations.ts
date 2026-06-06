/**
 * Shared validation + balance-derivation helpers for the Cashflow ledger v2.
 *
 * Each operation type is mapped to:
 *   - a `direction` (REVENUE / EXPENSE / NEUTRAL)
 *   - a canonical `amount` + `currency` (the primary leg that affects the wallet)
 *   - optional `destAmount` + `destCurrency` (only used by CURRENCY_SWAP)
 *   - a human-readable `description` (NOT translated — auto-generated from
 *     the structured inputs so admins can read what each row represents)
 *   - a `metadata` blob preserving the original input fields verbatim
 *     for audit / future UI surfaces.
 */

import {
  type AccountingCurrency,
  type CashOperationDirection,
  type CashOperationType,
} from "@prisma/client";
import { z } from "zod";

const CURRENCIES = ["MAD", "USD", "LYD"] as const satisfies readonly AccountingCurrency[];
const currencyEnum = z.enum(CURRENCIES);
const decString = z.union([z.string(), z.number()]).transform((v) => String(v));

const dateString = z.string().min(1);

/** Optional evidence files (receipts/screenshots). Same shape for every op type. */
const attachments = z.array(z.string().url()).max(10).optional();

/** Per-type form schemas (mirror what the UI submits). */
const addBalanceSchema = z.object({
  type: z.literal("ADD_BALANCE"),
  amount: decString,
  currency: currencyEnum,
  occurredAt: dateString,
  attachments,
});

const fromDexSchema = z.object({
  type: z.literal("FROM_DEX"),
  totalRevenue: decString,
  numberOfOrders: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  fulfillmentFees: decString,
  confirmationFees: decString,
  occurredAt: dateString,
  attachments,
});

const buySchema = z.object({
  type: z.enum(["BUY_COD_PRODUCT", "BUY_SELLER_STOCK", "SELLER_PAY_STOCK"]),
  sku: z.string().min(1).max(120),
  quantity: z.union([z.string(), z.number()]).transform((v) => Number(v)),
  pricePerUnit: decString,
  // Optional platform/payment fees (e.g. Alibaba). Only used by BUY_SELLER_STOCK,
  // where it's added on top of quantity × pricePerUnit.
  fees: decString.optional(),
  currency: currencyEnum,
  occurredAt: dateString,
  attachments,
});

const currencySwapSchema = z.object({
  type: z.literal("CURRENCY_SWAP"),
  originCurrency: currencyEnum,
  originAmount: decString,
  destCurrency: currencyEnum,
  destAmount: decString,
  occurredAt: dateString,
  attachments,
});

const salarySchema = z.object({
  type: z.literal("SALARY"),
  region: z.enum(["Morocco", "Libya"]),
  employeeName: z.string().min(1).max(200),
  amount: decString,
  currency: currencyEnum,
  occurredAt: dateString,
  note: z.string().max(2000).optional(),
  attachments,
});

const officeSchema = z.object({
  type: z.literal("OFFICE_EXPENSE"),
  region: z.enum(["Morocco", "Libya"]),
  motif: z.enum(["Rent", "Hosting", "Amazon", "Cloudflare", "Ménage", "Others"]),
  amount: decString,
  currency: currencyEnum,
  occurredAt: dateString,
  note: z.string().max(2000).optional(),
  attachments,
});

const payShippingSchema = z.object({
  type: z.literal("PAY_SHIPPING"),
  country: z.enum(["China", "Dubai"]),
  amount: decString,
  currency: currencyEnum,
  occurredAt: dateString,
  attachments,
});

const withdrawSchema = z.object({
  type: z.literal("WITHDRAW"),
  sellerName: z.string().min(1).max(200),
  // Backwards compat: older clients sent `amountUsd`; new clients send `amount`
  // alongside a `currency` field. Accept either, normalize downstream.
  amount: decString.optional(),
  amountUsd: decString.optional(),
  currency: currencyEnum.optional(),
  method: z.enum(["Moroccan Bank", "Wise", "Payoneer", "Binance", "RedotPay"]),
  fees: decString,
  occurredAt: dateString,
  attachments,
});

const otherSchema = z.object({
  type: z.literal("OTHER"),
  sign: z.enum(["PLUS", "MINUS"]),
  amount: decString,
  currency: currencyEnum,
  occurredAt: dateString,
  note: z.string().max(2000).optional(),
  attachments,
});

export const cashOperationInputSchema = z.discriminatedUnion("type", [
  addBalanceSchema,
  fromDexSchema,
  buySchema,
  currencySwapSchema,
  salarySchema,
  officeSchema,
  payShippingSchema,
  withdrawSchema,
  otherSchema,
]);

export type CashOperationInput = z.infer<typeof cashOperationInputSchema>;

export type CashOperationPersisted = {
  type: CashOperationType;
  direction: CashOperationDirection;
  occurredAt: Date;
  amount: string;
  currency: AccountingCurrency;
  destAmount: string | null;
  destCurrency: AccountingCurrency | null;
  description: string;
  note: string | null;
  metadata: Record<string, unknown>;
  attachments: string[];
};

function num(s: string): number {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Convert a validated form payload into the row we'll persist. */
export function buildOperationRow(input: CashOperationInput): CashOperationPersisted {
  const row = buildOperationRowInner(input);
  // Carry optional evidence files through to a dedicated column (every op type
  // accepts an `attachments` array; default to none).
  return { ...row, attachments: input.attachments ?? [] };
}

function buildOperationRowInner(
  input: CashOperationInput
): Omit<CashOperationPersisted, "attachments"> & { attachments?: string[] } {
  const occurredAt = new Date(`${input.occurredAt}T12:00:00`);

  switch (input.type) {
    case "ADD_BALANCE":
      return {
        type: "ADD_BALANCE",
        direction: "REVENUE",
        occurredAt,
        amount: input.amount,
        currency: input.currency,
        destAmount: null,
        destCurrency: null,
        description: `Add balance ${input.amount} ${input.currency}`,
        note: null,
        metadata: { ...input },
      };

    case "FROM_DEX": {
      const net = num(input.totalRevenue) - num(input.fulfillmentFees) - num(input.confirmationFees);
      return {
        type: "FROM_DEX",
        direction: "REVENUE",
        occurredAt,
        amount: String(net),
        currency: "LYD",
        destAmount: null,
        destCurrency: null,
        description: `DEX payout net ${net.toFixed(3)} LYD (${input.numberOfOrders} orders)`,
        note: null,
        metadata: { ...input, netAmount: net },
      };
    }

    case "BUY_COD_PRODUCT":
    case "BUY_SELLER_STOCK":
    case "SELLER_PAY_STOCK": {
      const goods = num(input.pricePerUnit) * (input.quantity || 0);
      // Platform/payment fees only apply to seller-stock sourcing (Alibaba etc.).
      const fees = input.type === "BUY_SELLER_STOCK" ? num(input.fees ?? "0") : 0;
      const total = goods + fees;
      const direction: CashOperationDirection =
        input.type === "SELLER_PAY_STOCK" ? "NEUTRAL" : "EXPENSE";
      const verb =
        input.type === "BUY_COD_PRODUCT"
          ? "Buy COD product"
          : input.type === "BUY_SELLER_STOCK"
            ? "Buy seller stock"
            : "Seller pays for stock";
      const feeSuffix = fees > 0 ? ` + fees ${input.fees}` : "";
      return {
        type: input.type,
        direction,
        occurredAt,
        amount: String(total),
        currency: input.currency,
        destAmount: null,
        destCurrency: null,
        description: `${verb} · SKU ${input.sku} × ${input.quantity} @ ${input.pricePerUnit}${feeSuffix}`,
        note: null,
        metadata: { ...input, goodsAmount: goods, fees, totalAmount: total },
      };
    }

    case "CURRENCY_SWAP":
      return {
        type: "CURRENCY_SWAP",
        direction: "NEUTRAL",
        occurredAt,
        amount: input.originAmount,
        currency: input.originCurrency,
        destAmount: input.destAmount,
        destCurrency: input.destCurrency,
        description: `Swap ${input.originAmount} ${input.originCurrency} → ${input.destAmount} ${input.destCurrency}`,
        note: null,
        metadata: { ...input },
      };

    case "SALARY":
      return {
        type: "SALARY",
        direction: "EXPENSE",
        occurredAt,
        amount: input.amount,
        currency: input.currency,
        destAmount: null,
        destCurrency: null,
        description: `Salary · ${input.employeeName} (${input.region})`,
        note: input.note ?? null,
        metadata: { ...input },
      };

    case "OFFICE_EXPENSE":
      return {
        type: "OFFICE_EXPENSE",
        direction: "EXPENSE",
        occurredAt,
        amount: input.amount,
        currency: input.currency,
        destAmount: null,
        destCurrency: null,
        description: `Office · ${input.motif} (${input.region})`,
        note: input.note ?? null,
        metadata: { ...input },
      };

    case "PAY_SHIPPING":
      return {
        type: "PAY_SHIPPING",
        direction: "EXPENSE",
        occurredAt,
        amount: input.amount,
        currency: input.currency,
        destAmount: null,
        destCurrency: null,
        description: `Pay shipping · ${input.country} · ${input.amount} ${input.currency}`,
        note: null,
        metadata: { ...input },
      };

    case "WITHDRAW": {
      const rawAmount = input.amount ?? input.amountUsd ?? "0";
      const currency: AccountingCurrency = input.currency ?? "USD";
      const total = num(rawAmount) + num(input.fees);
      return {
        type: "WITHDRAW",
        direction: "EXPENSE",
        occurredAt,
        amount: String(total),
        currency,
        destAmount: null,
        destCurrency: null,
        description: `Withdraw ${rawAmount} ${currency} via ${input.method} (fees ${input.fees}) → ${input.sellerName}`,
        note: null,
        metadata: { ...input, currency, amount: rawAmount, totalCharged: total },
      };
    }

    case "OTHER":
      return {
        type: "OTHER",
        direction: input.sign === "PLUS" ? "REVENUE" : "EXPENSE",
        occurredAt,
        amount: input.amount,
        currency: input.currency,
        destAmount: null,
        destCurrency: null,
        description: `Other ${input.sign === "PLUS" ? "+" : "−"} ${input.amount} ${input.currency}`,
        note: input.note ?? null,
        metadata: { ...input },
      };
  }
}

/** Apply a single row to a running balance map (mutates). */
export function applyOperationToBalances(
  row: {
    direction: CashOperationDirection;
    currency: AccountingCurrency;
    amount: { toString: () => string };
    destCurrency: AccountingCurrency | null;
    destAmount: { toString: () => string } | null;
  },
  balances: Record<AccountingCurrency, number>
): void {
  const amount = Number(row.amount.toString());
  if (row.direction === "REVENUE") {
    balances[row.currency] += amount;
  } else if (row.direction === "EXPENSE") {
    balances[row.currency] -= amount;
  } else {
    // NEUTRAL: only the SWAP form actually moves money.
    if (row.destCurrency && row.destAmount) {
      balances[row.currency] -= amount;
      balances[row.destCurrency] += Number(row.destAmount.toString());
    }
  }
}
