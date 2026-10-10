"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = 99,
  className,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  className?: string;
}) {
  const set = (v: number) => onChange(Math.max(min, Math.min(max, v)));
  return (
    <div className={cn("inline-flex items-center rounded-full border bg-card", className)}>
      <button type="button" onClick={() => set(value - 1)} disabled={value <= min} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-accent disabled:opacity-40" aria-label="Decrease">
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium tabular">{value}</span>
      <button type="button" onClick={() => set(value + 1)} disabled={value >= max} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition hover:bg-accent disabled:opacity-40" aria-label="Increase">
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
