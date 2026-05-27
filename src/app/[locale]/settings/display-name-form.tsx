"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/validation/display-name";

type Props = {
  initialDisplayName: string;
};

export function DisplayNameForm({ initialDisplayName }: Props) {
  const translations = useTranslations("DisplayName");
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    const trimmed = displayName.trim();
    if (trimmed.length === 0) {
      setError(translations("required"));
      return;
    }
    if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
      setError(translations("tooLong"));
      return;
    }

    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/profile/display-name", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: trimmed }),
      });

      const responseBody = (await response.json().catch(() => ({}))) as {
        error?: string;
        display_name?: string;
      };

      if (!response.ok) {
        if (responseBody.error === "display_name_too_long") {
          setError(translations("tooLong"));
        } else if (responseBody.error === "display_name_required") {
          setError(translations("required"));
        } else {
          setError(translations("saveError"));
        }
        return;
      }

      if (typeof responseBody.display_name === "string") {
        setDisplayName(responseBody.display_name);
      }
      setMessage(translations("saved"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(formEvent) => void onSubmit(formEvent)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="display_name">{translations("label")}</Label>
        <Input
          id="display_name"
          name="display_name"
          type="text"
          autoComplete="name"
          placeholder={translations("placeholder")}
          value={displayName}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          disabled={saving}
          onChange={(changeEvent) => setDisplayName(changeEvent.target.value)}
        />
        <p className="text-xs text-[var(--apple-text-secondary)]">
          {translations("hint")}
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-500" role="alert">{error}</p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700 dark:text-emerald-400" role="status">
          {message}
        </p>
      ) : null}

      <Button type="submit" disabled={saving} className="min-h-[44px] gap-2 md:min-h-0">
        {saving ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" />
            {translations("saving")}
          </>
        ) : (
          translations("save")
        )}
      </Button>
    </form>
  );
}
