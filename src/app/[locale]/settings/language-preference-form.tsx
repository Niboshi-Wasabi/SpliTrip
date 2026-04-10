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
import { Label } from "@/components/ui/label";
import { withLocalePrefix } from "@/lib/i18n/localized-paths";
import { markLocaleChosenByUser } from "@/lib/i18n/device-locale-bootstrap-storage";

type Props = {
  initialLanguage: "ja" | "en";
};

export function LanguagePreferenceForm({ initialLanguage }: Props) {
  const activeLocale = useLocale();
  const translations = useTranslations("Settings");
  const [language, setLanguage] = useState<"ja" | "en">(initialLanguage);
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
        const currentLocale = activeLocale === "en" ? "en" : "ja";
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
        <Label>{translations("languageTitle")}</Label>
        <p className="text-sm text-muted-foreground">{translations("languageDescription")}</p>
        <div className="flex flex-wrap gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="preferred_language"
              value="ja"
              checked={language === "ja"}
              onChange={() => setLanguage("ja")}
              disabled={isPending}
            />
            {translations("languageJa")}
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="radio"
              name="preferred_language"
              value="en"
              checked={language === "en"}
              onChange={() => setLanguage("en")}
              disabled={isPending}
            />
            {translations("languageEn")}
          </label>
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
