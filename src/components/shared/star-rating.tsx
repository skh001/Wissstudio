"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ value, onChange, size = "sm" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "h-7 w-7" : "h-4 w-4";
  return (
    <div className="flex gap-0.5" role={onChange ? "radiogroup" : undefined} aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Star className={cn(cls, n <= value ? "fill-champagne text-[#D4A373]" : "text-border")} />;
        return onChange ? (
          <button key={n} type="button" role="radio" aria-checked={n === value} onClick={() => onChange(n)} className="transition hover:scale-110">
            {icon}
          </button>
        ) : (
          <span key={n}>{icon}</span>
        );
      })}
    </div>
  );
}
