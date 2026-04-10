"use client";

import { useState, useTransition } from "react";
import { Globe, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { LOCALE_DISPLAY_OPTIONS } from "@/lib/i18n/locale-display-options";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type LanguagePickerPanelProps = {
  onLocaleSelected: () => void;
};

function LanguagePickerPanel({ onLocaleSelected }: LanguagePickerPanelProps) {
  const translations = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function switchLocale(nextLocale: AppLocale) {
    if (nextLocale === locale) {
      onLocaleSelected();
      return;
    }
    startTransition(() => {
      router.replace(pathname, { locale: nextLocale });
      router.refresh();
      onLocaleSelected();
    });
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{translations("modalTitle")}</DialogTitle>
        <DialogDescription>{translations("modalDescription")}</DialogDescription>
      </DialogHeader>
      <div className="relative">
        {isPending ? (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/70"
            aria-live="polite"
          >
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : null}
        <div
          className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-2"
          role="listbox"
          aria-label={translations("ariaLabel")}
        >
        {LOCALE_DISPLAY_OPTIONS.map((localeOption) => {
          const isSelected = localeOption.locale === locale;
          return (
            <Button
              key={localeOption.locale}
              type="button"
              variant={isSelected ? "default" : "outline"}
              disabled={isPending}
              className={cn(
                "min-h-[44px] justify-start text-start font-normal",
                isSelected && "ring-2 ring-primary ring-offset-2",
              )}
              onClick={() => switchLocale(localeOption.locale)}
            >
              <span className="truncate">{localeOption.label}</span>
            </Button>
          );
        })}
        </div>
      </div>
    </>
  );
}

/**
 * LP（`/`）以外の画面で表示する言語選択 FAB + モーダル。
 * FAB + modal for locale selection on non-landing routes (LP keeps header switcher).
 */
export function GlobalLanguagePickerFab() {
  const pathname = usePathname();
  const translations = useTranslations("LanguageSwitcher");
  const [open, setOpen] = useState(false);

  if (pathname === "/") {
    return null;
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="icon"
        onClick={() => setOpen(true)}
        className={cn(
          "fixed z-[45] h-12 w-12 min-h-[48px] min-w-[48px] rounded-full border border-border",
          "bg-card/95 shadow-lg backdrop-blur-sm",
          "end-4 bottom-32 md:end-8 md:bottom-8",
        )}
        aria-label={translations("openModal")}
      >
        <Globe className="h-5 w-5" aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] gap-4 sm:max-w-md">
          <LanguagePickerPanel onLocaleSelected={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
