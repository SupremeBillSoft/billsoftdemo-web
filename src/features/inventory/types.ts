// src/features/inventory/types.ts

export interface Godown {
  id: number;
  name: string;
  location: string;
  state: string;
  description: string;
  isMain: boolean;
  status: string;
}

export type GodownPayload = Omit<Godown, "id">;

// GET /inventory/stock/ - one row per (item, batch)
export interface StockRow {
  item: number;
  itemCode: string;
  itemName: string;
  uom: string;
  batchNo: string;
  stockQty: string;
  stockValue: string;
  sellingPrice: number | null;
  purchasePrice: number | null;
}

export type AdjustmentType = "Add" | "Reduce";

export interface StockAdjustmentPayload {
  item: number;
  godown: number;
  adjustmentType: AdjustmentType;
  quantity: number;
  date: string;
  remarks: string;
}

// BRD 6.3.1 item 13 audit history
export interface StockAdjustmentHistoryRow {
  id: number;
  movementDate: string;
  movementType: string;
  godown: number;
  godownName: string;
  oldStock: string;
  updatedStock: string;
  adjustedQty: string;
  remarks: string;
  updatedBy: string;
  updatedOn: string;
}

export interface StockTransferLine {
  id?: number;
  item: number;
  itemCode?: string;
  itemName?: string;
  quantity: number;
}

export interface StockTransfer {
  id: number;
  transferNumber: string;
  fromGodown: number;
  fromGodownName: string;
  toGodown: number;
  toGodownName: string;
  transferDate: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
  items: StockTransferLine[];
}

export interface StockTransferPayload {
  fromGodown: number;
  toGodown: number;
  transferDate: string;
  remarks: string;
  items: { item: number; quantity: number }[];
}
