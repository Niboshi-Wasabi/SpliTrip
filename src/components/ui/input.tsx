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
          "min-h-[44px] rounded-lg border-[var(--apple-separator)] bg-[var(--apple-surface)] text-[var(--apple-text)]",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Input };
