"use client";

import * as React from "react";
import { Card as HeroCard } from "@heroui/react";
import { cn } from "@/lib/utils";

const CARD_SURFACE =
  "overflow-hidden rounded-2xl border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] text-sm text-[var(--apple-text)] shadow-sm";

type CardProps = React.ComponentProps<typeof HeroCard> & {
  size?: "default" | "sm";
};

function Card({ className, size = "default", ...props }: CardProps) {
  return (
    <HeroCard
      data-slot="card"
      data-size={size}
      className={cn(
        CARD_SURFACE,
        "flex flex-col gap-4 py-4",
        size === "sm" && "gap-3 py-3",
        className,
      )}
      {...props}
    />
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<typeof HeroCard.Header>) {
  return (
    <HeroCard.Header
      data-slot="card-header"
      className={cn(
        "grid auto-rows-min items-start gap-1 px-4 group-data-[size=sm]/card:px-3",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<typeof HeroCard.Title>) {
  return (
    <HeroCard.Title
      data-slot="card-title"
      className={cn(
        "font-heading text-base leading-snug font-medium group-data-[size=sm]/card:text-sm",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({
  className,
  ...props
}: React.ComponentProps<typeof HeroCard.Description>) {
  return (
    <HeroCard.Description
      data-slot="card-description"
      className={cn("text-sm text-[var(--apple-text-secondary)]", className)}
      {...props}
    />
  );
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<typeof HeroCard.Content>) {
  return (
    <HeroCard.Content
      data-slot="card-content"
      className={cn("px-4 group-data-[size=sm]/card:px-3", className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<typeof HeroCard.Footer>) {
  return (
    <HeroCard.Footer
      data-slot="card-footer"
      className={cn(
        "flex items-center rounded-b-2xl border-t border-[var(--apple-separator)] bg-[var(--apple-fill-tertiary)] p-4 group-data-[size=sm]/card:p-3",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
};
