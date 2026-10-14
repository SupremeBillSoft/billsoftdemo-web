// src/features/tax/schema.ts

import { z } from "zod";

export const taxSchema = z.object({
  taxCode: z.coerce.number().int().positive().optional(), // read-only, server-assigned
  taxType: z.enum(["GST", "VAT", "Sales Tax"]).default("GST"),
  taxName: z.string().min(1, "Tax Name is required").max(50),
  cgstPercentage: z.coerce.number().min(0).max(100).optional(),
  sgstPercentage: z.coerce.number().min(0).max(100).optional(),
  igstPercentage: z.coerce.number().min(0).max(100).optional(),
  cessPercentage: z.coerce.number().min(0).max(100).optional(),
  vatPercentage: z.coerce.number().min(0).max(100).optional(),
  salesTaxPercentage: z.coerce.number().min(0).max(100).optional(),
  status: z.enum(["Active", "Inactive"], { message: "Status is required" }).default("Active"),
});

export type TaxFormInput = z.input<typeof taxSchema>;
export type TaxFormValues = z.output<typeof taxSchema>;