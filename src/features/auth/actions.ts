"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/site-url";
import { REMEMBER_COOKIE, SESSION_ALIVE_COOKIE } from "@/lib/constants";
import type { ActionResult } from "@/lib/action";
import { forgotSchema, resetSchema, signInSchema, signUpSchema, type SignInInput, type SignUpInput } from "./schemas";


export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    return { ok: false, error: /invalid/i.test(error.message) ? "This email and password don't match. Check them and try again." : error.message };
  }
  const jar = await cookies();
  const secure = process.env.NODE_ENV === "production";
  jar.set(REMEMBER_COOKIE, parsed.data.remember ? "1" : "0", { maxAge: 60 * 60 * 24 * 400, path: "/", sameSite: "lax", secure });
  if (!parsed.data.remember) jar.set(SESSION_ALIVE_COOKIE, "1", { path: "/", sameSite: "lax", secure }); // dies with the browser
  return { ok: true, data: null };
}

export async function signUp(input: SignUpInput): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  if (process.env.NEXT_PUBLIC_ALLOW_SIGNUP === "false") return { ok: false, error: "New accounts are disabled for this studio." };
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name }, emailRedirectTo: `${siteUrl()}/auth/callback?next=/dashboard` },
  });
  if (error) return { ok: false, error: error.message };
  if (data.session && data.user) {
    await supabase.from("salon_settings").update({ owner_name: parsed.data.name }).eq("owner_id", data.user.id);
    (await cookies()).set(REMEMBER_COOKIE, "1", { maxAge: 60 * 60 * 24 * 400, path: "/", sameSite: "lax", secure: process.env.NODE_ENV === "production" });
  }
  return { ok: true, data: { needsConfirmation: !data.session } };
}

export async function requestPasswordReset(input: { email: string }): Promise<ActionResult> {
  const parsed = forgotSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/reset-password`,
  });
  // Same answer whether or not the email exists, so accounts can't be probed.
  if (error && !/not found/i.test(error.message)) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function updatePassword(input: { password: string; confirm: string }): Promise<ActionResult> {
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]!.message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: null };
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const jar = await cookies();
  jar.delete(REMEMBER_COOKIE);
  jar.delete(SESSION_ALIVE_COOKIE);
  redirect("/login");
}
