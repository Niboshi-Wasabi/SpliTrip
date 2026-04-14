"use client";

/**
 * Optional donation / “buy me a coffee” entry; URL from env when you enable monetization.
 * 投げ銭・開発支援リンク。収益化時は `NEXT_PUBLIC_SUPPORT_DEVELOPER_URL` を設定する。
 */

import { useTranslations } from "next-intl";
import { Coffee } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  /** Full button on Settings; compact row in bottom nav; header chip on md+ only (caller wraps). */
  variant?: "default" | "compact" | "header";
};

function supportUrl(): string {
  return (process.env.NEXT_PUBLIC_SUPPORT_DEVELOPER_URL ?? "").trim();
}

export function SupportDeveloper({ variant = "default" }: Props) {
  const adsTranslations = useTranslations("Ads");
  const externalUrl = supportUrl();
  const hasUrl = externalUrl.length > 0;

  const baseClassName = cn(
    "inline-flex items-center justify-center gap-2 rounded-lg border border-border/50 bg-muted/15 text-muted-foreground transition-colors",
    "hover:border-border hover:bg-muted/30 hover:text-foreground",
    variant === "compact"
      ? "min-h-[40px] w-full px-2 py-1.5 text-[11px] font-medium"
      : variant === "header"
        ? "min-h-[44px] shrink-0 px-3 py-2 text-sm font-medium"
        : "min-h-[44px] w-full px-4 py-2.5 text-sm font-medium md:min-h-10",
  );

  const label =
    variant === "compact" || variant === "header"
      ? adsTranslations("supportCompact")
      : adsTranslations("supportLabel");

  const description = adsTranslations("supportDescription");

  if (variant === "header") {
    if (!hasUrl) {
      return null;
    }
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClassName}
      >
        <Coffee className="h-4 w-4 shrink-0" aria-hidden />
        <span className="whitespace-nowrap">{label}</span>
      </a>
    );
  }

  if (variant === "compact") {
    if (hasUrl) {
      return (
        <a
          href={externalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={baseClassName}
        >
          <Coffee className="h-3.5 w-3.5 shrink-0" aria-hidden />
          <span className="truncate">{label}</span>
        </a>
      );
    }
    /*
     * Hide compact fallback chip on responsive/mobile for now.
     * レスポンシブ（モバイル）での compact フォールバック表示は一時的に非表示にする。
     */
    return null;
    /*
    return (
      <span
        className={cn(baseClassName, "cursor-default opacity-90")}
        role="note"
        title={adsTranslations("supportUrlHint")}
      >
        <Coffee className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </span>
    );
    */
  }

  if (hasUrl) {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClassName}
      >
        <Coffee className="h-4 w-4 shrink-0" aria-hidden />
        <span className="min-w-0 flex-1 text-left">
          <span className="block">{label}</span>
          <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
            {description}
          </span>
        </span>
      </a>
    );
  }

  return (
    <span
      className={cn(baseClassName, "cursor-default opacity-90")}
      role="note"
      title={adsTranslations("supportUrlHint")}
    >
      <Coffee className="h-4 w-4 shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 text-left">
        <span className="block">{label}</span>
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
          {description}
        </span>
      </span>
    </span>
  );
}
