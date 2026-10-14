// src/features/branch/schema.ts

import { z } from "zod";

export const branchSchema = z
  .object({
    branchCode: z.string().min(1, "Branch Code is required").max(30),
    branchName: z.string().min(1, "Branch Name is required").max(50),
    branchType: z.string().max(50).optional(),
    registrationNo: z.string().max(50).optional(),
    gstin: z.string().max(50).optional(),
    pan: z.string().max(50).optional(),
    status: z.enum(["Active", "Inactive"]).default("Active"),
    remarks: z.string().max(50).optional(),
    addressLine1: z.string().min(1, "Address Line 1 is required").max(50),
    addressLine2: z.string().max(50).optional(),
    country: z.string().min(1, "Country is required").max(50),
    state: z.string().min(1, "State is required").max(50),
    city: z.string().min(1, "City is required").max(50),
    areaLocality: z.string().max(50).optional(),
    pincode: z.string().max(10).optional(),
    mobileNo: z.string().max(15).optional(),
    // Optional: an empty box is fine, anything typed must be a valid email.
    email: z.string().email("Invalid email address").max(50).optional().or(z.literal("")),
    
  })
  
 
export type BranchFormInput = z.input<typeof branchSchema>;
export type BranchFormValues = z.output<typeof branchSchema>;