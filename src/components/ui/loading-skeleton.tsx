import { Skeleton as HeroSkeleton } from "@heroui/react";
import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "card" | "table" | "text";
}

export function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const variantClassName = {
    default: "h-4 rounded-md",
    card: "h-24 rounded-lg",
    table: "h-8 rounded-md",
    text: "h-4 rounded-md",
  }[variant];

  return (
    <HeroSkeleton
      className={cn(variantClassName, className)}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] p-4">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <Skeleton key={rowIndex} variant="table" />
      ))}
    </div>
  );
}
