"use client";

import * as React from "react";
import { Avatar as HeroAvatar } from "@heroui/react";
import { cn } from "@/lib/utils";

function Avatar({ className, ...props }: React.ComponentProps<typeof HeroAvatar>) {
  return (
    <HeroAvatar
      data-slot="avatar"
      className={cn("relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full", className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof HeroAvatar.Image>) {
  return (
    <HeroAvatar.Image
      data-slot="avatar-image"
      className={cn("aspect-square h-full w-full object-cover", className)}
      {...props}
    />
  );
}

function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof HeroAvatar.Fallback>) {
  return (
    <HeroAvatar.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-[var(--apple-fill-tertiary)] text-[var(--apple-text)]",
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
