import { z } from "zod";

export const expenseSchema = z.object({
  category: z.enum(["products", "furniture", "rent", "electricity", "advertising", "training", "subscriptions", "equipment", "miscellaneous"]),
  label: z.string().trim().min(2, "Describe the expense").max(120),
  amount: z.coerce.number().positive("Enter an amount above 0"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  supplier: z.string().max(80).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
  receipt_url: z.string().url().nullable().optional(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;

export const giftCardSchema = z.object({
  code: z.string().trim().min(4).max(30),
  initial_amount: z.coerce.number().positive("Enter an amount above 0"),
  purchaser_name: z.string().max(80).nullable().optional(),
  recipient_name: z.string().max(80).nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  expires_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).nullable().optional(),
});
export type GiftCardInput = z.infer<typeof giftCardSchema>;
