import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "table" | "text";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const variants = {
    default: "bg-muted animate-pulse rounded-md",
    card: "bg-muted animate-pulse rounded-lg p-4 space-y-3",
    table: "bg-muted animate-pulse rounded h-8",
    text: "bg-muted animate-pulse rounded h-4",
  };

  return (
    <div
      className={cn(variants[variant], className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} variant="table" />
      ))}
    </div>
  );
}