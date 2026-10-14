import { z } from "zod";

export const hsnSchema = z.object({
  hsnCode: z.string().min(1, "HSN Code is required").max(8),
  hsnName: z.string().min(1, "HSN Name is required").max(100),
  itemType: z.string().max(50).optional(),
  productCategory: z.string().max(50).optional(),
  taxType: z.string().max(50).optional(),
  status: z.enum(["Active", "Inactive"], { message: "Status is required" }).default("Active"),
});

export type HSNFormInput = z.input<typeof hsnSchema>;
export type HSNFormValues = z.output<typeof hsnSchema>;