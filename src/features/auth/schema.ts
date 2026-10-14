import { z } from "zod";

export const loginSchema = z.object({
  userId: z.string()
    .min(1, "User ID required")
    .min(5, "User ID must be at least 5 characters")
    .max(10, "User ID cannot exceed 10 characters")
    .regex(/^\S+$/, "User ID cannot contain spaces"),
  password: z.string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;