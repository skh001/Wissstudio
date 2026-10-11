import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Provider = "google" | "calendly";

/**
 * Merges `patch` into integrations.settings without overwriting keys written concurrently
 * (webhook, cron and in-app sync all record timestamps). Uses the `merge_integration_settings`
 * function; falls back to read-merge-write if that migration isn't applied yet.
 */
export async function patchIntegrationSettings(ownerId: string, provider: Provider, patch: Record<string, unknown>) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("merge_integration_settings", { p_owner: ownerId, p_provider: provider, p_patch: patch });
  if (!error) return;
  const { data } = await admin.from("integrations").select("settings").eq("owner_id", ownerId).eq("provider", provider).maybeSingle();
  if (!data) return;
  await admin.from("integrations")
    .update({ settings: { ...((data.settings as Record<string, unknown>) ?? {}), ...patch } })
    .eq("owner_id", ownerId).eq("provider", provider);
}
