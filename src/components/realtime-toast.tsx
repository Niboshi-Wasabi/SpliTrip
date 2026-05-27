"use client";

/**
 * 他ユーザーのデータ変更を検知した際に表示する一時トースト。
 * Ephemeral toast shown when another user's data change is detected.
 *
 * Why a custom toast instead of a library:
 *   依存を増やさず、アニメーション付きの軽量トーストを実現する。
 *   Keeps the bundle small by avoiding a toast library dependency,
 *   while still providing animated feedback.
 */

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";

type Props = {
  /** true を渡すとトーストが表示され、自動で消える / Shows the toast, auto-dismisses */
  show: boolean;
  /** トーストが消えた後に呼ばれる / Called after toast auto-dismisses */
  onDismiss: () => void;
  /** カスタムメッセージ（オプション）/ Custom message (optional) */
  message?: string;
};

const DISPLAY_DURATION_MS = 3000;

export function RealtimeToast({ show, onDismiss, message }: Props) {
  const translations = useTranslations("Realtime");
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (!show) {
      queueMicrotask(() => {
        setVisible(false);
        setExiting(false);
      });
      return;
    }

    queueMicrotask(() => {
      setVisible(true);
      setExiting(false);
    });

    const exitTimer = setTimeout(() => {
      setExiting(true);
    }, DISPLAY_DURATION_MS - 300);

    const dismissTimer = setTimeout(() => {
      setVisible(false);
      setExiting(false);
      onDismiss();
    }, DISPLAY_DURATION_MS);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(dismissTimer);
    };
  }, [show, onDismiss]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full border border-[var(--apple-separator)] bg-[var(--apple-card-bg)] px-4 py-2 shadow-lg transition-all duration-300 md:bottom-6 ${
        exiting
          ? "translate-y-2 opacity-0"
          : "translate-y-0 opacity-100"
      }`}
    >
      <span className="flex items-center gap-2 text-sm text-[var(--apple-text)]">
        <RefreshCw className="h-3.5 w-3.5 animate-spin text-blue-500" />
        {message || translations("updated")}
      </span>
    </div>
  );
}
