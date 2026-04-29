"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoMark } from "@/components/logo-mark";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/validation/display-name";

type Props = {
  suggestedName: string;
  nextPath: string;
};

export function OnboardingForm({ suggestedName, nextPath }: Props) {
  const translations = useTranslations("Onboarding");
  const router = useRouter();
  const [displayName, setDisplayName] = useState(suggestedName);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    const trimmed = displayName.trim();

    if (trimmed.length === 0) {
      setErrorMessage(translations("required"));
      return;
    }
    if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
      setErrorMessage(translations("tooLong"));
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/profile/display-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmed }),
      });

      const responseBody = (await response.json().catch(() => ({}))) as {
        error?: string;
      };

      if (!response.ok) {
        if (responseBody.error === "display_name_too_long") {
          setErrorMessage(translations("tooLong"));
        } else if (responseBody.error === "display_name_required") {
          setErrorMessage(translations("required"));
        } else {
          setErrorMessage(translations("saveError"));
        }
        return;
      }

      router.push(nextPath);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl shadow-md ring-1 ring-border">
            <LogoMark className="text-lg md:text-lg" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {translations("title")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {translations("description")}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="display-name">{translations("label")}</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(changeEvent) =>
                setDisplayName(changeEvent.target.value)
              }
              placeholder={translations("placeholder")}
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              autoFocus
              disabled={submitting}
              className="text-base"
            />
            <p className="text-xs text-muted-foreground">
              {translations("hint")}
            </p>
          </div>

          {errorMessage ? (
            <p className="text-sm text-destructive" role="alert">
              {errorMessage}
            </p>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || displayName.trim().length === 0}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {translations("submit")}
          </Button>
        </form>
      </div>
    </div>
  );
}
