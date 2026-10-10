import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ActionResult<T = null> = { ok: true; data: T } | { ok: false; error: string };

export class AppError extends Error {}

/** Returns an authenticated Supabase client or throws. Every repository call goes through this. */
export async function requireUser() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new AppError("Your session has expired. Sign in again.");
  return { supabase, user };
}

/** Wraps a server action body: typed result, friendly errors, never leaks stack traces. */
export async function runAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    if (e instanceof AppError) return { ok: false, error: e.message };
    const message = (e as { message?: string })?.message ?? "";
    console.error("[action]", e);
    if (/duplicate key/i.test(message)) return { ok: false, error: "This entry already exists." };
    if (/violates foreign key/i.test(message)) return { ok: false, error: "This item is linked to other records." };
    return { ok: false, error: message || "Something went wrong. Try again." };
  }
}

/** Throws a readable error from a Supabase response. */
export function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}
