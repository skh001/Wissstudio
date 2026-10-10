import { z } from "zod";

const time = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");
const day = z.object({ open: time, close: time, closed: z.boolean() });

export const salonSchema = z.object({
  name: z.string().min(1, "Enter the salon name").max(80),
  owner_name: z.string().min(1, "Enter your first name").max(40),
  logo_url: z.string().url().nullable().optional(),
  address: z.string().max(200).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Enter a valid email").or(z.literal("")).optional().nullable(),
  siret: z.string().max(20).optional().nullable(),
  opening_hours: z.object({ mon: day, tue: day, wed: day, thu: day, fri: day, sat: day, sun: day }),
  socials: z.object({
    instagram: z.string().max(80).optional(),
    tiktok: z.string().max(80).optional(),
    facebook: z.string().max(200).optional(),
    website: z.string().max(200).optional(),
  }),
  google_place_id: z.string().max(200).optional().nullable(),
});

export const businessSchema = z.object({
  currency: z.enum(["EUR", "CHF", "GBP", "USD", "CAD", "MAD"]),
  language: z.enum(["fr", "en"]),
  theme: z.enum(["light", "dark", "system"]),
  tax_rate: z.coerce.number().min(0).max(100),
  tax_label: z.string().min(1).max(30),
  vat_applicable: z.boolean(),
  monthly_objective: z.coerce.number().min(0),
  invoice_prefix: z.string().min(1).max(8),
  price_french: z.coerce.number().min(0),
  price_nail_art: z.coerce.number().min(0),
  price_complex_art: z.coerce.number().min(0),
  price_strass: z.coerce.number().min(0),
  loyalty_points_per_euro: z.coerce.number().min(0).max(100),
  loyalty_reward_threshold: z.coerce.number().int().min(1),
  loyalty_reward_value: z.coerce.number().min(0),
  inactive_after_days: z.coerce.number().int().min(14).max(730),
  technicians: z.array(z.string().min(1)).min(1),
});

export type SalonInput = z.infer<typeof salonSchema>;
export type BusinessInput = z.infer<typeof businessSchema>;
