// src/features/purchaseOrders/schema.ts

import { z } from "zod";

export const poItemRowSchema = z.object({
  prItem: z.number().nullable().default(null),
  prNumber: z.string().nullable().optional(), // display-only
  prPendingQty: z.number().optional(), // display-only: cap for a PR-sourced line
  item: z.number({ error: "Item is required" }),
  itemCode: z.string().optional(),
  description: z.string().optional().default(""),
  uom: z.string().optional().default(""),
  hsnSac: z.string().optional().default(""),
  orderQty: z.coerce.number().positive("Order qty must be greater than 0"),
  rate: z.coerce.number().nonnegative("Rate must be 0 or more"),
  discountPercent: z.coerce.number().min(0).max(100, "Discount can't exceed 100%").default(0),
  packForwardAmount: z.coerce.number().nonnegative().default(0),
  freightAmount: z.coerce.number().nonnegative().default(0),
  tax: z.number().nullable().default(null),
  notes: z.string().optional().default(""),
  deliveryDate: z.string().nullable().optional().default(null),
});
export type POItemRow = z.output<typeof poItemRowSchema>;

export const purchaseOrderSchema = z.object({
  supplier: z.number({ error: "Supplier is required" }),
  poDate: z.string().min(1, "PO date is required"),
  raisedBy: z.string().optional().default(""),
  quotationNo: z.string().optional().default(""),
  quotationDate: z.string().nullable().optional().default(null),
  validityDate: z.string().nullable().optional().default(null),
  kindAttn: z.string().optional().default(""),
  otherReference: z.string().optional().default(""),
  deliveryTo: z.string().optional().default(""),
  delivery: z.string().optional().default(""),
  terms: z.string().optional().default(""),
  paymentTerms: z.string().optional().default(""),
  currencyCode: z.string().optional().default(""),
  dispatchDetails: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  items: z.array(poItemRowSchema).min(1, "At least one item is required"),
});

export type PurchaseOrderFormInput = z.input<typeof purchaseOrderSchema>;
export type PurchaseOrderFormValues = z.output<typeof purchaseOrderSchema>;
