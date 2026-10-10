import type { Metadata } from "next";
import { Suspense } from "react";
import { requireUser } from "@/lib/action";
import { getSettings, listIntegrations } from "@/features/settings/repository";
import { googleConfigured } from "@/features/integrations/google-calendar";
import { siteUrl } from "@/lib/site-url";
import { SettingsView } from "@/features/settings/components/settings-view";

export const metadata: Metadata = { title: "Settings" };
// Server actions on this page call Google / Calendly (connect, sync), which can take a while.
export const maxDuration = 60;

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const { supabase } = await requireUser();
  const [settings, integrations, { count }, sp] = await Promise.all([
    getSettings(),
    listIntegrations(),
    supabase.from("clients").select("id", { count: "exact", head: true }),
    searchParams,
  ]);
  void sp;
  return (
    <Suspense>
      <SettingsView
        settings={settings}
        integrations={integrations}
        googleConfigured={googleConfigured()}
        serviceRoleConfigured={!!process.env.SUPABASE_SERVICE_ROLE_KEY}
        siteUrl={siteUrl()}
        hasClients={(count ?? 0) > 0}
      />
    </Suspense>
  );
}
