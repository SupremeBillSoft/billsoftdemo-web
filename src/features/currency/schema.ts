import { z } from "zod";

export const currencySchema = z.object({
  currencyCode: z.string().min(1, "Currency is required"),
  currencyName: z.string().min(1),
  symbol: z.string().min(1),
  majorUnitName: z.string().min(1),
  majorUnitNamePlural: z.string().min(1),
  minorUnitName: z.string().optional().default(""),
  minorUnitNamePlural: z.string().optional().default(""),
  decimalPlaces: z.coerce.number().int().min(0).max(4),
  symbolPosition: z.enum(["Prefix", "Suffix"]).default("Prefix"),
  status: z.enum(["Active", "Inactive"]).default("Active"),
});

export type CurrencyFormInput = z.input<typeof currencySchema>;
export type CurrencyFormValues = z.output<typeof currencySchema>;