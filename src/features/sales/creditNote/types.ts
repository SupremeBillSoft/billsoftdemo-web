// src/features/sales/creditNote/types.ts - mirror of CreditNoteSerializer.

import type { EInvoiceFields } from "../shared/compliance";
import type { PricedDocumentFields, PricedLine } from "../shared/types";
import type { RefundStatus } from "../salesReturn/types";

export type CreditNoteReason = "SalesReturn" | "PostSaleDiscount" | "PriceCorrection" | "DeficiencyInService" | "Other";

export interface CreditNoteLine extends PricedLine {
  invoiceItem: number | null;
}

export interface CreditNote extends PricedDocumentFields, EInvoiceFields {
  id: number;
  creditNoteNumber: string;
  creditNoteDate: string;
  salesInvoice: number;
  invoiceNumber: string;
  salesReturn: number | null;
  returnNumber: string | null;
  reason: CreditNoteReason;
  paymentTerms: string;
  amountRefunded: number | string;
  balanceAmount: string;
  status: RefundStatus;
  cancelReason: string;
  gstDeadline: string;
  items: CreditNoteLine[];
}

export const CREDIT_NOTE_REASONS: { value: CreditNoteReason; label: string }[] = [
  { value: "SalesReturn", label: "Sales return" },
  { value: "PostSaleDiscount", label: "Discount after sale" },
  { value: "PriceCorrection", label: "Excess charged / price correction" },
  { value: "DeficiencyInService", label: "Deficiency in supply" },
  { value: "Other", label: "Other" },
];

/** CGST Act s.34(2): a GST credit note must be issued by 30 November after
 * the end of the financial year of the invoice (mirror of rules.py). */
export function creditNoteDeadline(invoiceDate: string, fyStartMonth = 4): string {
  const [y, month] = invoiceDate.split("-").map(Number);
  const fyStartYear = month >= fyStartMonth ? y : y - 1;
  const fyEndMonth = ((fyStartMonth - 2 + 12) % 12) + 1;
  const fyEndYear = fyStartYear + (fyStartMonth > 1 ? 1 : 0);
  const year = fyEndMonth < 11 ? fyEndYear : fyEndYear + 1;
  return `${year}-11-30`;
}
