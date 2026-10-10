import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { pullGoogleChanges } from "@/features/integrations/google-calendar";

export const dynamic = "force-dynamic";

/** Google Calendar push notification: "something changed" → run an incremental pull. */
export async function POST(request: NextRequest) {
  const ownerId = request.headers.get("x-goog-channel-token");
  const channelId = request.headers.get("x-goog-channel-id");
  const state = request.headers.get("x-goog-resource-state");
  if (!ownerId || !channelId) return new NextResponse(null, { status: 400 });
  if (state === "sync") return new NextResponse(null, { status: 200 }); // handshake
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return new NextResponse(null, { status: 503 });

  const { data } = await createAdminClient().from("integrations").select("settings")
    .eq("owner_id", ownerId).eq("provider", "google").maybeSingle();
  if ((data?.settings as { channel_id?: string } | null)?.channel_id !== channelId) return new NextResponse(null, { status: 404 });

  try { await pullGoogleChanges(ownerId); } catch (e) { console.error("[google] webhook pull", e); }
  return new NextResponse(null, { status: 200 });
}
