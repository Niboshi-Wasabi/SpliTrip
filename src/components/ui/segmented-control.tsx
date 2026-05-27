"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  PILL_SEGMENT_TRACK_CLASS,
  PILL_SEGMENT_INDICATOR_CLASS,
  PILL_SEGMENT_ITEM_BASE_CLASS,
  PILL_SEGMENT_SIZE_CLASS,
  PILL_SEGMENT_ITEM_SELECTED_CLASS,
  PILL_SEGMENT_ITEM_IDLE_CLASS,
  PILL_SEGMENT_INDICATOR_TRANSITION,
} from "@/lib/ui/pill-segmented-control";

type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  items: { value: T; label: string }[];
  size?: "default" | "large";
  className?: string;
  layoutId?: string;
};

function SegmentedControl<T extends string>({
  value,
  onValueChange,
  items,
  size = "default",
  className,
  layoutId = "segmented-indicator",
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      className={cn(PILL_SEGMENT_TRACK_CLASS, "inline-flex", className)}
    >
      {items.map((item) => {
        const isSelected = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={isSelected}
            onClick={() => onValueChange(item.value)}
            className={cn(
              PILL_SEGMENT_ITEM_BASE_CLASS,
              PILL_SEGMENT_SIZE_CLASS[size],
              isSelected
                ? PILL_SEGMENT_ITEM_SELECTED_CLASS
                : PILL_SEGMENT_ITEM_IDLE_CLASS,
            )}
          >
            {isSelected && (
              <motion.span
                layoutId={layoutId}
                className={PILL_SEGMENT_INDICATOR_CLASS}
                transition={PILL_SEGMENT_INDICATOR_TRANSITION}
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export { SegmentedControl };
export type { SegmentedControlProps };
