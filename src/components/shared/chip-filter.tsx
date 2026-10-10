"use client";

import { cn } from "@/lib/utils";

export function ChipFilter<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          role="tab"
          aria-selected={value === o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
            value === o.value
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
          )}
        >
          {o.label}
          {o.count != null && <span className="ml-1.5 opacity-70 tabular">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}
