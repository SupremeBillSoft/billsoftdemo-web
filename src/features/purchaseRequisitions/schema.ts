// src/features/purchaseRequisitions/schema.ts

import { z } from "zod";

export const prItemRowSchema = z.object({
  item: z.number({ error: "Item is required" }),
  itemCode: z.string().optional(),
  description: z.string().optional().default(""),
  uom: z.string().optional().default(""),
  hsnSac: z.string().optional().default(""),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  deliveryDate: z.string().nullable().optional().default(null),
});
export type PRItemRow = z.infer<typeof prItemRowSchema>;

export const purchaseRequisitionSchema = z.object({
  prType: z.enum(["Item", "General"]).default("Item"),
  // Optional - BRD 6.5.1.1.2 allows a PR without a supplier name.
  supplier: z.number().nullable().default(null),
  raisedBy: z.string().optional().default(""),
  prDate: z.string().min(1, "PR date is required"),
  remarks: z.string().optional().default(""),
  items: z.array(prItemRowSchema).min(1, "At least one item is required"),
});

export type PurchaseRequisitionFormInput = z.input<typeof purchaseRequisitionSchema>;
export type PurchaseRequisitionFormValues = z.output<typeof purchaseRequisitionSchema>;
