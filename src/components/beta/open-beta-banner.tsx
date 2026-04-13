"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";

export function OpenBetaBanner() {
  const t = useTranslations("Beta");

  return (
    <div
      className="border-b border-teal-600/30 bg-gradient-to-r from-teal-600 via-teal-600 to-emerald-600 text-white shadow-sm dark:from-teal-700 dark:via-teal-700 dark:to-emerald-700"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <Sparkles
            className="h-4 w-4 shrink-0 text-teal-100 opacity-90"
            aria-hidden
          />
          <p className="text-center text-sm font-semibold uppercase tracking-wide sm:text-left">
            {t("dashboardTitle")}
          </p>
        </div>
        <p className="text-center text-[11px] leading-relaxed text-white/90 sm:flex-1 sm:text-left">
          {t("dashboardNote")}
        </p>
      </div>
    </div>
  );
}
