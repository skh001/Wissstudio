import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().min(2, "Enter a name").max(80),
  description: z.string().max(400).optional().nullable(),
  category: z.string().min(1).max(40),
  price: z.coerce.number().min(0, "Price can't be negative"),
  duration_minutes: z.coerce.number().int().min(5, "At least 5 minutes").max(600),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  is_active: z.boolean(),
});
export type ServiceInput = z.infer<typeof serviceSchema>;

export const ruleSchema = z.object({
  service_id: z.string().uuid().nullable(),
  addon: z.enum(["french", "nail_art", "complex_art", "strass"]).nullable(),
  product_id: z.string().uuid("Choose a product"),
  quantity: z.coerce.number().positive("Enter a quantity above 0"),
}).refine((r) => (r.service_id ? !r.addon : !!r.addon), { message: "Choose a service or an add-on" });
export type RuleInput = z.infer<typeof ruleSchema>;
