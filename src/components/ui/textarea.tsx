"use client";

import * as React from "react";
import { TextArea as HeroTextArea } from "@heroui/react";
import { cn } from "@/lib/utils";

type TextareaProps = React.ComponentProps<typeof HeroTextArea>;

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea({ className, ...props }, reference) {
    return (
      <HeroTextArea
        ref={reference}
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

export { Textarea };
