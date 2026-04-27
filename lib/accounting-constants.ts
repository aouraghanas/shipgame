/**
 * Keep in sync with prisma enum `AccountingCategory`.
 */
export const ACCOUNTING_CATEGORIES = [
  "OFFICE_RENT",
  "OFFICE_OTHER",
  "SALARY_MOROCCO_DH",
  "SALARY_LIBYA_LYD",
  "STOCK_COD_DROP_PURCHASE",
  "ONLINE_INFRA",
  "TRANSFER_LIBYA_TO_USD_FEE",
  "OTHER_LOSS",
  "SHIPPING_MARGIN",
  "FULFILLMENT_MARGIN",
  "CALL_CENTER_INTERNAL",
  "CALL_CENTER_DEXPRESS",
  "LEAD_ENTRY_FEE",
  "COD_SERVICE_FEE_ON_COLLECTION",
  "OTHER_REVENUE",
] as const;

export type AccountingCategoryValue = (typeof ACCOUNTING_CATEGORIES)[number];

export const ACCOUNTING_CATEGORY_LABELS: Record<AccountingCategoryValue, string> = {
  OFFICE_RENT: "Office rent",
  OFFICE_OTHER: "Office other (Wi‑Fi, utilities, misc.)",
  SALARY_MOROCCO_DH: "Salaries — Morocco (MAD)",
  SALARY_LIBYA_LYD: "Salaries — Libya (LYD)",
  STOCK_COD_DROP_PURCHASE: "COD Drop — stock / product purchases",
  ONLINE_INFRA: "Online — servers, domain, AI tokens, SaaS",
  TRANSFER_LIBYA_TO_USD_FEE: "Transfer Libya → USD (bank / FX fee %)",
  OTHER_LOSS: "Other losses",
  SHIPPING_MARGIN: "Shipping margin (seller price − Dexpress cost)",
  FULFILLMENT_MARGIN: "Fulfillment margin",
  CALL_CENTER_INTERNAL: "Call center — Shipeh (Libya staff)",
  CALL_CENTER_DEXPRESS: "Call center — Dexpress",
  LEAD_ENTRY_FEE: "Lead entry fees ($0.20 × leads)",
  COD_SERVICE_FEE_ON_COLLECTION: "COD service fee (% of cash collected)",
  OTHER_REVENUE: "Other revenue",
};
