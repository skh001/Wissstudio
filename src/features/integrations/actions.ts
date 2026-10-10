"use server";

import { revalidatePath } from "next/cache";
import { requireUser, runAction, AppError } from "@/lib/action";
import { createAdminClient } from "@/lib/supabase/admin";
import { connectCalendly, disconnectCalendlyWebhook, importCalendlyBooking, pullCalendlyEvents } from "./calendly";
import { pullGoogleChanges } from "./google-calendar";

function revalidateBookings() {
  for (const p of ["/dashboard", "/calendar", "/appointments", "/clients", "/booking"]) revalidatePath(p);
}

function requireServiceRole() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) throw new AppError("Add SUPABASE_SERVICE_ROLE_KEY to the environment first.");
}

export async function connectCalendlyAction(token: string) {
  return runAction(async () => {
    const { user } = await requireUser();
    requireServiceRole();
    if (token.trim().length < 20) throw new AppError("Paste the full personal access token from Calendly.");
    const res = await connectCalendly(user.id, token.trim());
    revalidatePath("/settings");
    revalidateBookings();
    return res;
  });
}

/** Pulls every Calendly booking (works without webhooks, on any Calendly plan). */
export async function syncCalendlyNow() {
  return runAction(async () => {
    const { user } = await requireUser();
    requireServiceRole();
    const changed = await pullCalendlyEvents(user.id);
    revalidateBookings();
    return { changed };
  });
}

/** Called by the embedded booking widget right after a booking, so it appears without waiting for the webhook. */
export async function importCalendlyBookingAction(eventUri: string, inviteeUri: string) {
  return runAction(async () => {
    const { user } = await requireUser();
    requireServiceRole();
    const result = await importCalendlyBooking(user.id, eventUri, inviteeUri);
    revalidateBookings();
    return { result };
  });
}

export async function disconnectCalendlyAction() {
  return runAction(async () => {
    const { supabase, user } = await requireUser();
    await disconnectCalendlyWebhook(user.id);
    await supabase.from("integrations").delete().eq("provider", "calendly");
    revalidatePath("/settings");
    return null;
  });
}

export async function syncGoogleNow() {
  return runAction(async () => {
    const { user } = await requireUser();
    const changed = await pullGoogleChanges(user.id);
    revalidatePath("/calendar");
    revalidatePath("/appointments");
    return { changed };
  });
}

export async function setGoogleImportExternal(value: boolean) {
  return runAction(async () => {
    const { user } = await requireUser();
    const admin = createAdminClient();
    const { data } = await admin.from("integrations").select("settings").eq("owner_id", user.id).eq("provider", "google").single();
    await admin.from("integrations").update({ settings: { ...(data?.settings ?? {}), import_external: value } })
      .eq("owner_id", user.id).eq("provider", "google");
    revalidatePath("/settings");
    return null;
  });
}
