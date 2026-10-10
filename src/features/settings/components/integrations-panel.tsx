"use client";

import { useState } from "react";
import { CalendarDays, CheckCircle2, ExternalLink, Link2, Unplug } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { useServerAction } from "@/hooks/use-server-action";
import { formatDate } from "@/lib/format";
import type { IntegrationStatus } from "@/types/domain";
import { connectCalendlyAction, disconnectCalendlyAction, setGoogleImportExternal, syncCalendlyNow, syncGoogleNow } from "@/features/integrations/actions";
import { disconnectIntegration } from "../actions";

export function IntegrationsPanel({
  integrations, googleConfigured, serviceRoleConfigured, siteUrl,
}: { integrations: IntegrationStatus[]; googleConfigured: boolean; serviceRoleConfigured: boolean; siteUrl: string }) {
  const { run, pending } = useServerAction();
  const [token, setToken] = useState("");
  const google = integrations.find((i) => i.provider === "google");
  const calendly = integrations.find((i) => i.provider === "calendly");
  const https = siteUrl.startsWith("https://");

  return (
    <div className="space-y-5">
      {!serviceRoleConfigured && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          Add <code>SUPABASE_SERVICE_ROLE_KEY</code> to your environment to enable calendar sync.
        </p>
      )}

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#4285F4]" />Google Calendar</CardTitle>
            <CardDescription className="mt-1">Appointments you create, move or cancel here appear in Google. Moves and deletions made in Google come back here.</CardDescription>
          </div>
          {google && <Badge variant="success"><CheckCircle2 />Connected</Badge>}
        </CardHeader>
        <CardContent className="space-y-4">
          {google ? (
            <>
              <p className="text-sm text-muted-foreground">{google.account_email ?? "Google account"} · since {formatDate(google.connected_at)}</p>
              <label className="flex items-center justify-between gap-4 text-sm">
                <span>Also import events I add directly in Google Calendar (as pending appointments)</span>
                <Switch defaultChecked={!!google.settings.import_external} onCheckedChange={(v) => run(() => setGoogleImportExternal(v))} />
              </label>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" loading={pending} onClick={() => run(() => syncGoogleNow(), {
                  onSuccess: (r) => toast.success(r.changed ? `${r.changed} change(s) imported` : "Already up to date"),
                })}>Sync now</Button>
                <ConfirmDialog title="Disconnect Google Calendar?" description="Existing events stay in Google; new appointments won't be added."
                  confirmLabel="Disconnect" onConfirm={() => run(() => disconnectIntegration("google"), { success: "Google disconnected" })}
                  trigger={<Button variant="ghost"><Unplug />Disconnect</Button>} />
              </div>
            </>
          ) : googleConfigured ? (
            <Button asChild><a href="/api/integrations/google/connect"><Link2 />Connect Google Calendar</a></Button>
          ) : (
            <p className="text-sm text-muted-foreground">Add <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> to the environment (see README), then reload this page.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2"><span className="grid h-5 w-5 place-items-center rounded-full bg-[#006BFF] text-[10px] font-bold text-white">C</span>Calendly</CardTitle>
            <CardDescription className="mt-1">
              Online bookings appear here instantly, with the client created automatically. Cancelling here cancels on Calendly.
              Name your Calendly event types like your services so prices match.
            </CardDescription>
          </div>
          {calendly && <Badge variant="success"><CheckCircle2 />Connected</Badge>}
        </CardHeader>
        <CardContent className="space-y-3">
          {calendly ? (
            <>
              <p className="text-sm text-muted-foreground">
                {calendly.account_email} · since {formatDate(calendly.connected_at)}
                {typeof calendly.settings.last_pull_at === "string" && ` · last sync ${formatDate(calendly.settings.last_pull_at, "d MMM, HH:mm")}`}
              </p>
              {calendly.settings.webhook_uri ? (
                <p className="text-sm text-muted-foreground">Instant sync is on: bookings and cancellations arrive within seconds.</p>
              ) : (
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {typeof calendly.settings.webhook_error === "string" ? calendly.settings.webhook_error : "Instant sync isn't active."}{" "}
                  Bookings are still imported by the scheduled sync, when you click Sync now, and right away from the Booking page.
                  {!https && " Reconnect after deploying on HTTPS to turn on instant sync."}
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" loading={pending} onClick={() => run(() => syncCalendlyNow(), {
                  onSuccess: (r) => toast.success(r.changed ? `${r.changed} booking change(s) imported` : "Already up to date"),
                })}>Sync now</Button>
                <ConfirmDialog title="Disconnect Calendly?" confirmLabel="Disconnect"
                  onConfirm={() => run(() => disconnectCalendlyAction(), { success: "Calendly disconnected" })}
                  trigger={<Button variant="ghost"><Unplug />Disconnect</Button>} />
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input type="password" value={token} onChange={(e) => setToken(e.target.value)} placeholder="Personal access token" className="sm:flex-1" />
                <Button loading={pending} disabled={!token} onClick={() => run(() => connectCalendlyAction(token), {
                  onSuccess: (r) => {
                    setToken("");
                    const imported = r.imported ? ` · ${r.imported} booking(s) imported` : "";
                    if (r.webhook) toast.success(`Calendly connected${imported}`);
                    else toast.success(`Calendly connected${imported}`, { description: `${r.webhookError ?? ""} Bookings sync on a schedule in the meantime.`.trim() });
                  },
                })}>Connect Calendly</Button>
              </div>
              <a href="https://calendly.com/integrations/api_webhooks" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                Create a token in Calendly <ExternalLink className="h-3 w-3" />
              </a>
              {!https && <p className="text-xs text-muted-foreground">Running on {siteUrl}: bookings sync on demand and on a schedule; instant sync starts once deployed on HTTPS.</p>}
            </>
          )}
          <p className="text-xs text-muted-foreground">
            To stop clients booking over your dashboard appointments, connect Calendly to the same Google Calendar (Calendly → Calendar sync → check for conflicts).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
