"use client";

import { Separator as HeroSeparator } from "@heroui/react";
import { cn } from "@/lib/utils";

type SeparatorProps = React.ComponentProps<typeof HeroSeparator>;

function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return (
    <HeroSeparator
      data-slot="separator"
      orientation={orientation}
      className={cn(
        "shrink-0 bg-[var(--apple-separator)] data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
