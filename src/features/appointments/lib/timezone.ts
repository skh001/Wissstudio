/**
 * The salon works in Europe/Paris time whatever the server's timezone (Vercel runs in UTC).
 * Converts a wall-clock "YYYY-MM-DDTHH:mm:ss" in the salon timezone to a real Date.
 */
export const SALON_TZ = process.env.NEXT_PUBLIC_SALON_TIMEZONE || "Europe/Paris";

function tzOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  }).formatToParts(date);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const asUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUTC - date.getTime();
}

export function fromZonedTime(local: string, timeZone = SALON_TZ): Date {
  const naive = new Date(`${local}Z`);
  const offset = tzOffsetMs(naive, timeZone);
  const guess = new Date(naive.getTime() - offset);
  // second pass handles DST transitions
  const offset2 = tzOffsetMs(guess, timeZone);
  return offset2 === offset ? guess : new Date(naive.getTime() - offset2);
}

/** Date → { date: "YYYY-MM-DD", time: "HH:mm" } in the salon timezone. */
export function toZonedParts(date: Date | string, timeZone = SALON_TZ) {
  const d = typeof date === "string" ? new Date(date) : date;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}
