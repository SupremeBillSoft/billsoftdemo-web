// src/features/sales/shared/schema.ts
//
// Zod pieces shared by every priced sales form. Lines are loose objects so
// document-specific line fields (Sale Order drawing no., delivered qty...)
// ride along untouched.

import { useMemo } from "react";
import { z } from "zod";
import type { LineTaxContext } from "../../../lib/gst/lineTax";
import { priceDocument, type PricingOptions } from "./pricing";
import type { AdditionalCharge, PricedLine } from "./types";

export const pricedLineSchema = z.looseObject({
  id: z.number().optional(),
  item: z.number({ error: "Item is required" }),
  itemCode: z.string().optional(),
  description: z.string().optional().default(""),
  uom: z.string().optional().default(""),
  hsnSac: z.string().optional().default(""),
  quantity: z.coerce.number().positive("Quantity must be greater than 0"),
  rate: z.coerce.number().nonnegative("Rate must be 0 or more"),
  discountPercent: z.coerce.number().min(0).max(100, "Discount can't exceed 100%").default(0),
  discountAmount: z.coerce.number().nonnegative().default(0),
  tax: z.number().nullable().default(null),
});

export const chargeSchema = z.object({
  name: z.string().min(1, "Charge name is required"),
  amount: z.coerce.number().nonnegative(),
  tax: z.number().nullable().default(null),
});

export const customFieldSchema = z.object({ name: z.string(), value: z.string() });

export const pricedDocumentShape = {
  customer: z.number({ error: "Customer is required" }),
  placeOfSupply: z.string().optional().default(""),
  priceIncludesTax: z.boolean().default(false),
  docDiscountType: z.enum(["Percent", "Amount"]).default("Percent"),
  docDiscountValue: z.coerce.number().nonnegative().default(0),
  docDiscountBeforeTax: z.boolean().default(true),
  roundOffEnabled: z.boolean().default(true),
  adjustmentAmount: z.coerce.number().default(0),
  remarks: z.string().optional().default(""),
  customFields: z.array(customFieldSchema).default([]),
  charges: z.array(chargeSchema).default([]),
  items: z.array(pricedLineSchema).min(1, "At least one item is required"),
};

export const PRICED_DEFAULTS = {
  placeOfSupply: "",
  priceIncludesTax: false,
  docDiscountType: "Percent" as const,
  docDiscountValue: 0,
  docDiscountBeforeTax: true,
  roundOffEnabled: true,
  adjustmentAmount: 0,
  remarks: "",
  customFields: [],
  charges: [],
  items: [],
};

// Blank custom-field rows are noise - drop them before saving.
export function cleanCustomFields<T extends { customFields?: { name: string; value: string }[] }>(values: T): T {
  return { ...values, customFields: (values.customFields ?? []).filter((f) => f.name.trim()) };
}

interface PreviewInput {
  items?: Partial<PricedLine>[];
  charges?: Partial<AdditionalCharge>[];
  priceIncludesTax?: boolean;
  docDiscountType?: "Percent" | "Amount";
  docDiscountValue?: number | string;
  docDiscountBeforeTax?: boolean;
  roundOffEnabled?: boolean;
  adjustmentAmount?: number | string;
}

/** Live totals for the screen - same math the server runs on save. */
export function usePricedPreview(
  values: PreviewInput,
  buyerState: string,
  taxContext: LineTaxContext,
  extra: Pick<PricingOptions, "export" | "zeroRated"> = {}
) {
  const items = values.items ?? [];
  const charges = values.charges ?? [];
  return useMemo(
    () =>
      priceDocument(
        items.map((l) => ({
          quantity: l.quantity ?? 0,
          rate: l.rate ?? 0,
          discountPercent: l.discountPercent,
          discountAmount: l.discountAmount,
          tax: l.tax,
          isFree: !!(l as { isFree?: boolean }).isFree,
        })),
        charges.map((c) => ({ amount: c.amount ?? 0, tax: c.tax })),
        {
          buyerState,
          priceIncludesTax: values.priceIncludesTax,
          docDiscountType: values.docDiscountType,
          docDiscountValue: values.docDiscountValue,
          docDiscountBeforeTax: values.docDiscountBeforeTax,
          roundOffEnabled: values.roundOffEnabled,
          adjustmentAmount: values.adjustmentAmount,
          ...extra,
        },
        { sellerState: taxContext.sellerState, getTax: taxContext.getTax }
      ),
    // JSON keys keep the memo stable across react-hook-form re-renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      JSON.stringify(items),
      JSON.stringify(charges),
      values.priceIncludesTax,
      values.docDiscountType,
      values.docDiscountValue,
      values.docDiscountBeforeTax,
      values.roundOffEnabled,
      values.adjustmentAmount,
      buyerState,
      taxContext,
      extra.export,
      extra.zeroRated,
    ]
  );
}

/** Turns API line rows (decimal strings) into editable numbers. */
export function linesFromServer<T extends PricedLine>(lines: T[]): T[] {
  return lines.map((l) => ({
    ...l,
    quantity: Number(l.quantity),
    rate: Number(l.rate),
    discountPercent: Number(l.discountPercent),
    discountAmount: Number(l.discountAmount),
  }));
}

export function pricedFromServer<T extends Record<string, unknown>>(doc: T) {
  return {
    placeOfSupply: (doc.placeOfSupply as string) ?? "",
    priceIncludesTax: !!doc.priceIncludesTax,
    docDiscountType: (doc.docDiscountType as "Percent" | "Amount") ?? "Percent",
    docDiscountValue: Number(doc.docDiscountValue ?? 0),
    docDiscountBeforeTax: doc.docDiscountBeforeTax !== false,
    roundOffEnabled: doc.roundOffEnabled !== false,
    adjustmentAmount: Number(doc.adjustmentAmount ?? 0),
    remarks: (doc.remarks as string) ?? "",
    customFields: (doc.customFields as { name: string; value: string }[]) ?? [],
    charges: ((doc.charges as AdditionalCharge[]) ?? []).map((c) => ({
      name: c.name,
      amount: Number(c.amount),
      tax: c.tax ?? null,
    })),
    items: linesFromServer((doc.items as PricedLine[]) ?? []) as (PricedLine & Record<string, unknown>)[],
  };
}
