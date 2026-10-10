import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function sum<T>(items: T[], pick: (item: T) => number | string | null | undefined) {
  return items.reduce((acc, item) => acc + (Number(pick(item)) || 0), 0);
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function fullName(c?: { first_name?: string | null; last_name?: string | null } | null) {
  if (!c) return "Walk-in";
  return [c.first_name, c.last_name].filter(Boolean).join(" ").trim() || "Client";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function generateCode(prefix = "WISS") {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
  return `${prefix}-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function emptyToNull<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k] = v === "" ? null : v;
  return out as T;
}
