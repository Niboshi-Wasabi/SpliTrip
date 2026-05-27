"use client";

import * as React from "react";
import { Dropdown } from "@heroui/react";
import { cn } from "@/lib/utils";

function DropdownMenu({ children, ...props }: React.ComponentProps<typeof Dropdown>) {
  return <Dropdown {...props}>{children}</Dropdown>;
}

function DropdownMenuTrigger(props: React.ComponentProps<typeof Dropdown.Trigger>) {
  return <Dropdown.Trigger {...props} />;
}

function DropdownMenuContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Dropdown.Popover>) {
  return (
    <Dropdown.Popover
      className={cn(
        "min-w-32 rounded-lg border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] p-1 text-[var(--apple-text)] shadow-lg",
        className,
      )}
      {...props}
    >
      <Dropdown.Menu className="outline-none">{children}</Dropdown.Menu>
    </Dropdown.Popover>
  );
}

function DropdownMenuItem({
  className,
  variant: itemTone = "default",
  ...props
}: Omit<React.ComponentProps<typeof Dropdown.Item>, "variant"> & {
  variant?: "default" | "destructive";
}) {
  return (
    <Dropdown.Item
      className={cn(
        "rounded-md px-2 py-1.5 text-sm outline-none",
        itemTone === "destructive" && "text-red-400 focus:bg-red-950/40",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuLabel({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("px-2 py-1.5 text-xs font-medium text-[var(--apple-text-secondary)]", className)}
      {...props}
    />
  );
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<"hr">) {
  return <hr className={cn("my-1 border-[var(--apple-separator)]", className)} {...props} />;
}

function DropdownMenuGroup(props: React.ComponentProps<typeof Dropdown.Section>) {
  return <Dropdown.Section {...props} />;
}

function DropdownMenuPortal({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DropdownMenuCheckboxItem(props: React.ComponentProps<typeof Dropdown.Item>) {
  return <Dropdown.Item {...props} />;
}

function DropdownMenuRadioGroup({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function DropdownMenuRadioItem(props: React.ComponentProps<typeof Dropdown.Item>) {
  return <Dropdown.Item {...props} />;
}

function DropdownMenuSub(props: React.ComponentProps<typeof Dropdown>) {
  return <Dropdown {...props} />;
}

function DropdownMenuSubTrigger(props: React.ComponentProps<typeof Dropdown.SubmenuTrigger>) {
  return <Dropdown.SubmenuTrigger {...props} />;
}

function DropdownMenuSubContent(props: React.ComponentProps<typeof Dropdown.Popover>) {
  return <Dropdown.Popover {...props} />;
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest text-[var(--apple-text-secondary)]", className)}
      {...props}
    />
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
