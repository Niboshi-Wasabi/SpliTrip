import * as React from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { APPLE_LARGE_TITLE_CLASS } from "@/lib/ui/apple-design";
import { OptimizedLink } from "@/components/common/optimized-link";

type PageHeaderProps = {
  title: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  backHref,
  backLabel,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-2", className)}>
      {backHref && (
        <OptimizedLink
          href={backHref}
          className="inline-flex items-center gap-0.5 text-[15px] text-[var(--apple-link)] transition-opacity hover:opacity-80"
        >
          <ChevronLeft className="size-4" />
          {backLabel}
        </OptimizedLink>
      )}
      <div className="flex items-center justify-between gap-4">
        <h1 className={APPLE_LARGE_TITLE_CLASS}>{title}</h1>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
