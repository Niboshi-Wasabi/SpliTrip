import * as React from "react";
import { cn } from "@/lib/utils";
import { APPLE_INSET_GROUP_CLASS, APPLE_INSET_ROW_CLASS } from "@/lib/ui/apple-design";

type InsetListProps = React.ComponentProps<"div"> & {
  header?: string;
  footer?: string;
};

export function InsetList({ header, footer, className, children, ...props }: InsetListProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {header && (
        <p className="px-4 text-[13px] font-normal uppercase tracking-wide text-[var(--apple-text-secondary)]">
          {header}
        </p>
      )}
      <div className={cn(APPLE_INSET_GROUP_CLASS, className)} {...props}>
        {children}
      </div>
      {footer && (
        <p className="px-4 text-[13px] text-[var(--apple-text-secondary)]">
          {footer}
        </p>
      )}
    </div>
  );
}

type InsetListItemProps = React.ComponentProps<"div"> & {
  showSeparator?: boolean;
};

export function InsetListItem({
  className,
  children,
  showSeparator = true,
  ...props
}: InsetListItemProps) {
  return (
    <div
      className={cn(
        APPLE_INSET_ROW_CLASS,
        showSeparator && "border-b border-[var(--apple-separator)] last:border-b-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

type InsetListLinkItemProps = React.ComponentProps<"a"> & {
  showSeparator?: boolean;
};

export function InsetListLinkItem({
  className,
  children,
  showSeparator = true,
  ...props
}: InsetListLinkItemProps) {
  return (
    <a
      className={cn(
        APPLE_INSET_ROW_CLASS,
        "cursor-pointer transition-colors hover:bg-[var(--apple-fill-tertiary)]",
        showSeparator && "border-b border-[var(--apple-separator)] last:border-b-0",
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
}
