import "server-only";
import { cache } from "react";
import { requireUser, unwrap } from "@/lib/action";
import type { IntegrationStatus, SalonSettings } from "@/types/domain";

/** Cached per request: the layout and pages share one settings fetch. */
export const getSettings = cache(async (): Promise<SalonSettings> => {
  const { supabase, user } = await requireUser();
  const { data } = await supabase.from("salon_settings").select("*").eq("owner_id", user.id).maybeSingle();
  if (data) return data as SalonSettings;
  // Account created before the bootstrap trigger existed: create the row now.
  return unwrap(await supabase.from("salon_settings").insert({ owner_id: user.id }).select("*").single()) as SalonSettings;
});

export async function updateSettings(patch: Partial<SalonSettings>) {
  const { supabase, user } = await requireUser();
  return unwrap(
    await supabase.from("salon_settings").update(patch).eq("owner_id", user.id).select("*").single(),
  ) as SalonSettings;
}

const PUBLIC_SETTING_KEYS = new Set([
  "import_external", "webhook_uri", "webhook_error", "webhook_state", "last_webhook_at", "last_pull_at", "last_sync_error", "channel_expiration",
]);

export async function listIntegrations(): Promise<IntegrationStatus[]> {
  const { supabase } = await requireUser();
  const { data } = await supabase.from("integrations").select("provider, account_email, connected_at, settings");
  // Only status fields reach the browser: no signing key, sync token or channel id.
  return ((data ?? []) as IntegrationStatus[]).map((i) => ({
    ...i,
    settings: Object.fromEntries(Object.entries(i.settings ?? {}).filter(([k]) => PUBLIC_SETTING_KEYS.has(k))),
  }));
}
