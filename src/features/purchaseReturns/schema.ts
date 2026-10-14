// src/features/purchaseReturns/schema.ts

import { z } from "zod";

export const pretItemRowSchema = z.object({
  invoiceItem: z.number({ error: "Source invoice line is required" }),
  item: z.number({ error: "Item is required" }),
  itemCode: z.string().optional(),
  description: z.string().optional().default(""),
  uom: z.string().optional().default(""),
  hsnSac: z.string().optional().default(""),
  returnedQty: z.coerce.number().positive("Returned qty must be greater than 0"),
  rate: z.coerce.number().nonnegative("Rate must be 0 or more"),
  tax: z.number().nullable().default(null),
  godown: z.number().nullable().default(null),
});
export type PRetItemRow = z.infer<typeof pretItemRowSchema>;

export const purchaseReturnSchema = z.object({
  purchaseInvoice: z.number({ error: "Source Purchase Invoice is required" }),
  supplier: z.number({ error: "Supplier is required" }),
  returnDate: z.string().min(1, "Return date is required"),
  reason: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  amountRefunded: z.coerce.number().nonnegative("Refund amount cannot be negative").default(0),
  items: z.array(pretItemRowSchema).min(1, "At least one item is required"),
});

export type PurchaseReturnFormInput = z.input<typeof purchaseReturnSchema>;
export type PurchaseReturnFormValues = z.output<typeof purchaseReturnSchema>;
