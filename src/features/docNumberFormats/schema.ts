// src/features/docNumberFormats/schema.ts

import { z } from "zod";

export const docNumberFormatSchema = z.object({
  doc: z.string().trim().min(1, "Document is required"),
  docType: z.string().optional().default(""),
  docSubType: z.string().optional().default(""),
  prefix: z.string().max(10).optional().default(""),
  prefixSeparator: z.string().max(10).optional().default(""),
  docNo: z.coerce.number().int().min(1, "Doc No must be 1 or more").default(1),
  formatDigit: z.coerce.number().int().min(1).max(8).default(4),
  docSeparator: z.string().max(10).optional().default(""),
  midText: z.string().max(10).optional().default(""),
  midTextSeparator: z.string().max(10).optional().default(""),
  finYear1: z.union([z.literal(2), z.literal(4)]).nullable().optional().default(null),
  finYear2: z.union([z.literal(2), z.literal(4)]).nullable().optional().default(null),
  yearSeparator: z.string().max(10).optional().default(""),
  suffix: z.string().max(10).optional().default(""),
  suffixSeparator: z.string().max(10).optional().default(""),
  isYearFirst: z.boolean().default(false),
  isActive: z.boolean().default(true),
  fromDate: z.string().min(1, "From date is required"),
});

export type DocNumberFormatFormInput = z.input<typeof docNumberFormatSchema>;
export type DocNumberFormatFormValues = z.output<typeof docNumberFormatSchema>;

export const startNewVersionSchema = z.object({
  fromDate: z.string().min(1, "From date is required"),
});
export type StartNewVersionFormValues = z.infer<typeof startNewVersionSchema>;
