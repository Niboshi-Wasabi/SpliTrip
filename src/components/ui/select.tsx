"use client";

import * as React from "react";
import { Select as HeroSelect } from "@heroui/react";
import { cn } from "@/lib/utils";

type SelectProps = React.ComponentProps<typeof HeroSelect> & {
  children: React.ReactNode;
};

function Select({ className, children, ...props }: SelectProps) {
  return (
    <HeroSelect
      className={cn("min-h-[44px]", className)}
      {...props}
    >
      <HeroSelect.Trigger className="min-h-[44px] rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-surface)] text-[var(--apple-text)] transition focus:border-[var(--apple-link)] focus:ring-2 focus:ring-[var(--apple-link)]/20">
        <HeroSelect.Value />
      </HeroSelect.Trigger>
      <HeroSelect.Popover className="rounded-xl border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] shadow-lg">
        {children}
      </HeroSelect.Popover>
    </HeroSelect>
  );
}

export { Select };
