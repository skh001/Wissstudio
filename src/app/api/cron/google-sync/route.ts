import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoSyncGoogle, registerGoogleWatch } from "@/features/integrations/google-calendar";
import { autoSyncCalendly } from "@/features/integrations/calendly";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Background sync for when the app isn't open: polls Calendly (every 5 min without a working webhook,
 * every 30 min otherwise) and Google, and renews Google watch channels before they expire (~7 days).
 * Throttled per account, so it is safe at any schedule (daily on Vercel Hobby, every 5 min on Pro).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not set" }, { status: 503 });
  }
  const { data: rows, error } = await createAdminClient().from("integrations").select("owner_id, provider, settings");
  if (error) return NextResponse.json({ error: `Supabase: ${error.message}` }, { status: 500 });
  const results: { owner: string; provider: string; changed?: number; error?: string }[] = [];
  for (const row of rows ?? []) {
    try {
      let changed = 0;
      if (row.provider === "google") {
        changed = (await autoSyncGoogle(row.owner_id)).changed;
        const exp = Number((row.settings as { channel_expiration?: number }).channel_expiration ?? 0);
        if (exp - Date.now() < 2 * 86400_000) await registerGoogleWatch(row.owner_id);
      } else if (row.provider === "calendly") {
        changed = (await autoSyncCalendly(row.owner_id)).changed;
      }
      results.push({ owner: row.owner_id, provider: row.provider, changed });
    } catch (e) {
      results.push({ owner: row.owner_id, provider: row.provider, error: (e as Error).message });
    }
  }
  return NextResponse.json({ synced: results.length, results });
}
