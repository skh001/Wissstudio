import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleCalendlyEvent, verifyCalendlySignature } from "@/features/integrations/calendly";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const ownerId = request.nextUrl.searchParams.get("owner");
  if (!ownerId || !/^[0-9a-f-]{36}$/i.test(ownerId)) return NextResponse.json({ error: "Unknown owner" }, { status: 400 });

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return NextResponse.json({ error: "Server not configured" }, { status: 503 });

  const raw = await request.text();
  const admin = createAdminClient();
  const { data: integ } = await admin.from("integrations").select("settings").eq("owner_id", ownerId).eq("provider", "calendly").maybeSingle();
  const key = (integ?.settings as { signing_key?: string } | null)?.signing_key ?? process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
  if (!key) return NextResponse.json({ error: "Not connected" }, { status: 404 });
  if (!verifyCalendlySignature(request.headers.get("calendly-webhook-signature"), raw, key)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  try {
    const body = JSON.parse(raw) as { event: string; payload: Parameters<typeof handleCalendlyEvent>[2] };
    await handleCalendlyEvent(ownerId, body.event, body.payload);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[calendly] webhook", e);
    // 500 makes Calendly retry later
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
