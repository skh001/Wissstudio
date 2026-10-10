import { z } from "zod";

export const appointmentSchema = z.object({
  client_id: z.string().uuid().nullable(),
  service_id: z.string().uuid({ message: "Choose a service" }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Choose a time"),
  duration_minutes: z.coerce.number().int().min(5).max(600),
  status: z.enum(["pending", "confirmed", "completed", "cancelled"]),
  technician: z.string().max(60).nullable().optional(),
  french: z.boolean(),
  nail_art_count: z.coerce.number().int().min(0).max(20),
  complex_art_count: z.coerce.number().int().min(0).max(20),
  strass_count: z.coerce.number().int().min(0).max(500),
  discount: z.coerce.number().min(0),
  gift_card_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type AppointmentInput = z.infer<typeof appointmentSchema>;

export const completeSchema = z.object({
  payment_method: z.enum(["cash", "card", "transfer", "gift_card", "other"]),
  mark_paid: z.boolean(),
});
