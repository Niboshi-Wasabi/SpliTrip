"use client";

import * as React from "react";
import { Tabs as HeroTabs } from "@heroui/react";
import { cn } from "@/lib/utils";

type TabsProps = React.ComponentProps<typeof HeroTabs>;

function Tabs({ className, children, ...props }: TabsProps) {
  return (
    <HeroTabs className={cn("w-full", className)} {...props}>
      {children}
    </HeroTabs>
  );
}

type TabListProps = React.ComponentProps<typeof HeroTabs.List>;

function TabList({ className, children, ...props }: TabListProps) {
  return (
    <HeroTabs.List
      className={cn(
        "apple-segmented-track gap-0 rounded-lg p-0.5",
        className,
      )}
      {...props}
    >
      {children}
      <HeroTabs.Indicator className="tabs__indicator" />
    </HeroTabs.List>
  );
}

type TabProps = React.ComponentProps<typeof HeroTabs.Tab>;

function Tab({ className, ...props }: TabProps) {
  return (
    <HeroTabs.Tab
      className={cn(
        "min-h-[36px] rounded-md px-4 text-[13px] font-medium text-[var(--apple-text-secondary)] data-[selected]:text-[var(--apple-text)]",
        className,
      )}
      {...props}
    />
  );
}

type TabPanelProps = React.ComponentProps<typeof HeroTabs.Panel>;

function TabPanel({ className, ...props }: TabPanelProps) {
  return (
    <HeroTabs.Panel className={cn("pt-4", className)} {...props} />
  );
}

export { Tabs, TabList, Tab, TabPanel };
