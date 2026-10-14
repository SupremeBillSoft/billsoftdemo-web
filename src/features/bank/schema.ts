// src/features/bank/schema.ts — was incorrectly headed "parties/schema.ts", confirming your note that this must be its own standalone feature

import { z } from "zod";

export const bankSchema = z.object({
  bankCode: z
    .string()
    .min(1, "Bank Code is required")
    .max(10)
    .regex(/^[a-zA-Z0-9]*$/, "Bank Code must be alphanumeric"),
  bankName: z.string().min(1, "Bank Name is required").max(50),
  branchName: z.string().max(50).optional(),
  address: z.string().max(150).optional(),
  accountNo: z.string().min(1, "Account No is required").max(50),
  accountType: z.enum(["Current", "Savings"]).optional(),
  ifscCode: z.string().max(20).optional(),
  micrCode: z.string().max(20).optional(),
  remarks: z.string().max(100).optional(),
  openingBalance: z.coerce
    .number()
    .min(0, "Opening Balance cannot be negative")
    .optional(),
  status: z.enum(["Active", "Inactive"], { message: "Status is required" }),
});

export type BankFormInput = z.input<typeof bankSchema>;
export type BankFormValues = z.output<typeof bankSchema>;
