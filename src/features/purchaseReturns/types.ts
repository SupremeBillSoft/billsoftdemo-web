// src/features/purchaseReturns/types.ts

// Refund status (BRD 6.5.4) - derived by the backend from amountRefunded
// vs netAmount, never set directly. There is no approval workflow.
export type PRetStatus = "Unpaid" | "Partially Refunded" | "Refunded";

export interface PurchaseReturnItem {
  id?: number;
  invoiceItem: number; // the PurchaseInvoiceItem this line is drawn against
  item: number;
  itemCode?: string;
  description: string;
  uom: string;
  hsnSac: string;
  returnedQty: number;
  rate: number;
  tax: number | null; // defaults to the invoice line's tax
  taxName?: string | null; // read-only
  godown: number | null; // godown the goods leave from (defaults to the invoice line's)
  godownName?: string | null; // read-only
  taxableValue?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  lineTotal?: number;
}

export interface PurchaseReturn {
  id: number;
  returnNumber: string;
  purchaseInvoice: number;
  invoiceNumber: string; // read-only
  supplier: number;
  returnDate: string;
  reason: string;
  status: PRetStatus;
  remarks: string;
  items: PurchaseReturnItem[];
  netAmount: number;
  amountRefunded: number;
  balanceAmount: number; // read-only: netAmount - amountRefunded
}

export type PurchaseReturnPayload = Omit<
  PurchaseReturn,
  "id" | "returnNumber" | "invoiceNumber" | "status" | "netAmount" | "balanceAmount"
>;

export interface ReturnableInvoiceOption {
  id: number;
  invoiceNumber: string;
  supplier: number;
  invoiceDate: string;
}

// An invoice line still open to be returned (GET /purchase-invoices/{id}/returnable-lines/)
export interface ReturnableInvoiceLine {
  id: number; // PurchaseInvoiceItem id -> becomes invoiceItem on the Return line
  item: number;
  itemCode?: string;
  description: string;
  uom: string;
  hsnSac: string;
  invoicedQty: number;
  returnableQty: number;
  rate: number;
  tax: number | null;
  godown: number | null;
}
