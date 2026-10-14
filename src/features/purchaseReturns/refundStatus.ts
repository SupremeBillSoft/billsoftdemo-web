// src/features/purchaseReturns/refundStatus.ts
//
// Refund statuses shared by Purchase Return and Debit Note (BRD 6.5.4 /
// 6.5.5). The backend derives them from amountRefunded vs netAmount.

export const REFUND_STATUS_COLOR: Record<string, string> = {
  Unpaid: "red",
  "Partially Refunded": "gold",
  Refunded: "green",
  Cancelled: "default",
};

export const REFUND_STATUS_OPTIONS = [
  { value: "Unpaid", label: "Unpaid" },
  { value: "Partially Refunded", label: "Partially Refunded" },
  { value: "Refunded", label: "Refunded" },
];
