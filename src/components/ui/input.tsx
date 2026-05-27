"use client";

import * as React from "react";
import { Input as HeroInput } from "@heroui/react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<typeof HeroInput>>(
  function Input({ className, ...props }, reference) {
    return (
      <HeroInput
        ref={reference}
        data-slot="input"
        fullWidth
        className={cn(
          "min-h-[44px] rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-surface)] px-2.5 py-2 text-sm text-[var(--apple-text)] outline-none transition placeholder:text-[var(--apple-text-secondary)] focus:border-[var(--apple-link)] focus:ring-2 focus:ring-[var(--apple-link)]/20 disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Input };
