import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeGoogleCode, pullGoogleChanges, registerGoogleWatch } from "@/features/integrations/google-calendar";

// Pushes upcoming appointments and runs the first sync: give it time.
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const back = (status: string) => {
    const res = NextResponse.redirect(`${origin}/settings?tab=integrations&google=${status}`);
    res.cookies.delete("wn_google_state");
    return res;
  };

  const state = searchParams.get("state");
  const code = searchParams.get("code");
  if (searchParams.get("error")) return back("denied");
  if (!code || !state || state !== request.cookies.get("wn_google_state")?.value) return back("invalid");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  try {
    const tokens = await exchangeGoogleCode(code);
    const admin = createAdminClient();
    const { data: existing } = await admin.from("integrations").select("refresh_token, settings").eq("owner_id", user.id).eq("provider", "google").maybeSingle();
    await admin.from("integrations").upsert({
      owner_id: user.id,
      provider: "google",
      access_token: tokens.access_token,
      // Google only returns a refresh token on first consent: keep the previous one otherwise.
      refresh_token: tokens.refresh_token ?? existing?.refresh_token ?? null,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      account_email: tokens.email,
      settings: { calendar_id: "primary", import_external: false, ...(existing?.settings ?? {}), sync_token: undefined },
      connected_at: new Date().toISOString(),
    });

    // Push every upcoming dashboard appointment once, then get an initial sync token.
    const { data: upcoming } = await admin.from("appointments").select("id")
      .eq("owner_id", user.id).in("status", ["pending", "confirmed"]).neq("source", "calendly").gte("start_at", new Date().toISOString()).limit(200);
    const { syncAppointmentToGoogle } = await import("@/features/integrations/google-calendar");
    for (const a of upcoming ?? []) await syncAppointmentToGoogle(user.id, a.id);
    await pullGoogleChanges(user.id);
    await registerGoogleWatch(user.id);
    return back("connected");
  } catch (e) {
    console.error("[google] callback", e);
    return back("error");
  }
}
