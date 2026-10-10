import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { googleAuthUrl, googleConfigured } from "@/features/integrations/google-calendar";

export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  if (!googleConfigured()) return NextResponse.redirect(`${origin}/settings?tab=integrations&google=not-configured`);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(googleAuthUrl(state));
  res.cookies.set("wn_google_state", state, { httpOnly: true, sameSite: "lax", secure: origin.startsWith("https"), maxAge: 600, path: "/" });
  return res;
}
