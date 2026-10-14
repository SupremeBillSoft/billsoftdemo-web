// src/features/debitNotes/schema.ts

import { z } from "zod";

export const dnItemRowSchema = z.object({
  invoiceItem: z.number().nullable().default(null),
  item: z.number({ error: "Item is required" }),
  itemCode: z.string().optional(),
  description: z.string().optional().default(""),
  uom: z.string().optional().default(""),
  hsnSac: z.string().optional().default(""),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().nonnegative("Rate must be 0 or more"),
  tax: z.number().nullable().default(null),
});
export type DNItemRow = z.output<typeof dnItemRowSchema>;

export const debitNoteSchema = z.object({
  purchaseInvoice: z.number().nullable().default(null),
  supplier: z.number({ error: "Supplier is required" }),
  debitNoteDate: z.string().min(1, "Debit Note date is required"),
  reason: z.string().optional().default(""),
  remarks: z.string().optional().default(""),
  amountRefunded: z.coerce.number().nonnegative("Refund amount cannot be negative").default(0),
  items: z.array(dnItemRowSchema).min(1, "At least one item is required"),
});

export type DebitNoteFormInput = z.input<typeof debitNoteSchema>;
export type DebitNoteFormValues = z.output<typeof debitNoteSchema>;
