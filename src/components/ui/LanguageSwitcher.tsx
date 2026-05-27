"use client";

import { useTransition } from "react";
import { Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { markLocaleChosenByUser } from "@/lib/i18n/device-locale-bootstrap-storage";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const translations = useTranslations("LanguageSwitcher");
  const locale = useLocale() as AppLocale;
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }
    markLocaleChosenByUser();
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
      router.refresh();
    });
  }

  const isJa = locale === "ja";

  return (
    <div className="inline-flex min-h-[44px] items-center rounded-full border border-border bg-card p-1">
      <span className="sr-only">{translations("ariaLabel")}</span>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchLocale("ja")}
        className={cn(
          "h-8 rounded-full px-3 text-xs font-medium transition sm:text-sm",
          isJa ? "bg-[var(--apple-text)] text-[var(--apple-bg)]" : "text-[var(--apple-text-secondary)] hover:text-[var(--apple-text)]",
        )}
        aria-pressed={isJa}
      >
        JA
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => switchLocale("en")}
        className={cn(
          "h-8 rounded-full px-3 text-xs font-medium transition sm:text-sm",
          !isJa ? "bg-[var(--apple-text)] text-[var(--apple-bg)]" : "text-[var(--apple-text-secondary)] hover:text-[var(--apple-text)]",
        )}
        aria-pressed={!isJa}
      >
        EN
      </button>
      {isPending ? <Loader2 className="ml-1 h-4 w-4 animate-spin text-[var(--apple-text-secondary)]" /> : null}
    </div>
  );
}
