// src/features/debitNotes/types.ts

// Refund status (BRD 6.5.5), derived by the backend from amountRefunded vs
// netAmount - plus Cancelled, set only by the Cancel row action.
export type DNStatus = "Unpaid" | "Partially Refunded" | "Refunded" | "Cancelled";

export interface DebitNoteItem {
  id?: number;
  invoiceItem: number | null; // the Purchase Invoice line it was fetched from, if any
  item: number;
  itemCode?: string;
  description: string;
  uom: string;
  hsnSac: string;
  quantity: number;
  rate: number;
  tax: number | null; // defaults from the invoice line / item, user-changeable
  taxName?: string | null; // read-only
  taxableValue?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  lineTotal?: number;
}

export interface DebitNote {
  id: number;
  debitNoteNumber: string;
  // BRD 6.5.5.2 "Link to Invoice" - null for a standalone Debit Note.
  purchaseInvoice: number | null;
  invoiceNumber: string | null; // read-only
  supplier: number;
  debitNoteDate: string;
  reason: string;
  status: DNStatus;
  remarks: string;
  items: DebitNoteItem[];
  netAmount: number;
  amountRefunded: number;
  balanceAmount: number; // read-only: netAmount - amountRefunded
}

export type DebitNotePayload = Omit<
  DebitNote,
  "id" | "debitNoteNumber" | "invoiceNumber" | "status" | "netAmount" | "balanceAmount"
>;

// GET /debit-notes/linkable-invoices/?supplier=<id>
export interface LinkableInvoiceOption {
  id: number;
  invoiceNumber: string;
  supplier: number;
  invoiceDate: string;
}
