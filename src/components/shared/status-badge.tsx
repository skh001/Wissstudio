import { STATUS_META } from "@/lib/constants";
import type { AppointmentStatus } from "@/types/domain";
import { cn } from "@/lib/utils";

export function StatusBadge({ status, className }: { status: AppointmentStatus; className?: string }) {
  const meta = STATUS_META[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", meta.badge, className)}>
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}
