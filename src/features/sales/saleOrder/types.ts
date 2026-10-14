// src/features/sales/saleOrder/types.ts - mirror of sales SaleOrderSerializer.

import type { PricedDocumentFields, PricedLine } from "../shared/types";

export type SaleOrderStatus = "Pending" | "Completed" | "Closed";
export type SaleOrderType = "Domestic" | "Export";

export interface SaleOrderLine extends PricedLine {
  amortisationCost: number | string;
  drawingNo: string;
  drawingRevision: string;
  lineNo: string;
  shortClosedQty?: string;
  deliveredQty?: string;
  invoicedQty?: string;
  pendingQty?: string;
}

export interface SaleOrder extends PricedDocumentFields {
  id: number;
  soNumber: string;
  displayNumber: string;
  soDate: string;
  soType: SaleOrderType;
  quotation: number | null;
  quotationNumber: string | null;
  customerPoNo: string;
  customerPoDate: string | null;
  validUpto: string | null;
  currencyCode: string;
  exchangeRate: number | string;
  status: SaleOrderStatus;
  closedReason: string;
  revisionNo: number;
  amendmentDate: string | null;
  advanceReceived: number | string;
  advanceMode: string;
  advanceBalance?: string;
  items: SaleOrderLine[];
}

export interface SaleOrderRevision {
  id: number;
  revisionNo: number;
  amendmentDate: string;
  reason: string;
  snapshot: Record<string, unknown>;
  createdBy: string;
  createdAt: string;
}

export const SO_TYPE_OPTIONS = [
  { value: "Domestic", label: "Sale Order" },
  { value: "Export", label: "Export Sale Order" },
];
