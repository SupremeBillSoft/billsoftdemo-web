// src/features/purchaseInvoices/schema.ts

import { z } from "zod";

export const piItemRowSchema = z.object({
  poItem: z.number().nullable().default(null),
  item: z.number({ error: "Item is required" }),
  itemCode: z.string().optional(),
  description: z.string().optional().default(""),
  uom: z.string().optional().default(""),
  hsnSac: z.string().optional().default(""),
  invoicedQty: z.coerce.number().positive("Invoiced qty must be greater than 0"),
  rate: z.coerce.number().nonnegative("Rate must be 0 or more"),
  discountPercent: z.coerce.number().min(0).max(100, "Discount can't exceed 100%").default(0),
  packForwardAmount: z.coerce.number().nonnegative().default(0),
  freightAmount: z.coerce.number().nonnegative().default(0),
  tax: z.number().nullable().default(null),
  godown: z.number().nullable().default(null),
  secondaryUom: z.string().optional().default(""),
  conversionRate: z.coerce.number().positive().nullable().default(null),
  remarks: z.string().optional().default(""),
});
export type PIItemRow = z.output<typeof piItemRowSchema>;

export const purchaseInvoiceSchema = z
  .object({
    invoiceType: z.enum(["PO", "Freight"]).default("PO"),
    purchaseOrder: z.number().nullable().default(null),
    supplier: z.number({ error: "Supplier is required" }),
    invoiceDate: z.string().min(1, "Invoice date is required"),
    supplierInvoiceNo: z.string().min(1, "Party bill number is required"),
    supplierInvoiceDate: z.string().min(1, "Party bill date is required"),
    inwardNo: z.string().optional().default(""),
    inwardDate: z.string().nullable().optional().default(null),
    purchaseType: z.string().optional().default(""),
    dueDate: z.string().nullable().optional().default(null),
    paymentTerms: z.string().optional().default(""),
    remarks: z.string().optional().default(""),
    items: z.array(piItemRowSchema).min(1, "At least one item is required"),
  })
  .refine((v) => v.invoiceType !== "PO" || v.purchaseOrder != null, {
    path: ["purchaseOrder"],
    message: "Select the Approved Purchase Order to invoice",
  });

export type PurchaseInvoiceFormInput = z.input<typeof purchaseInvoiceSchema>;
export type PurchaseInvoiceFormValues = z.output<typeof purchaseInvoiceSchema>;
