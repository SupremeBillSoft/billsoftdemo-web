// src/features/Employee/schema.ts

import { z } from "zod";


// ---------- Employee schema ----------

export const EmployeeSchema = z
  .object({
    EmployeeCode: z.string().min(1, "Employee Code is required").max(20),
    EmployeeName: z.string().min(1, "Employee Name is required").max(100),    
    Department: z.string().max(50).optional(),
    Designation: z.string().max(50).optional(),
    Address: z.string().max(200).optional(),
    MobileNumber: z.string().max(15).regex(/^\d*$/, "Digits only").optional(),
    Qualification: z.string().max(50).optional(),
    DateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    DateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    BloodGroup: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]).optional(),
    Status: z.enum(["Active", "Inactive"], { message: "Status is required" }),
  })

export type EmployeeFormInput = z.input<typeof EmployeeSchema>;
export type EmployeeFormValues = z.output<typeof EmployeeSchema>;   
    
  