"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Script from "next/script";
import { Copy, ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/page-header";
import { useServerAction } from "@/hooks/use-server-action";
import { CALENDLY_EMBED_URL, CALENDLY_URL } from "@/lib/constants";
import { importCalendlyBookingAction, syncCalendlyNow } from "@/features/integrations/actions";

declare global {
  interface Window {
    Calendly?: { initInlineWidget: (opts: { url: string; parentElement: HTMLElement }) => void };
  }
}

interface CalendlyMessage {
  event?: string;
  payload?: { event?: { uri?: string }; invitee?: { uri?: string } };
}

export function BookingView({ connected, instantSync }: { connected: boolean; instantSync: boolean }) {
  const widgetRef = useRef<HTMLDivElement>(null);
  const { run, pending } = useServerAction();

  // widget.js initialises the widget itself on first load; on later visits (client navigation) it is already loaded.
  function initWidget() {
    const el = widgetRef.current;
    if (el && window.Calendly && !el.querySelector("iframe")) {
      window.Calendly.initInlineWidget({ url: CALENDLY_EMBED_URL, parentElement: el });
    }
  }

  // A booking made in the widget is imported straight away (no need to wait for the webhook or the 15-min sync).
  useEffect(() => {
    function onMessage(e: MessageEvent<CalendlyMessage>) {
      if (e.origin !== "https://calendly.com" || e.data?.event !== "calendly.event_scheduled") return;
      const eventUri = e.data.payload?.event?.uri;
      const inviteeUri = e.data.payload?.invitee?.uri;
      if (!eventUri || !inviteeUri) return;
      if (!connected) {
        toast.info("Booked on Calendly", { description: "Connect Calendly in Settings → Integrations to add bookings to your calendar automatically." });
        return;
      }
      void run(() => importCalendlyBookingAction(eventUri, inviteeUri), {
        onSuccess: (r) => toast.success(r.result === "created" ? "Booking added to your calendar" : "Booking already in your calendar"),
      });
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [connected, run]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(CALENDLY_URL);
      toast.success("Booking link copied");
    } catch {
      toast.error("The link couldn't be copied. Select it in the address bar instead.");
    }
  }

  return (
    <>
      <PageHeader
        title="Booking"
        description="Your Calendly booking page. Bookings made here or on Calendly appear in your calendar as confirmed appointments, with the client created automatically."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={copyLink}><Copy />Copy link</Button>
            <Button variant="outline" size="sm" asChild>
              <a href={CALENDLY_URL} target="_blank" rel="noreferrer"><ExternalLink />Open</a>
            </Button>
            {connected && (
              <Button size="sm" loading={pending} onClick={() => run(() => syncCalendlyNow(), {
                onSuccess: (r) => toast.success(r.changed ? `${r.changed} booking change(s) imported` : "Already up to date"),
              })}>
                {!pending && <RefreshCw />}Sync Calendly
              </Button>
            )}
          </>
        }
      />

      {!connected ? (
        <p className="mb-4 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
          Calendly isn&apos;t connected yet: bookings won&apos;t reach your calendar.{" "}
          <Link href="/settings?tab=integrations" className="font-medium underline">Connect it in Settings → Integrations</Link>.
        </p>
      ) : !instantSync && (
        <p className="-mt-3 mb-4 text-xs text-muted-foreground">
          Bookings made on this page are added right away; bookings made elsewhere on Calendly arrive with the scheduled sync or when you click Sync Calendly.
        </p>
      )}

      <Card className="overflow-hidden p-0">
        <div
          ref={widgetRef}
          className="calendly-inline-widget"
          data-url={CALENDLY_EMBED_URL}
          style={{ minWidth: 320, height: 700 }}
        />
      </Card>
      <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="afterInteractive" onReady={initWidget} />
    </>
  );
}
