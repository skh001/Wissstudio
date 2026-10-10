import "server-only";
import { requireUser, unwrap } from "@/lib/action";
import type {
  AppointmentProduct, AppointmentStatus, AppointmentWithRelations, GalleryItem, GiftCard, Invoice, Product,
} from "@/types/domain";

export const APPOINTMENT_SELECT =
  "*, client:clients(id, first_name, last_name, phone, avatar_url, is_vip), service:services(id, name, color, duration_minutes)";

export async function listAppointments(opts: { from?: string; to?: string; status?: AppointmentStatus[]; limit?: number; ascending?: boolean } = {}) {
  const { supabase } = await requireUser();
  let q = supabase.from("appointments").select(APPOINTMENT_SELECT).order("start_at", { ascending: opts.ascending ?? true });
  if (opts.from) q = q.gte("start_at", opts.from);
  if (opts.to) q = q.lt("start_at", opts.to);
  if (opts.status?.length) q = q.in("status", opts.status);
  if (opts.limit) q = q.limit(opts.limit);
  return unwrap(await q) as AppointmentWithRelations[];
}

export async function getAppointmentDetail(id: string) {
  const { supabase } = await requireUser();
  const [appt, products, photos, invoice] = await Promise.all([
    supabase.from("appointments").select(APPOINTMENT_SELECT).eq("id", id).maybeSingle(),
    supabase.from("appointment_products").select("*").eq("appointment_id", id),
    supabase.from("gallery_items").select("*").eq("appointment_id", id).order("created_at"),
    supabase.from("invoices").select("*").eq("appointment_id", id).maybeSingle(),
  ]);
  return {
    appointment: unwrap(appt) as AppointmentWithRelations | null,
    products: unwrap(products) as AppointmentProduct[],
    photos: unwrap(photos) as GalleryItem[],
    invoice: unwrap(invoice) as Invoice | null,
  };
}

/** Everything the appointment form needs, in one round trip. */
export async function getAppointmentFormOptions() {
  const { supabase, user } = await requireUser();
  const [clients, services, settings, giftCards, products] = await Promise.all([
    supabase.from("clients").select("id, first_name, last_name, phone, avatar_url, is_vip").order("first_name"),
    supabase.from("services").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("salon_settings")
      .select("price_french, price_nail_art, price_complex_art, price_strass, technicians, opening_hours")
      .eq("owner_id", user.id).single(),
    supabase.from("gift_cards").select("*").eq("is_active", true).gt("balance", 0),
    supabase.from("products").select("id, name, unit, quantity, min_quantity, purchase_price").order("name"),
  ]);
  return {
    clients: unwrap(clients) as AppointmentWithRelations["client"][],
    services: unwrap(services) as import("@/types/domain").Service[],
    prices: unwrap(settings) as {
      price_french: number; price_nail_art: number; price_complex_art: number; price_strass: number;
      technicians: string[]; opening_hours: import("@/types/domain").OpeningHours;
    },
    giftCards: unwrap(giftCards) as GiftCard[],
    products: unwrap(products) as Pick<Product, "id" | "name" | "unit" | "quantity" | "min_quantity" | "purchase_price">[],
  };
}
export type AppointmentFormOptions = Awaited<ReturnType<typeof getAppointmentFormOptions>>;
