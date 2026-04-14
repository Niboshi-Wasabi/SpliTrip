"use client";

/**
 * Writes `preferred_language` and hard-navigates so proxy picks up the new cookie policy.
 * `preferred_language` を保存し、プロキシが新しい方針で Cookie を載せ替えられるようフル遷移する。
 */

import { useState, useTransition } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { updatePreferredLanguageAction } from "@/app/actions/update-preferred-language";
import { Button } from "@/components/ui/button";
import { LOCALE_DISPLAY_OPTIONS } from "@/lib/i18n/locale-display-options";
import { withLocalePrefix } from "@/lib/i18n/localized-paths";
import { markLocaleChosenByUser } from "@/lib/i18n/device-locale-bootstrap-storage";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  initialLanguage: AppLocale;
};

export function LanguagePreferenceForm({ initialLanguage }: Props) {
  const activeLocale = useLocale();
  const translations = useTranslations("Settings");
  const [language, setLanguage] = useState<AppLocale>(initialLanguage);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    setMessage(null);
    startTransition(() => {
      void (async () => {
        const result = await updatePreferredLanguageAction(language);
        if (!result.ok) {
          setMessage(translations("saveError"));
          return;
        }
        markLocaleChosenByUser();
        const target = withLocalePrefix(language, "/settings");
        const currentLocale = activeLocale as AppLocale;
        if (target !== withLocalePrefix(currentLocale, "/settings")) {
          window.location.assign(target);
          return;
        }
        setMessage(translations("saved"));
      })();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {LOCALE_DISPLAY_OPTIONS.map((localeOption) => (
            <label
              key={localeOption.locale}
              className="flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="preferred_language"
                value={localeOption.locale}
                checked={language === localeOption.locale}
                onChange={() => setLanguage(localeOption.locale)}
                disabled={isPending}
              />
              <span>{localeOption.label}</span>
            </label>
          ))}
        </div>
      </div>
      {message ? (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 size-3.5 animate-spin" aria-hidden />
        ) : null}
        {translations("updateLanguage")}
      </Button>
    </form>
  );
}
