// src/features/purchaseRequisitions/types.ts

export interface PurchaseRequisitionItem {
  id?: number;
  item: number; // Item FK id
  itemCode?: string; // display-only, joined in on the frontend for the grid
  description: string;
  uom: string;
  hsnSac: string;
  quantity: number;
  deliveryDate: string | null;
  orderedQty?: number; // read-only: already ordered on POs
  pendingOrderQty?: number; // read-only: still open to order
}

export type PRType = "Item" | "General";

export type PRStatus = "Pending" | "Approved" | "Rejected" | "Hold";

export interface PurchaseRequisition {
  id: number;
  prNumber: string;
  prType: PRType;
  supplier: number | null; // Party FK id - optional per BRD 6.5.1.1.2
  raisedBy: string;
  prDate: string;
  status: PRStatus;
  approvedBy: string; // read-only: who approved/rejected/held it
  remarks: string;
  items: PurchaseRequisitionItem[];
}

export type PurchaseRequisitionPayload = Omit<PurchaseRequisition, "id" | "prNumber" | "status" | "approvedBy">;
