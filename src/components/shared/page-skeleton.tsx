import { Skeleton } from "@/components/ui/skeleton";

export function PageSkeleton({ cards = 4, rows = 6 }: { cards?: number; rows?: number }) {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading">
      <div className="space-y-2">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      {cards > 0 && (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: cards }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
      )}
      <div className="space-y-2 rounded-2xl border p-4">
        {Array.from({ length: rows }).map((_, i) => <Skeleton key={i} className="h-12" />)}
      </div>
    </div>
  );
}
