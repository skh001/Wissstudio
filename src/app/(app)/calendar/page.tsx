import type { Metadata } from "next";
import { listIntegrations } from "@/features/settings/repository";
import { CalendarClient } from "./calendar-client";

export const metadata: Metadata = { title: "Calendar" };
// Server actions on this page call Google / Calendly (connect, sync), which can take a while.
export const maxDuration = 60;

export default async function CalendarPage() {
  const integrations = await listIntegrations();
  return (
    <CalendarClient
      googleConnected={integrations.some((i) => i.provider === "google")}
      calendlyConnected={integrations.some((i) => i.provider === "calendly")}
    />
  );
}
