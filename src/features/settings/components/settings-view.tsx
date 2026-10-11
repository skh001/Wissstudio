"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { IntegrationStatus, SalonSettings } from "@/types/domain";
import { BusinessForm } from "./business-form";
import { DataPanel } from "./data-panel";
import { IntegrationsPanel } from "./integrations-panel";
import { NotificationsPanel } from "./notifications-panel";
import { SalonForm } from "./salon-form";

export function SettingsView(props: {
  settings: SalonSettings; integrations: IntegrationStatus[]; googleConfigured: boolean; serviceRoleConfigured: boolean; siteUrl: string; hasClients: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tab = params.get("tab") ?? "salon";
  const google = params.get("google");

  useEffect(() => {
    if (!google) return;
    const messages: Record<string, [string, "success" | "error"]> = {
      connected: ["Google Calendar connected", "success"],
      denied: ["Google access was refused", "error"],
      invalid: ["The Google sign-in expired. Try again.", "error"],
      error: ["Google Calendar couldn't be connected. Check the OAuth settings in the README.", "error"],
      "not-configured": ["Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first", "error"],
    };
    const [msg, kind] = messages[google] ?? ["", "error"];
    if (msg) toast[kind](msg);
    router.replace("/settings?tab=integrations", { scroll: false });
  }, [google, router]);
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Settings" />
      <Tabs value={tab} onValueChange={(v) => router.replace(`/settings?tab=${v}`, { scroll: false })}>
        <TabsList>
          <TabsTrigger value="salon">Salon</TabsTrigger>
          <TabsTrigger value="business">Prices & taxes</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="data">Data</TabsTrigger>
        </TabsList>
        <TabsContent value="salon"><SalonForm settings={props.settings} /></TabsContent>
        <TabsContent value="business"><BusinessForm settings={props.settings} /></TabsContent>
        <TabsContent value="integrations">
          <IntegrationsPanel integrations={props.integrations} googleConfigured={props.googleConfigured}
            serviceRoleConfigured={props.serviceRoleConfigured} siteUrl={props.siteUrl} />
        </TabsContent>
        <TabsContent value="notifications"><NotificationsPanel /></TabsContent>
        <TabsContent value="data"><DataPanel hasClients={props.hasClients} /></TabsContent>
      </Tabs>
    </div>
  );
}
