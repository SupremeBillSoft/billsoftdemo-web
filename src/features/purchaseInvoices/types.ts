// src/features/purchaseInvoices/types.ts

export type PIStatus = "Active" | "Cancelled";

// "PO" = Purchase Order based (goods, stocked into godowns); "Freight" =
// standalone freight/service bill, no PO, taxed at each service's own rate.
export type PIType = "PO" | "Freight";

export interface PurchaseInvoiceItem {
  id?: number;
  poItem: number | null; // the PurchaseOrderItem this line is drawn against (null on Freight invoices)
  item: number;
  itemCode?: string;
  description: string;
  uom: string;
  hsnSac: string;
  invoicedQty: number;
  rate: number;
  discountPercent: number;
  discountAmount?: number; // read-only
  packForwardAmount: number;
  freightAmount: number;
  tax: number | null;
  taxName?: string | null; // read-only
  godown: number | null; // where the goods are received (Product lines)
  godownName?: string | null; // read-only
  secondaryUom: string;
  conversionRate: number | null;
  secondaryQty?: number | null; // read-only: invoicedQty x conversionRate
  remarks: string;
  taxableValue?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  lineTotal?: number;
  returnableQty?: number; // read-only, populated once saved
}

export interface PurchaseInvoice {
  id: number;
  invoiceNumber: string;
  invoiceType: PIType;
  purchaseOrder: number | null;
  poNumber: string | null; // read-only
  supplier: number;
  invoiceDate: string;
  supplierInvoiceNo: string;
  supplierInvoiceDate: string;
  inwardNo: string;
  inwardDate: string | null;
  purchaseType: string;
  dueDate: string | null;
  paymentTerms: string;
  status: PIStatus;
  remarks: string;
  items: PurchaseInvoiceItem[];
  netAmount: number;
}

export type PurchaseInvoicePayload = Omit<PurchaseInvoice, "id" | "invoiceNumber" | "poNumber" | "status" | "netAmount">;

export interface InvoiceablePOOption {
  id: number;
  poNumber: string;
  supplier: number;
  poDate: string;
}

// A PO line still open to be invoiced (GET /purchase-orders/{id}/pending-lines/)
export interface PendingPOLine {
  id: number; // PurchaseOrderItem id -> becomes poItem on the PI line
  item: number;
  itemCode?: string;
  description: string;
  uom: string;
  hsnSac: string;
  orderQty: number;
  invoicedQty: number;
  pendingQty: number;
  rate: number;
  discountPercent: number;
  packForwardAmount: number;
  freightAmount: number;
  tax: number | null;
  notes: string;
}
