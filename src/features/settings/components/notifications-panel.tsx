"use client";

import { useEffect, useState } from "react";
import { BellRing, CalendarX2, PartyPopper, Volume2 } from "lucide-react";
import { toast } from "sonner";
import { addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { announceBooking } from "@/features/live/alerts";
import { useUIStore } from "@/stores/ui-store";

type Permission = NotificationPermission | "unsupported";

export function NotificationsPanel() {
  const { soundEnabled, browserNotifications, setSoundEnabled, setBrowserNotifications } = useUIStore();
  const [permission, setPermission] = useState<Permission>("default");

  useEffect(() => {
    setPermission("Notification" in window ? Notification.permission : "unsupported");
  }, []);

  async function toggleBrowser(on: boolean) {
    if (!on) return setBrowserNotifications(false);
    if (!("Notification" in window)) {
      return toast.error("This browser can't show notifications. On iPhone, add the app to the home screen first.");
    }
    const result = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    setPermission(result);
    if (result !== "granted") {
      setBrowserNotifications(false);
      return toast.error("Notifications are blocked for this site. Allow them in the browser's site settings, then try again.");
    }
    setBrowserNotifications(true);
    toast.success("Browser notifications enabled");
  }

  function test(kind: "new" | "cancelled") {
    const tomorrow = addDays(new Date(), 1);
    tomorrow.setHours(14, 0, 0, 0);
    void announceBooking(
      { id: `test-${Date.now()}`, kind, clientName: "Sarah", serviceName: "Gel X", startAt: tomorrow.toISOString(), href: null },
      { test: true },
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BellRing className="h-5 w-5 text-primary" />Booking alerts</CardTitle>
          <CardDescription>
            When a client books or cancels on Calendly, the dashboard, calendar and activity update on their own and an alert
            appears. Your own changes in the app never ring. These settings apply to this device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="flex items-center gap-2 font-medium"><Volume2 className="h-4 w-4 text-muted-foreground" />Notification sounds</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">A chime for new bookings, a softer tone for cancellations. Phones also vibrate.</span>
            </span>
            <Switch checked={soundEnabled} onCheckedChange={setSoundEnabled} aria-label="Notification sounds" />
          </label>
          <label className="flex items-center justify-between gap-4 text-sm">
            <span>
              <span className="flex items-center gap-2 font-medium"><BellRing className="h-4 w-4 text-muted-foreground" />Browser notifications</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {permission === "unsupported" ? "Not supported by this browser."
                  : permission === "denied" ? "Blocked in the browser's site settings."
                  : "Shown when the app is open in the background."}
              </span>
            </span>
            <Switch
              checked={browserNotifications && permission === "granted"}
              disabled={permission === "unsupported"}
              onCheckedChange={(v) => void toggleBrowser(v)}
              aria-label="Browser notifications"
            />
          </label>
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => test("new")}><PartyPopper />Test new booking</Button>
            <Button variant="outline" onClick={() => test("cancelled")}><CalendarX2 />Test cancellation</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
