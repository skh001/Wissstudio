import type { Metadata } from "next";
import { listIntegrations } from "@/features/settings/repository";
import { BookingView } from "@/features/booking/components/booking-view";

export const metadata: Metadata = { title: "Booking" };
// Server actions on this page call Google / Calendly (connect, sync), which can take a while.
export const maxDuration = 60;

export default async function BookingPage() {
  const calendly = (await listIntegrations()).find((i) => i.provider === "calendly");
  return <BookingView connected={!!calendly} instantSync={!!calendly?.settings.webhook_uri} />;
}
