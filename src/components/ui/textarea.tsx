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
          "min-h-[44px] rounded-lg border-[var(--apple-separator)] bg-[var(--apple-surface)] text-[var(--apple-text)]",
          className,
        )}
        {...props}
      />
    );
  },
);

export { Textarea };
