// src/features/sales/salesReturn/types.ts - mirror of SalesReturnSerializer.

import type { PricedDocumentFields, PricedLine } from "../shared/types";

export type RefundStatus = "Unpaid" | "Partially Refunded" | "Refunded" | "Cancelled";

export interface SalesReturnLine extends PricedLine {
  invoiceItem: number;
  godown: number | null;
  godownName?: string | null;
  maxQty?: number;
}

export interface SalesReturn extends PricedDocumentFields {
  id: number;
  returnNumber: string;
  returnDate: string;
  salesInvoice: number;
  invoiceNumber: string;
  reason: string;
  paymentTerms: string;
  dueDate: string | null;
  amountRefunded: number | string;
  balanceAmount: string;
  status: RefundStatus;
  cancelReason: string;
  items: SalesReturnLine[];
}

export const RETURN_REASONS = ["Damaged", "Defective", "Wrong item", "Excess supply", "Quality rejected", "Customer changed mind", "Other"].map(
  (r) => ({ value: r, label: r })
);

export const REFUND_STATUS_OPTIONS = ["Unpaid", "Partially Refunded", "Refunded", "Cancelled"].map((s) => ({ value: s, label: s }));
