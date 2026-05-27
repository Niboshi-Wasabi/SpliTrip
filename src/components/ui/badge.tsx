"use client";

import * as React from "react";
import { Chip } from "@heroui/react";
import { cn } from "@/lib/utils";
import { mapBadgeProps, type ShadcnBadgeVariant } from "@/lib/ui/heroui-maps";

type BadgeProps = Omit<React.ComponentProps<typeof Chip>, "variant" | "color"> & {
  variant?: ShadcnBadgeVariant;
};

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const mapped = mapBadgeProps(variant);

  return (
    <Chip
      data-slot="badge"
      variant={mapped.variant}
      color={mapped.color}
      className={cn("inline-flex w-fit items-center gap-1", className)}
      {...props}
    />
  );
}

export { Badge };
