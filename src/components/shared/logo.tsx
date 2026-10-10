import { cn } from "@/lib/utils";

/** WissNails mark: a lacquered almond nail with a highlight. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={cn("h-9 w-9", className)} aria-hidden>
      <defs>
        <linearGradient id="wn-lacquer" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#F4BDD3" />
          <stop offset="55%" stopColor="#C88792" />
          <stop offset="100%" stopColor="#9A5763" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="12" fill="#FDEBF3" />
      <path d="M20 6c5.6 0 9 5.8 9 13.4V31a3 3 0 0 1-3 3H14a3 3 0 0 1-3-3V19.4C11 11.8 14.4 6 20 6Z" fill="url(#wn-lacquer)" />
      <path d="M16.2 12.5c1-2.4 2.4-3.6 3.6-3.9" stroke="#fff" strokeOpacity=".85" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      <path d="M11 27h18" stroke="#EBD3BC" strokeWidth="1.2" />
    </svg>
  );
}

export function Logo({ collapsed, name = "WissNails" }: { collapsed?: boolean; name?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <LogoMark />
      {!collapsed && (
        <div className="leading-none">
          <div className="font-display text-xl font-semibold tracking-tight">{name}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">Studio</div>
        </div>
      )}
    </div>
  );
}
