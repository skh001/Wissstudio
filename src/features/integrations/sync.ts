import "server-only";
import { after } from "next/server";
import { syncAppointmentToGoogle } from "./google-calendar";
import { cancelOnCalendly } from "./calendly";

/**
 * Called after any appointment mutation. Runs after the response is sent (next/server `after`)
 * so the UI never waits on Google or Calendly, and failures never block the salon.
 */
export function scheduleCalendarSync(ownerId: string, appointmentId: string, opts: { cancelCalendlyUri?: string | null } = {}) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return;
  after(async () => {
    await syncAppointmentToGoogle(ownerId, appointmentId);
    if (opts.cancelCalendlyUri) await cancelOnCalendly(ownerId, opts.cancelCalendlyUri);
  });
}
