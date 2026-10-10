import { WifiOff } from "lucide-react";
import { LogoMark } from "@/components/shared/logo";

export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <div className="max-w-sm">
        <LogoMark className="mx-auto h-14 w-14" />
        <h1 className="mt-6 font-display text-4xl font-semibold">You&apos;re offline</h1>
        <p className="mt-2 text-muted-foreground">
          Pages you opened recently are still available. Reconnect to save changes and see new bookings.
        </p>
        <WifiOff className="mx-auto mt-6 h-6 w-6 text-primary" />
      </div>
    </main>
  );
}
