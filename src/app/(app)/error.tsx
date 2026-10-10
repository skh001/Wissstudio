"use client";

import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error); }, [error]);
  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <EmptyState
      className="mt-10"
      title={offline ? "You're offline" : "This page didn't load"}
      description={offline ? "Reconnect to see your latest data." : "The data couldn't be loaded. Try again; if it keeps happening, check your Supabase settings."}
      action={<Button onClick={reset}><RotateCcw />Try again</Button>}
    />
  );
}
