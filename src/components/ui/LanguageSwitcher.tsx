"use client";

import { useTransition } from "react";
import { Languages, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const translations = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: "ja" | "en") {
    if (nextLocale === locale) {
      return;
    }
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
      router.refresh();
    });
  }

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-1 py-1 shadow-sm"
      role="group"
      aria-label={translations("ariaLabel")}
    >
      <span className="px-2 text-muted-foreground" aria-hidden>
        {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Languages className="h-3.5 w-3.5" />}
      </span>
      {(["ja", "en"] as const).map((localeCode) => (
        <button
          key={localeCode}
          type="button"
          onClick={() => switchLocale(localeCode)}
          disabled={isPending}
          className={cn(
            "min-h-[32px] rounded-full px-3 text-xs font-medium transition-colors",
            locale === localeCode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {localeCode === "ja" ? translations("ja") : translations("en")}
        </button>
      ))}
    </div>
  );
}
