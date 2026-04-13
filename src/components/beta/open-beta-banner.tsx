"use client";

import { Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";

export function OpenBetaBanner() {
  const t = useTranslations("Beta");

  return (
    <div
      className="border-b border-zinc-800 bg-zinc-900/80 text-zinc-100"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <Sparkles
            className="h-4 w-4 shrink-0 text-zinc-300 opacity-90"
            aria-hidden
          />
          <p className="text-center text-sm font-semibold tracking-tight sm:text-left">
            {t("dashboardTitle")}
          </p>
        </div>
        <Separator
          orientation="vertical"
          className="hidden h-6 bg-zinc-700 sm:block"
        />
        <p className="text-center text-[11px] leading-relaxed text-zinc-300 sm:flex-1 sm:text-left">
          {t("dashboardNote")}
        </p>
      </div>
    </div>
  );
}
