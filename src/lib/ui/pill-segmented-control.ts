/** ピルインジケータのスライドアニメーション（Framer Motion layoutId 用） */
export const PILL_SEGMENT_INDICATOR_TRANSITION = {
  type: "spring",
  stiffness: 400,
  damping: 34,
} as const;

export const PILL_SEGMENT_TRACK_CLASS =
  "rounded-full bg-[var(--apple-fill-tertiary)] p-1";

export const PILL_SEGMENT_INDICATOR_CLASS =
  "absolute inset-0 rounded-full bg-[color-mix(in_srgb,var(--apple-text)_14%,transparent)]";

export const PILL_SEGMENT_ITEM_BASE_CLASS =
  "relative inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-medium transition-colors outline-none";

export const PILL_SEGMENT_SIZE_CLASS = {
  default: "min-h-[44px] px-4 py-2 text-[13px]",
  large: "min-h-[52px] px-4 py-2.5 text-[15px]",
} as const;

export const PILL_SEGMENT_ITEM_SELECTED_CLASS = "text-[var(--apple-link)]";

export const PILL_SEGMENT_ITEM_IDLE_CLASS =
  "text-[var(--apple-text-secondary)] hover:text-[var(--apple-text)]";
