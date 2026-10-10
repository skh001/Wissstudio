import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(6, "At least 6 characters"),
  remember: z.boolean(),
});
export const signUpSchema = z.object({
  name: z.string().trim().min(1, "Enter your first name").max(40),
  email: z.string().trim().email("Enter a valid email"),
  password: z.string().min(8, "At least 8 characters"),
});
export const forgotSchema = z.object({ email: z.string().trim().email("Enter a valid email") });
export const resetSchema = z.object({
  password: z.string().min(8, "At least 8 characters"),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, { message: "The passwords don't match", path: ["confirm"] });

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
