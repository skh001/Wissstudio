"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// FullCalendar touches `window`: load it on the client only.
export const CalendarClient = dynamic(
  () => import("@/features/appointments/components/calendar-view").then((m) => m.CalendarView),
  {
    ssr: false,
    loading: () => (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[640px] rounded-2xl" />
      </div>
    ),
  },
);
