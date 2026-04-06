"use client";

/**
 * Non-intrusive promo placeholder for future affiliate / partner links.
 * Keeps layout ready without looking like a display ad (card tone, no flashy colors).
 * 将来のアフィリエイト・提携用プレースホルダー。広告っぽさを抑えたカードトーンで配置のみ。
 */

import { useTranslations } from "next-intl";
import { ChevronRight, Hotel } from "lucide-react";

export function PromoBanner() {
  const adsTranslations = useTranslations("Ads");

  return (
    <div
      role="note"
      className="group flex w-full min-h-[44px] items-center gap-3 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-left text-sm text-muted-foreground md:min-h-0 md:py-2"
      aria-label={adsTranslations("promoAria")}
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted/50 text-muted-foreground group-hover:text-foreground">
        <Hotel className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-foreground/90">
          {adsTranslations("promoTitle")}
        </span>
        <span className="block text-xs text-muted-foreground">
          {adsTranslations("promoSubtitle")}
        </span>
      </span>
      <ChevronRight
        className="h-4 w-4 shrink-0 opacity-40"
        aria-hidden
      />
    </div>
  );
}
