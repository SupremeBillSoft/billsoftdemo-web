// src/features/items/schema.ts

import { z } from "zod";

const customFieldRowSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Text"), name: z.string().min(1, "Custom Name is required").max(50), value: z.string().max(50).optional() }),
  z.object({ type: z.literal("Date"), name: z.string().min(1, "Custom Name is required").max(50), value: z.string().optional() }),
  z.object({ type: z.literal("Float"), name: z.string().min(1, "Custom Name is required").max(50), value: z.coerce.number().optional() }),
]);

// one-line: THE plain object schema, unrefined — this is what .pick() works
// against. Exported so quickAddItemSchema (and any future partial-form
// schema) can pick fields from it without fighting Zod's refinement rule.
export const itemBaseSchema = z.object({
  itemCode: z.string().min(1, "Item Code is required").max(50),
  itemName: z.string().min(1, "Item Name is required").max(50),
  itemType: z.enum(["Product", "Service"]).default("Product"),
  itemDescription: z.string().max(150).optional(),
  itemCategory: z.string().max(50).optional(),
  brand: z.string().max(50).optional(),
  itemStatus: z.enum(["Active", "Inactive"]).default("Active"),
  purchaseUom: z.string().max(10).optional(),
  billingUom: z.string().min(1, "Billing UOM is required").max(10),
  perPurchaseUom: z.coerce.number().min(0).optional(),
  hsnCode: z.string().max(10).optional(),
  taxType: z.string().max(20).optional(),
  purchasePrice: z.coerce.number().min(0).optional(),
  sellingPrice: z.coerce.number().min(0).optional(),
  mrp: z.coerce.number().min(0).optional(),
  wholesaleDiscount: z.coerce.number().min(0).max(100).optional(),
  retailDiscount: z.coerce.number().min(0).max(100).optional(),
  memberDiscount: z.coerce.number().min(0).max(100).optional(),
  recipeCost: z.coerce.number().min(0).optional(),
  dineInPrice: z.coerce.number().min(0).optional(),
  takeawayPrice: z.coerce.number().min(0).optional(),
  deliveryPrice: z.coerce.number().min(0).optional(),
  perUnitWeight: z.coerce.number().min(0).optional(),
  packingQty: z.coerce.number().int().min(0).optional(),
  reorderLevel: z.coerce.number().min(0).optional(),
  drawingNo: z.string().max(50).optional(),
  procurementDays: z.coerce.number().int().min(0).optional(),
  shortName: z.string().max(10).optional(),
  customFields: z.array(customFieldRowSchema).default([]),
});

// one-line: itemSchema = the base object PLUS the cross-field validation —
// this is what Item Master's real Create/Edit form uses. quickAddItemSchema
// never sees this one, only the base.
export const itemSchema = itemBaseSchema.superRefine((data, ctx) => {
  const counts = data.customFields.reduce<Record<string, number>>((acc, f) => {
    acc[f.type] = (acc[f.type] ?? 0) + 1;
    return acc;
  }, {});
  if ((counts.Text ?? 0) > 6) ctx.addIssue({ code: "custom", path: ["customFields"], message: "Maximum 6 Text custom fields allowed" });
  if ((counts.Date ?? 0) > 2) ctx.addIssue({ code: "custom", path: ["customFields"], message: "Maximum 2 Date custom fields allowed" });
  if ((counts.Float ?? 0) > 2) ctx.addIssue({ code: "custom", path: ["customFields"], message: "Maximum 2 Float custom fields allowed" });
  if (data.customFields.length > 10) ctx.addIssue({ code: "custom", path: ["customFields"], message: "Maximum 10 custom fields allowed" });
});

export type ItemFormInput = z.input<typeof itemSchema>;
export type ItemFormValues = z.output<typeof itemSchema>;
export type CustomFieldRow = z.infer<typeof customFieldRowSchema>;

// one-line: picks from itemBaseSchema (unrefined), not itemSchema — this is
// the actual fix. The custom-field cap check doesn't apply to a 3-field
// quick-add form anyway, since it never touches customFields at all.
export const quickAddItemSchema = itemBaseSchema.pick({ itemCode: true, itemName: true, billingUom: true });
export type QuickAddItemValues = z.infer<typeof quickAddItemSchema>;