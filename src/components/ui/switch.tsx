"use client";

import * as React from "react";
import { Switch as HeroSwitch } from "@heroui/react";
import { cn } from "@/lib/utils";

type SwitchProps = Omit<React.ComponentProps<typeof HeroSwitch>, "children"> & {
  label?: string;
};

function Switch({ className, label, ...props }: SwitchProps) {
  return (
    <HeroSwitch
      className={cn("min-h-[44px] items-center gap-3", className)}
      {...props}
    >
      <HeroSwitch.Control className="bg-[var(--apple-fill-tertiary)] data-[selected]:bg-[var(--apple-link)]">
        <HeroSwitch.Thumb className="bg-white shadow-sm" />
      </HeroSwitch.Control>
      {label && (
        <HeroSwitch.Content className="text-[15px] text-[var(--apple-text)]">
          {label}
        </HeroSwitch.Content>
      )}
    </HeroSwitch>
  );
}

export { Switch };
