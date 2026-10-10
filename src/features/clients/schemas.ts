import { z } from "zod";

const optionalText = (max: number) => z.string().max(max).optional().nullable();

export const clientSchema = z.object({
  first_name: z.string().trim().min(1, "Enter a first name").max(60),
  last_name: z.string().trim().max(60).default(""),
  phone: optionalText(30),
  email: z.string().trim().email("Enter a valid email").or(z.literal("")).optional().nullable(),
  instagram: optionalText(60),
  birthday: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional().nullable(),
  notes: optionalText(2000),
  allergies: optionalText(500),
  favorite_color: optionalText(60),
  favorite_shape: optionalText(40),
  favorite_length: optionalText(40),
  favorite_style: optionalText(40),
  preferred_technician: optionalText(60),
  avatar_url: z.string().url().nullable().optional(),
  is_favorite: z.boolean().default(false),
  is_vip: z.boolean().default(false),
  tags: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
});

export type ClientInput = z.input<typeof clientSchema>;
