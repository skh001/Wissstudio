import { z } from "zod";

export const productSchema = z.object({
  name: z.string().trim().min(2, "Enter a product name").max(120),
  category_id: z.string().uuid().nullable(),
  brand: z.string().max(80).nullable().optional(),
  supplier: z.string().max(80).nullable().optional(),
  purchase_price: z.coerce.number().min(0),
  unit: z.enum(["unit", "ml", "g"]),
  quantity: z.coerce.number().min(0),
  min_quantity: z.coerce.number().min(0),
  barcode: z.string().max(40).nullable().optional(),
  location: z.string().max(60).nullable().optional(),
  photo_url: z.string().url().nullable().optional(),
  is_favorite: z.boolean(),
  notes: z.string().max(500).nullable().optional(),
});
export type ProductInput = z.infer<typeof productSchema>;

export const adjustSchema = z.object({
  product_id: z.string().uuid("Choose a product"),
  mode: z.enum(["add", "remove", "set"]),
  quantity: z.coerce.number().min(0),
  reason: z.enum(["purchase", "adjustment", "loss", "return"]),
  note: z.string().max(200).optional(),
  log_expense: z.boolean(),
});
export type AdjustInput = z.infer<typeof adjustSchema>;
