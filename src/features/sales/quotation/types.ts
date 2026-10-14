// src/features/sales/quotation/types.ts - mirror of sales QuotationSerializer.

import type { PricedDocumentFields, PricedLine } from "../shared/types";

export type QuotationStatus = "Draft" | "Sent" | "Accepted" | "Declined" | "Converted";

export interface Quotation extends PricedDocumentFields {
  id: number;
  quotationNumber: string;
  quotationDate: string;
  validTill: string | null;
  enquiry: number | null;
  enquiryNumber: string | null;
  contactPerson: string;
  kindAttn: string;
  terms: string;
  delivery: string;
  packages: string;
  followUpDate: string | null;
  status: QuotationStatus;
  isExpired: boolean;
  items: PricedLine[];
}

// BRD: a quotation can't be modified once accepted.
export const LOCKED_QUOTATION_STATUSES: QuotationStatus[] = ["Accepted", "Declined", "Converted"];
