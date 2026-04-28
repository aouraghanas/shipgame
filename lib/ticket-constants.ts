import type { SupportTicketSubject, SupportTicketPriority, SupportTicketRecipient } from "@prisma/client";

export const TICKET_SUBJECTS: { value: SupportTicketSubject; label: string }[] = [
  { value: "SOURCING", label: "Sourcing" },
  { value: "PAYMENTS", label: "Payments" },
  { value: "CALL_CENTER", label: "Call center" },
  { value: "DELIVERY", label: "Delivery" },
  { value: "SHIPPING", label: "Shipping" },
  { value: "ORDERS", label: "Orders" },
  { value: "PLATFORM", label: "Platform / product" },
  { value: "WAREHOUSE", label: "Warehouse / inventory" },
  { value: "PARTNER_LOGISTICS", label: "Partner logistics (e.g. Dexpress)" },
  { value: "FINANCE", label: "Finance" },
  { value: "PRODUCT_CATALOG", label: "Catalog / COD Drop" },
  { value: "TECH_SUPPORT", label: "Tech / integrations" },
  { value: "ACCOUNTING", label: "Accounting" },
  { value: "OTHER", label: "Other" },
];

export const TICKET_PRIORITIES: { value: SupportTicketPriority; label: string }[] = [
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
];

export const TICKET_RECIPIENTS: { value: SupportTicketRecipient; label: string }[] = [
  { value: "ALL_ADMINS", label: "All admins (ops queue)" },
  { value: "SPECIFIC_USER", label: "Specific person" },
  { value: "SOURCING_TEAM", label: "Sourcing team" },
];

export const TICKET_STATUSES: { value: string; label: string }[] = [
  { value: "OPEN", label: "Open" },
  { value: "IN_PROGRESS", label: "In progress" },
  { value: "WAITING", label: "Waiting" },
  { value: "RESOLVED", label: "Resolved" },
  { value: "ARCHIVED", label: "Archived" },
];
