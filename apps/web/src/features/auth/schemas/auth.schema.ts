import { z } from "zod";

/**
 * Roles selectable via public registration. Admin is deliberately excluded —
 * administrator accounts are provisioned manually by an existing admin
 * (see also the defense-in-depth check in application/auth.usecases.ts).
 */
export const ROLE_OPTIONS = ["customer", "venue_owner", "event_coordinator", "supplier"] as const;

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number");

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name").max(120),
    email: z.string().trim().toLowerCase().email("Enter a valid email address"),
    password: passwordSchema,
    confirmPassword: z.string(),
    role: z.enum(ROLE_OPTIONS, { errorMap: () => ({ message: "Select an account type" }) }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, "Enter your full name").max(120),
  phone: z
    .string()
    .trim()
    .regex(/^(\+63|0)9\d{9}$/, "Enter a valid PH mobile number (e.g. 09171234567)")
    .optional()
    .or(z.literal("")),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
