// src/features/items/schema.ts

import { z } from "zod";

export const uomSchema = z
  .object({
    unitCode: z.string().min(1, "Unit Code is required").max(30),
    einvoiceUom: z.string().min(1, "E-Invoice UOM is required").max(30),
    unitName: z.string().min(1, "Unit Name is required").max(50),
    unitDescription: z.string().min(1, "Unit Description is required").max(50),
    unitStatus: z.enum(["Active", "Inactive"]).default("Active"),
    remarks: z.string().max(50).optional(),
    
  })

export type UomFormInput = z.input<typeof uomSchema>;
export type UomFormValues = z.output<typeof uomSchema>;
