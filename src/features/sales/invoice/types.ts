// src/features/sales/invoice/types.ts - mirror of SalesInvoiceSerializer.

import type { EInvoiceFields } from "../shared/compliance";
import type { CustomerParty } from "../shared/components";
import { EXPORT_STATE } from "../shared/pricing";
import type { ShipToValues } from "../shared/ShipToFields";
import type { PricedDocumentFields, PricedLine } from "../shared/types";

export type InvoiceType = "Direct" | "Order" | "DC" | "Export" | "Proforma";
export type TaxNature = "Sales" | "Labour" | "Scrap" | "Rejection" | "RMSales";

export interface SalesInvoiceLine extends PricedLine {
  soItem: number | null;
  dcItem: number | null;
  godown: number | null;
  godownName?: string | null;
  rejectionQty: number | string;
  isFree: boolean;
  remarks: string;
  returnableQty?: string;
  // client-only: cap while picking from an order / challan
  maxQty?: number;
  sourceLabel?: string;
}

export interface SalesInvoice extends PricedDocumentFields, ShipToValues, EInvoiceFields {
  id: number;
  invoiceNumber: string;
  invoiceDate: string;
  invoiceType: InvoiceType;
  taxNature: TaxNature;
  saleOrder: number | null;
  soNumber: string | null;
  quotation: number | null;
  deliveryChallans: number[];
  dcNumbers: string[];
  customerPoNo: string;
  customerPoDate: string | null;
  poAmendmentNo: string;
  poAmendmentDate: string | null;
  ourDcRef: string;
  yourDcRef: string;
  kindAttn: string;
  transportMode: string;
  vehicleNo: string;
  removalDatetime: string | null;
  distanceKm: number | null;
  bank: number | null;
  paymentTerms: string;
  dueDate: string | null;
  employeeCode: string;
  employeeName: string;
  counterNo: string;
  currencyCode: string;
  exchangeRate: number | string;
  exporterRef: string;
  exportWithIgst: boolean;
  lutNumber: string;
  portCode: string;
  shippingBillNo: string;
  shippingBillDate: string | null;
  containerNo: string;
  goodsDescription: string;
  advanceAdjusted: number | string;
  amountReceived: number | string;
  paymentMode: string;
  paymentReference: string;
  balanceAmount: string;
  status: "Active" | "Cancelled";
  cancelReason: string;
  cancelledAt: string | null;
  stockWarnings: string[];
  items: SalesInvoiceLine[];
}

export const INVOICE_TYPE_OPTIONS: { value: InvoiceType; label: string; help: string }[] = [
  { value: "Direct", label: "Direct", help: "Bill items straight away - stock leaves the chosen godown." },
  { value: "Order", label: "Against Sale Order", help: "Bill the pending quantity of a Sale Order." },
  { value: "DC", label: "Against Delivery Challan", help: "Bill goods already sent on challan(s) - stock already moved." },
  { value: "Export", label: "Export", help: "Export invoice - zero-rated under LUT, or with IGST paid." },
  { value: "Proforma", label: "Proforma", help: "A quote-like invoice: no GST liability, no stock movement, own number series." },
];

export const TAX_NATURE_OPTIONS = [
  { value: "Sales", label: "Sales" },
  { value: "Labour", label: "Labour" },
  { value: "Scrap", label: "Scrap" },
  { value: "Rejection", label: "Rejection" },
  { value: "RMSales", label: "Raw material sales" },
];

export const PAYMENT_MODES = ["Cash", "Bank Transfer", "Cheque", "UPI", "Card"].map((m) => ({ value: m, label: m }));

/** Where a document against this invoice is taxed (as the server does):
 * export = outside India, else place of supply > ship-to > customer state. */
export function invoiceBuyerState(invoice: SalesInvoice | undefined, customer: CustomerParty | undefined) {
  if (!invoice) return customer?.state ?? "";
  if (invoice.invoiceType === "Export") return EXPORT_STATE;
  return invoice.placeOfSupply || invoice.shipToState || customer?.state || "";
}
