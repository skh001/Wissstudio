"use client";

import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedCounter, type CounterFormat } from "@/components/shared/animated-counter";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  format = "number",
  icon: Icon,
  hint,
  trend,
  tone = "default",
  className,
}: {
  label: string;
  value: number;
  format?: CounterFormat;
  icon: LucideIcon;
  hint?: string;
  trend?: number | null;
  tone?: "default" | "alert";
  className?: string;
}) {
  return (
    <Card className={cn("group relative overflow-hidden p-4 transition-shadow hover:shadow-lift sm:p-5", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground sm:text-sm">{label}</span>
        <span
          className={cn(
            "grid h-8 w-8 shrink-0 place-items-center rounded-full",
            tone === "alert" ? "bg-red-50 text-red-500 dark:bg-red-500/10" : "bg-blush-100 text-rosegold-500 dark:bg-secondary",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-2 font-display text-[1.9rem] font-semibold leading-none tabular sm:text-4xl">
        <AnimatedCounter value={value} format={format} />
      </div>
      {(hint || trend != null) && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {trend != null && Number.isFinite(trend) && (
            <span className={cn("inline-flex items-center gap-0.5 font-medium", trend >= 0 ? "text-emerald-600" : "text-red-500")}>
              {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend >= 0 ? "+" : ""}{Math.round(trend)} %
            </span>
          )}
          {hint && <span className="truncate">{hint}</span>}
        </div>
      )}
    </Card>
  );
}
