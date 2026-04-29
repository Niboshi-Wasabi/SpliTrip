"use client";

import { useCallback, useRef } from "react";

type UseLongPressOptions = {
  delayMs?: number;
  onLongPress: () => void;
  onPressEnd?: () => void;
};

export function useLongPress({
  delayMs = 500,
  onLongPress,
  onPressEnd,
}: UseLongPressOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    clear();
    longPressTriggeredRef.current = false;
    timerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      onLongPress();
    }, delayMs);
  }, [clear, delayMs, onLongPress]);

  const end = useCallback(() => {
    clear();
    onPressEnd?.();
    longPressTriggeredRef.current = false;
  }, [clear, onPressEnd]);

  return {
    longPressTriggeredRef,
    bind: {
      onTouchStart: start,
      onTouchEnd: end,
      onTouchCancel: end,
    },
  };
}
