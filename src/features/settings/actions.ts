"use server";

import { revalidatePath } from "next/cache";
import { requireUser, runAction, unwrap, AppError } from "@/lib/action";
import { updateSettings } from "./repository";
import { businessSchema, salonSchema, type BusinessInput, type SalonInput } from "./schemas";

export async function saveSalonSettings(input: SalonInput) {
  return runAction(async () => {
    const data = salonSchema.parse(input);
    await updateSettings({ ...data, email: data.email || null } as never);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function saveBusinessSettings(input: BusinessInput) {
  return runAction(async () => {
    await updateSettings(businessSchema.parse(input) as never);
    revalidatePath("/", "layout");
    return null;
  });
}

export async function loadDemoData() {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    const { error } = await supabase.rpc("seed_demo_data", { p_owner: user.id });
    if (error) throw new AppError(error.message.includes("empty account")
      ? "Demo data can only be added to an account with no clients yet."
      : error.message);
    revalidatePath("/", "layout");
    return null;
  });
}

const BACKUP_TABLES = [
  "salon_settings", "services", "clients", "appointments", "appointment_products", "stock_categories",
  "products", "consumption_rules", "stock_movements", "expenses", "invoices", "gift_cards",
  "gallery_items", "reviews",
] as const;

/** Full JSON backup of every table the owner can read. */
export async function exportBackup() {
  return runAction(async () => {
    const { supabase } = await requireUser();
    const entries = await Promise.all(
      BACKUP_TABLES.map(async (t) => [t, unwrap(await supabase.from(t).select("*").limit(50000))] as const),
    );
    return JSON.stringify({ app: "WissNails Studio", version: 1, exported_at: new Date().toISOString(), data: Object.fromEntries(entries) }, null, 2);
  });
}

export async function disconnectIntegration(provider: "google" | "calendly") {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    if (provider === "google" && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const { stopGoogleWatch } = await import("@/features/integrations/google-calendar");
      await stopGoogleWatch(user.id);
    }
    unwrap(await supabase.from("integrations").delete().eq("provider", provider).select());
    revalidatePath("/settings");
    return null;
  });
}
