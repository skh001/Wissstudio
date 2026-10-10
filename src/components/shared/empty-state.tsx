import { cn } from "@/lib/utils";

function PolishBottle() {
  return (
    <svg viewBox="0 0 120 120" className="h-24 w-24" aria-hidden>
      <defs>
        <linearGradient id="es-bottle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FAD7E6" />
          <stop offset="1" stopColor="#E99BBB" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="64" r="48" fill="#FFF6FA" />
      <rect x="49" y="16" width="22" height="30" rx="6" fill="#3B2A32" opacity=".85" />
      <rect x="36" y="44" width="48" height="52" rx="16" fill="url(#es-bottle)" />
      <path d="M45 56c0-4 2-6 5-7" stroke="#fff" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="88" cy="34" r="3" fill="#EBD3BC" />
      <circle cx="30" cy="40" r="2" fill="#F4BDD3" />
      <path d="M94 74l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#D9A3AB" />
    </svg>
  );
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-2xl border border-dashed border-border px-6 py-12 text-center", className)}>
      <PolishBottle />
      <h3 className="mt-3 font-display text-2xl font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
