// src/features/purchaseOrders/types.ts

export type POStatus = "Pending" | "Approved" | "Rejected" | "Hold";

export interface PurchaseOrderItem {
  id?: number;
  // The Approved PR line this PO line orders against (null = added manually).
  // BRD 6.5.2.1.2 puts the PR No. on each line, so one PO can draw from
  // several PRs and a PR can be split across several POs.
  prItem: number | null;
  prNumber?: string | null; // read-only
  prDate?: string | null; // read-only
  item: number;
  itemCode?: string;
  description: string;
  uom: string;
  hsnSac: string;
  orderQty: number;
  invoicedQty?: number;
  pendingQty?: number;
  rate: number;
  discountPercent: number;
  discountAmount?: number; // read-only
  packForwardAmount: number;
  freightAmount: number;
  tax: number | null; // Tax master id - defaults from the item, user-changeable
  taxName?: string | null; // read-only
  notes: string;
  taxableValue?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  cess?: number;
  lineTotal?: number;
  deliveryDate: string | null;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  prNumbers: string[]; // read-only, derived from the lines
  supplier: number;
  poDate: string;
  status: POStatus;
  raisedBy: string;
  approvedBy: string; // read-only
  quotationNo: string;
  quotationDate: string | null;
  validityDate: string | null;
  kindAttn: string;
  otherReference: string;
  deliveryTo: string;
  delivery: string;
  terms: string;
  paymentTerms: string;
  currencyCode: string;
  dispatchDetails: string;
  remarks: string;
  items: PurchaseOrderItem[];
  netAmount: number;
}

export type PurchaseOrderPayload = Omit<
  PurchaseOrder,
  "id" | "poNumber" | "prNumbers" | "status" | "approvedBy" | "netAmount"
>;

// An Approved PR line that still has quantity left to order.
export interface OrderablePRLine {
  id: number; // PurchaseRequisitionItem id -> becomes prItem on the PO line
  item: number;
  itemCode: string;
  description: string;
  uom: string;
  hsnSac: string;
  quantity: number;
  orderedQty: number;
  pendingOrderQty: number;
  deliveryDate: string | null;
}

// GET /purchase-orders/approved-requisitions/?supplier=<id>
export interface OrderablePR {
  id: number;
  prNumber: string;
  prType: "Item" | "General";
  supplier: number | null;
  prDate: string;
  lines: OrderablePRLine[];
}
