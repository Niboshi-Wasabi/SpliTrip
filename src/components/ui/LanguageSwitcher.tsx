"use client";

import { useTransition } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { LOCALE_DISPLAY_OPTIONS } from "@/lib/i18n/locale-display-options";

export function LanguageSwitcher() {
  const translations = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      return;
    }
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
      router.refresh();
    });
  }

  return (
    <label className="relative inline-flex min-h-[44px] items-center">
      <span className="sr-only">{translations("ariaLabel")}</span>
      <span className="pointer-events-none absolute inset-y-0 start-2 z-10 flex items-center text-muted-foreground">
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Languages className="h-4 w-4" />
        )}
      </span>
      <select
        value={locale}
        disabled={isPending}
        onChange={(event) => switchLocale(event.target.value as AppLocale)}
        className="w-[160px] rounded-full border border-border bg-card py-2 pe-8 ps-8 text-xs font-medium text-foreground shadow-sm outline-none ring-offset-background transition focus:ring-2 focus:ring-primary disabled:opacity-70 sm:w-[190px] sm:text-sm"
        aria-label={translations("ariaLabel")}
      >
        {LOCALE_DISPLAY_OPTIONS.map((localeOption) => (
          <option key={localeOption.locale} value={localeOption.locale}>
            {localeOption.label}
          </option>
        ))}
      </select>
    </label>
  );
}
