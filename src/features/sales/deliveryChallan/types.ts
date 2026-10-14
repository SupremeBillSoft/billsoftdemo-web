// src/features/sales/deliveryChallan/types.ts - mirror of DeliveryChallanSerializer.

import type { ShipToValues } from "../shared/ShipToFields";

export type DcType = "Order" | "Direct" | "NonBillable";
export type DcPurpose = "Supply" | "JobWork" | "SaleOnApproval" | "Repair" | "Sample" | "Other";
export type DcStatus = "Open" | "Closed" | "Cancelled";

export interface DeliveryChallanLine {
  id?: number;
  soItem: number | null;
  item: number;
  itemCode?: string;
  description: string;
  uom: string;
  hsnSac: string;
  quantity: number | string;
  rejectionQty: number | string;
  rate: number | string;
  amount?: string;
  godown: number | null;
  godownName?: string | null;
  remarks: string;
  invoicedQty?: string;
  pendingInvoiceQty?: string;
  returnedQty?: string;
  soPendingQty?: string | null;
  _rowKey?: string;
}

export interface DeliveryChallan extends ShipToValues {
  id: number;
  dcNumber: string;
  dcDate: string;
  dcType: DcType;
  purpose: DcPurpose;
  taxNature: "Sales" | "Labour";
  customer: number;
  customerName: string;
  saleOrder: number | null;
  soNumber: string | null;
  customerPoNo: string;
  customerPoDate: string | null;
  kindAttn: string;
  toPlace: string;
  location: string;
  transportMode: string;
  vehicleNo: string;
  inwardDcNo: string;
  inwardDcDate: string | null;
  approxValue: string;
  returnable: boolean;
  goodsCategory: "Inputs" | "CapitalGoods";
  returnDueDate: string | null;
  status: DcStatus;
  cancelReason: string;
  remarks: string;
  items: DeliveryChallanLine[];
  invoiceStatus: "Non billable" | "Not invoiced" | "Partially invoiced" | "Invoiced";
  returnStatus: "Returned" | "Overdue" | "Partially returned" | "Awaiting return" | null;
  totalQuantity: string;
  createdBy?: string;
}

export interface InvoiceableChallan {
  id: number;
  dcNumber: string;
  dcDate: string;
  lines: DeliveryChallanLine[];
}

export const DC_TYPE_OPTIONS = [
  { value: "Order", label: "Order based" },
  { value: "Direct", label: "Direct" },
  { value: "NonBillable", label: "Non billable" },
];

// Why goods move without an invoice (GST Rule 55).
export const DC_PURPOSE_OPTIONS = [
  { value: "JobWork", label: "Job work" },
  { value: "SaleOnApproval", label: "Sale on approval" },
  { value: "Repair", label: "Repair / rework" },
  { value: "Sample", label: "Sample / exhibition" },
  { value: "Other", label: "Other" },
];

export const PURPOSE_LABEL: Record<DcPurpose, string> = {
  Supply: "Supply",
  JobWork: "Job work",
  SaleOnApproval: "Sale on approval",
  Repair: "Repair / rework",
  Sample: "Sample / exhibition",
  Other: "Other",
};

export const TRANSPORT_MODE_OPTIONS = ["Road", "Rail", "Air", "Ship", "Hand delivery", "Courier"].map((m) => ({
  value: m,
  label: m,
}));
